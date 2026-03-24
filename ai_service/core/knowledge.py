"""
Proposta: Gerencia a base de conhecimento (RAG), indexação de RCAs e persistência no SQLite.
Fluxo: Recebe dados para indexação -> Gera embeddings -> Armazena no ChromaDB / SQLite.
"""

import os
import sqlite3
import json
import hashlib
import time
import httpx
import threading
from typing import List, Optional, Dict
from agno.knowledge import Knowledge
from agno.vectordb.chroma import ChromaDb
from agno.knowledge.embedder.google import GeminiEmbedder
from agno.utils.log import logger
from core.config import VECTOR_DB_PATH, KNOWLEDGE_DB_PATH, KNOWLEDGE_PATH, SOURCE_DB_PATH, GOOGLE_API_KEY, BACKEND_URL

# Configuração do Embedder (Google Gemini 2.0 Flash)
embedder = GeminiEmbedder(api_key=GOOGLE_API_KEY)

from agno.knowledge.reader.text_reader import TextReader
from agno.knowledge.reader.pdf_reader import PDFReader
from agno.knowledge.chunking.fixed import FixedSizeChunking

# Base de Conhecimento para Histórico de RCAs (Dinamica - RAG)
rca_history_knowledge = Knowledge(
    vector_db=ChromaDb(
        collection="rca_history_v1",
        path=VECTOR_DB_PATH,
        persistent_client=True,
        embedder=embedder
    ),
    readers=[
        TextReader(chunking_strategy=FixedSizeChunking(chunk_size=50000))
    ],
    name="RCA History Full"
)

rca_symptoms_knowledge = Knowledge(
    vector_db=ChromaDb(
        collection="rca_symptoms_v2",
        path=VECTOR_DB_PATH,
        persistent_client=True,
        embedder=embedder
    ),
    readers=[
        TextReader(chunking_strategy=FixedSizeChunking(chunk_size=10000))
    ],
    name="RCA Symptoms"
)

rca_causes_knowledge = Knowledge(
    vector_db=ChromaDb(
        collection="rca_causes_v2",
        path=VECTOR_DB_PATH,
        persistent_client=True,
        embedder=embedder
    ),
    readers=[
        TextReader(chunking_strategy=FixedSizeChunking(chunk_size=10000))
    ],
    name="RCA Causes"
)


# Base de Conhecimento Técnica Unificada (FMEA, Manuais, PDFs)
technical_knowledge = Knowledge(
    vector_db=ChromaDb(
        collection="technical_knowledge_v1",
        path=VECTOR_DB_PATH,
        persistent_client=True,
        embedder=embedder
    ),
    readers=[
        TextReader(chunking_strategy=FixedSizeChunking(chunk_size=3000)),
        PDFReader(chunking_strategy=FixedSizeChunking(chunk_size=5000))
    ],
    name="Technical Engineering Library"
)

def get_rca_history_knowledge():
    """Retorna a base de conhecimento do histórico de RCAs."""
    return rca_history_knowledge

def get_rca_symptoms_knowledge():
    return rca_symptoms_knowledge

def get_rca_causes_knowledge():
    return rca_causes_knowledge

def get_technical_knowledge():
    """Retorna a base de conhecimento técnica unificada (FMEA + Manuais)."""
    return technical_knowledge

# Alias para compatibilidade legada
def get_fmea_knowledge():
    return technical_knowledge

def get_technical_docs_knowledge():
    return technical_knowledge

def init_hash_db():
    """Inicializa um banco SQLite simples para controlar os hashes das RCAs e FMEAs indexados."""
    conn = sqlite3.connect(KNOWLEDGE_DB_PATH)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS indexed_rcas (
            rca_id TEXT PRIMARY KEY,
            content_hash TEXT
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS indexed_rcas_v2 (
            rca_id TEXT PRIMARY KEY,
            content_hash TEXT
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS indexed_fmea (
            filename TEXT PRIMARY KEY,
            content_hash TEXT
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS recurrence_analysis (
            rca_id TEXT PRIMARY KEY,
            analysis_data TEXT,
            last_analyzed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    return conn

_locks_creation_lock = threading.Lock()
_save_locks: Dict[str, threading.Lock] = {}

def save_recurrence_analysis(rca_id: str, analysis_data: dict):
    """Salva o resultado da análise de recorrência no SQLite com lock para evitar race condition."""
    import json
    from datetime import datetime
    
    with _locks_creation_lock:
        if rca_id not in _save_locks:
            _save_locks[rca_id] = threading.Lock()
        
    with _save_locks[rca_id]:
        conn = init_hash_db()
        cursor = conn.cursor()
        cursor.execute('''
            INSERT OR REPLACE INTO recurrence_analysis (rca_id, analysis_data, last_analyzed_at)
            VALUES (?, ?, ?)
        ''', (rca_id, json.dumps(analysis_data), datetime.now().isoformat()))
        conn.commit()
        conn.close()

def get_recurrence_analysis(rca_id: str):
    """Recupera a última análise de recorrência salva para uma RCA."""
    import json
    conn = init_hash_db()
    cursor = conn.cursor()
    cursor.execute('SELECT analysis_data, last_analyzed_at FROM recurrence_analysis WHERE rca_id = ?', (rca_id,))
    row = cursor.fetchone()
    conn.close()
    
    if row:
        return {
            "analysis": json.loads(row[0]),
            "last_analyzed_at": row[1]
        }
    return None

# --- AUXILIARES DE TAXONOMIA ---
def _get_taxonomy_names(rca_id: str, cursor: sqlite3.Cursor) -> Dict[str, str]:
    """Busca nomes amigáveis para IDs de especialidade, categoria, modo de falha e componente."""
    names = {"specialty": "", "category": "", "mode": "", "component": ""}
    try:
        query = """
            SELECT 
                ts.name as specialty,
                tc.name as category,
                tm.name as mode,
                tct.name as component
            FROM rcas r
            LEFT JOIN taxonomy_specialties ts ON r.specialty_id = ts.id
            LEFT JOIN taxonomy_failure_categories tc ON r.failure_category_id = tc.id
            LEFT JOIN taxonomy_failure_modes tm ON r.failure_mode_id = tm.id
            LEFT JOIN taxonomy_component_types tct ON r.component_type = tct.id
            WHERE r.id = ?
        """
        cursor.execute(query, (rca_id,))
        row = cursor.fetchone()
        if row:
            names["specialty"] = row[0] or ""
            names["category"] = row[1] or ""
            names["mode"] = row[2] or ""
            names["component"] = row[3] or ""
    except Exception as e:
        logger.warning(f"Erro ao buscar taxonomia para {rca_id}: {e}")
    return names

def build_embedding_contents(rca_id: str, rca: dict, investigation_text: str, taxonomy: dict, hierarchy: str) -> dict:
    """Constrói os 3 textos exatos que serão usados para os embeddings (Full, Symptoms, Causes)."""
    
    # Camada 1: Histórico Completo
    full_parts = [
        f"ID_RCA: {rca_id}",
        f"HIERARQUIA: {hierarchy}",
        f"TÍTULO: {rca.get('what', 'Sem Título')}",
        f"ESPECIALIDADE: {taxonomy.get('specialty', '')}",
        f"CATEGORIA: {taxonomy.get('category', '')}",
        f"MODO DE FALHA: {taxonomy.get('mode', '')}",
        f"DESCRIÇÃO DETALHADA: {rca.get('problem_description', 'Sem Descrição')}",
        f"INVESTIGAÇÃO: {investigation_text}"
    ]
    full_content = "\n\n".join(full_parts).strip()

    # Camada 2: Sintomas
    ish_text = ""
    if "ISHIKAWA:" in investigation_text:
        ish_text = investigation_text.split("ISHIKAWA:")[1].split("\n")[0].strip()

    symptom_content = "\n".join(filter(None, [
        f"TÍTULO: {rca.get('what', '')}",
        f"ESPECIALIDADE: {taxonomy.get('specialty', '')}",
        f"CATEGORIA: {taxonomy.get('category', '')}",
        f"SINTOMAS (ISHIKAWA): {ish_text}",
        f"COMPONENTE: {taxonomy.get('component', '')}"
    ]))

    # Camada 3: Causas
    cause_parts = []
    if "CAUSAS RAIZ:" in investigation_text:
        cause_parts.append(investigation_text.split("CAUSAS RAIZ:")[1].split("\n")[0].strip())
    if "5 PORQUÊS:" in investigation_text:
        cause_parts.append(investigation_text.split("5 PORQUÊS:")[1].split("\n")[0].strip())

    actions_text = ""
    if "AÇÕES DE CONTENÇÃO:" in investigation_text:
        actions_text = investigation_text.split("AÇÕES DE CONTENÇÃO:")[1].split("\n")[0].strip()

    cause_content = "\n".join(filter(None, [
        f"TÍTULO: {rca.get('what', '')}",
        f"ESPECIALIDADE: {taxonomy.get('specialty', '')}",
        f"MODO DE FALHA: {taxonomy.get('mode', '')}",
        f"ANÁLISE TÉCNICA: {' | '.join(cause_parts)}",
        f"AÇÕES: {actions_text}"
    ]))

    return {
        "full": full_content,
        "symptoms": symptom_content,
        "causes": cause_content
    }

def _get_asset_hierarchy(rca_id: str, source_cursor: sqlite3.Cursor) -> str:
    """Busca os nomes amigáveis da hierarquia de ativos vinculada à RCA."""
    try:
        source_cursor.execute("SELECT area_id, equipment_id, subgroup_id FROM rcas WHERE id = ?", (rca_id,))
        ids = source_cursor.fetchone()
        if not ids: return ""
        
        names = []
        for aid in ids:
            if aid:
                source_cursor.execute("SELECT name FROM assets WHERE id = ?", (aid,))
                res = source_cursor.fetchone()
                if res and res[0]: names.append(res[0])
        return " > ".join(names)
    except: return ""

def _get_flattened_investigations(rca_id: str, source_cursor: sqlite3.Cursor) -> str:
    """Busca e achata todas as investigações técnicas (5 Porquês, Ishikawa, etc) das tabelas normalizadas v7.0."""
    parts = []
    try:
        # 1. 5 Porquês (Processando JSON da coluna content)
        try:
            source_cursor.execute("SELECT content FROM rca_five_whys WHERE rca_id = ?", (rca_id,))
            rows = source_cursor.fetchall()
            for (content_json,) in rows:
                if content_json:
                    data = json.loads(content_json)
                    whys = [w.get('answer', '') for w in data.get('whys', [])]
                    if whys:
                        parts.append(f"5 PORQUÊS: {' -> '.join(filter(None, whys))}")
        except Exception as e:
            logger.debug(f"Erro ao extrair 5 Porquês para {rca_id}: {e}")

        # 2. Ishikawa (v7.0 - Com Resolução 6M)
        try:
            source_cursor.execute("""
                SELECT COALESCE(tx.name, ri.category), ri.description 
                FROM rca_ishikawa ri
                LEFT JOIN taxonomy_root_causes_6m tx ON ri.category = tx.id
                WHERE ri.rca_id = ?
            """, (rca_id,))
            ish_rows = source_cursor.fetchall()
            if ish_rows:
                ish_dict = {}
                for cat, desc in ish_rows:
                    if cat not in ish_dict: ish_dict[cat] = []
                    if desc: ish_dict[cat].append(desc)
                ish_text = [f"{cat}: {', '.join(items)}" for cat, items in ish_dict.items() if items]
                if ish_text: parts.append(f"ISHIKAWA: {'; '.join(ish_text)}")
        except Exception as e:
            logger.debug(f"Erro ao extrair Ishikawa para {rca_id}: {e}")

        # 3. Causas Raiz
        try:
            source_cursor.execute("SELECT cause FROM rca_root_causes WHERE rca_id = ?", (rca_id,))
            rc_rows = source_cursor.fetchall()
            if rc_rows:
                causes = [row[0] for row in rc_rows if row[0]]
                if causes: parts.append(f"CAUSAS RAIZ: {' | '.join(causes)}")
        except Exception as e:
            logger.debug(f"Erro ao extrair Causas Raiz para {rca_id}: {e}")

        # 4. Contenção e Lições Aprendidas
        try:
            source_cursor.execute("SELECT content FROM rca_containment WHERE rca_id = ?", (rca_id,))
            cont_rows = source_cursor.fetchall()
            for (content_json,) in cont_rows:
                if content_json:
                    data = json.loads(content_json)
                    if isinstance(data, dict):
                        if 'containment_actions' in data:
                            actions = []
                            for a in data['containment_actions']:
                                if isinstance(a, dict):
                                    actions.append(a.get('action') or a.get('description') or a.get('text') or str(a))
                                elif a: actions.append(str(a))
                            if actions: parts.append(f"AÇÕES DE CONTENÇÃO: {' | '.join(actions)}")
                        if 'lessons_learned' in data:
                            lessons = []
                            for l in data['lessons_learned']:
                                if isinstance(l, dict):
                                    lessons.append(l.get('text') or l.get('description') or str(l))
                                elif l: lessons.append(str(l))
                            if lessons: parts.append(f"LIÇÕES APRENDIDAS: {' | '.join(lessons)}")
                    elif isinstance(data, list):
                        parts.append(f"AÇÕES DE CONTENÇÃO: {' | '.join(data)}")
        except Exception as e:
            logger.debug(f"Erro ao extrair Contenção para {rca_id}: {e}")

        return "\n".join(parts)
    except Exception as e:
        logger.error(f"Error flattening investigations for {rca_id}: {e}")
        return ""

def index_historical_rcas(force_reindex: bool = False, limit: Optional[int] = None):
    """
    Busca todas as RCAs finalizadas do backend e indexa no ChromaDB de forma otimizada.
    """
    
    logger.info("Iniciando indexação de RCAs histórico...")
    base_url = BACKEND_URL.rstrip('/')
    api_url = f"{base_url}/api/rcas"
    
    import httpx
    
    # Cursor para o banco de origem (para buscar investigações v5.0+)
    source_conn = sqlite3.connect(SOURCE_DB_PATH)
    source_cursor = source_conn.cursor()
    
    logger.info(f"Indexing RCAs from {api_url}...")
    try:
        conn = init_hash_db()
        cursor = conn.cursor()

        response = httpx.get(f"{api_url}", timeout=15.0)
        if response.status_code != 200:
            logger.error(f"Failed to fetch RCAs: {response.status_code}")
            return

        rcas = response.json()
        if isinstance(rcas, dict) and 'data' in rcas:
            rcas = rcas['data']
            
        if not rcas:
            logger.warning("No RCAs found to index.")
            return

        total = len(rcas)
        logger.info(f"[SYNC] Processing {total} RCAs...")
        from concurrent.futures import ThreadPoolExecutor
        
        indexed_count = 0
        skipped_count = 0
        
        # Otimização: Paralelizar as 3 coleções por RCA para reduzir latência de rede (3x speedup)
        with ThreadPoolExecutor(max_workers=6) as executor:
            for rca in rcas:
                if limit is not None and (indexed_count + skipped_count) >= limit:
                    break
                
                rca_id = str(rca.get('id', 'unknown'))
                if rca_id == 'unknown': continue
                
                # Pula rascunhos vazios
                if not rca.get('what') and not rca.get('description'):
                    continue

                # Busca investigações técnicas no banco de origem (v2.4 Enrichment)
                investigation_text = _get_flattened_investigations(rca_id, source_cursor)
                taxonomy = _get_taxonomy_names(rca_id, source_cursor)

                # Extração de nomes amigáveis de ativos
                asset_dict = rca.get('asset', {})
                area_name = asset_dict.get('area_name') or ""
                equip_name = asset_dict.get('equipment_name') or ""
                subg_name = asset_dict.get('subgroup_name') or ""

                # Extração de nomes amigáveis de ativos (v2.8 - SQL Hierarchy Sync)
                hierarchy = _get_asset_hierarchy(rca_id, source_cursor)

                # Gera os 3 conteúdos exatos via helper centralizado (v2.9 Consistency)
                contents = build_embedding_contents(rca_id, rca, investigation_text, taxonomy, hierarchy)
                full_content = contents["full"]
                symptom_content = contents["symptoms"]
                cause_content = contents["causes"]

                # Hash para controle de mudanças (usando o full_content como referência)
                current_hash = hashlib.sha256(full_content.encode('utf-8')).hexdigest()
                
                cursor.execute("SELECT content_hash FROM indexed_rcas_v2 WHERE rca_id = ?", (rca_id,))
                row = cursor.fetchone()
                if row and row[0] == current_hash and not force_reindex:
                    skipped_count += 1
                    continue
                
                try:
                    # Extração de nomes amigáveis adicionais para metadados
                    asset_dict = rca.get('asset', {})
                    h_parts = [p.strip() for p in hierarchy.split(">")] if ">" in hierarchy else []
                    area_name = asset_dict.get('area_name') or (h_parts[0] if len(h_parts) > 0 else "")
                    equip_name = asset_dict.get('equipment_name') or (h_parts[1] if len(h_parts) > 1 else "")
                    subg_name = asset_dict.get('subgroup_name') or (h_parts[2] if len(h_parts) > 2 else "")

                    common_meta = {
                        "rca_id": rca_id,
                        "specialty_id": str(rca.get('specialty_id') or ""),
                        "area_id": str(rca.get('area_id') or ""),
                        "area_name": str(area_name),
                        "equipment_id": str(rca.get('equipment_id') or ""),
                        "equipment_name": str(equip_name),
                        "subgroup_id": str(rca.get('subgroup_id') or ""),
                        "subgroup_name": str(subg_name),
                        "failure_date": str(rca.get('failure_date') or ""),
                        "component_type": taxonomy.get("component") or str(rca.get('component_type') or ""),
                        "failure_category_id": str(rca.get('failure_category_id') or ""),
                        "failure_category_name": taxonomy["category"],
                        "failure_mode_id": str(rca.get('failure_mode_id') or ""),
                        "failure_mode_name": taxonomy["mode"],
                        "specialty_name": taxonomy["specialty"],
                    }

                    # Indexação paralela das 3 camadas
                    def run_idx(kb, n, c, m):
                        kb.add_content(name=n, text_content=c, metadata=m, upsert=True)

                    f1 = executor.submit(run_idx, rca_history_knowledge, f"rca_{rca_id}_full", full_content, common_meta)
                    f2 = executor.submit(run_idx, rca_symptoms_knowledge, f"rca_{rca_id}_symptoms", symptom_content, common_meta)
                    f3 = executor.submit(run_idx, rca_causes_knowledge, f"rca_{rca_id}_causes", cause_content, common_meta)
                    
                    f1.result(); f2.result(); f3.result() # Aguarda todas as camadas

                    cursor.execute("INSERT OR REPLACE INTO indexed_rcas_v2 (rca_id, content_hash) VALUES (?, ?)", (rca_id, current_hash))
                    conn.commit()
                    indexed_count += 1
                except Exception as doc_e:
                    print(f"[WARNING] Error indexing RCA {rca_id}: {doc_e}")
                    continue
        print(f"[OK] Sync Finished! New: {indexed_count} | Skipped: {skipped_count} | Total: {total}")
        
        # Invalidação de Cache: Garante que os novos dados sejam vistos (Issue #169 feedback)
        try:
            from api.v2.recurrence import _query_cache
            _query_cache.clear()
            logger.info("RAG Cache invalidado para refletir novos dados indexados.")
        except:
            pass
            
        conn.close()
        source_conn.close()
        
    except Exception as e:
        print(f"[CRITICAL] Critical error during RCA indexing: {str(e)}")

def sync_technical_knowledge():
    """
    Varre as pastas de FMEA e Knowledge para indexar manuais (.md, .pdf) na base unificada.
    """
    import os
    import glob
    
    base_dir = os.path.dirname(os.path.dirname(__file__))
    fmea_path = os.path.join(base_dir, "data", "fmea")
    knowledge_path = os.path.join(base_dir, "data", "knowledge")
    
    # Coleta arquivos de ambas as pastas
    all_files = []
    for path in [fmea_path, knowledge_path]:
        if os.path.exists(path):
            all_files.extend(glob.glob(os.path.join(path, "*.md")))
            all_files.extend(glob.glob(os.path.join(path, "*.pdf")))

    if not all_files:
        print("[TECH-SYNC] Nenhum manual (.md ou .pdf) encontrado para indexação.")
        return

    print(f"[TECH-SYNC] Analisando {len(all_files)} documentos técnicos...")
    
    try:
        conn = init_hash_db()
        cursor = conn.cursor()
        
        # Cria tabela de hash unificada se não existir
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS indexed_tech_knowledge (
                filename TEXT PRIMARY KEY,
                content_hash TEXT
            )
        ''')
        conn.commit()

        indexed = 0
        skipped = 0
        
        for file_path in all_files:
            filename = os.path.basename(file_path)
            is_pdf = filename.lower().endswith(".pdf")
            
            try:
                with open(file_path, "rb") as f:
                    file_content_bytes = f.read()
                current_hash = hashlib.sha256(file_content_bytes).hexdigest()
                
                cursor.execute("SELECT content_hash FROM indexed_tech_knowledge WHERE filename = ?", (filename,))
                row = cursor.fetchone()
                if row and row[0] == current_hash:
                    skipped += 1
                    continue

                if is_pdf:
                    # Indexação de PDF usando PDFReader nativo da Agno
                    technical_knowledge.add_content(
                        path=file_path,
                        reader=PDFReader(),
                        metadata={"filename": filename, "type": "technical_manual", "format": "pdf"},
                        upsert=True
                    )
                else:
                    # Indexação de Markdown
                    with open(file_path, "r", encoding="utf-8") as f:
                        content = f.read()
                    
                    technical_knowledge.add_content(
                        name=filename,
                        text_content=content,
                        metadata={"filename": filename, "type": "fmea_manual", "format": "md"},
                        upsert=True
                    )
                
                cursor.execute("INSERT OR REPLACE INTO indexed_tech_knowledge (filename, content_hash) VALUES (?, ?)", (filename, current_hash))
                conn.commit()
                indexed += 1
            except Exception as e:
                print(f"[WARNING] Erro ao indexar {filename}: {e}")

        print(f"[TECH-SYNC] Sucesso: {indexed} novos/atualizados, {skipped} mantidos.")
        conn.close()
    except Exception as e:
        print(f"[CRITICAL] Erro na sincronização técnica: {e}")

# Aliases para compatibilidade legada no startup
def index_fmea_documents():
    sync_technical_knowledge()

def index_technical_documents():
    sync_technical_knowledge()
