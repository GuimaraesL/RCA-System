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

def _get_flattened_investigations(rca_id: str, source_cursor: sqlite3.Cursor) -> str:
    """Busca e achata todas as investigações técnicas (5 Porquês, Ishikawa, etc) da tabela rca_investigations."""
    try:
        source_cursor.execute("SELECT method_type, content FROM rca_investigations WHERE rca_id = ?", (rca_id,))
        rows = source_cursor.fetchall()
        if not rows: return ""
        
        parts = []
        for m_type, content_json in rows:
            try:
                data = json.loads(content_json)
                if m_type == 'FIVE_WHYS' and isinstance(data, list):
                    whys = [item.get('why', item.get('description', '')) for item in data if isinstance(item, dict)]
                    parts.append(f"5 PORQUÊS: {' -> '.join(filter(None, whys))}")
                elif m_type == 'ROOT_CAUSES' and isinstance(data, list):
                    causes = [item.get('cause', '') for item in data if isinstance(item, dict)]
                    parts.append(f"CAUSAS RAIZ: {' | '.join(filter(None, causes))}")
                elif m_type == 'ISHIKAWA' and isinstance(data, dict):
                    ish_text = []
                    for cat, items in data.items():
                        if isinstance(items, list):
                            items_text = ", ".join([i.get('text', '') for i in items if isinstance(i, dict)])
                            if items_text: ish_text.append(f"{cat}: {items_text}")
                    parts.append(f"ISHIKAWA: {'; '.join(ish_text)}")
                elif m_type in ['LESSONS_LEARNED', 'CONTAINMENT_ACTIONS'] and isinstance(data, list):
                    items = [str(item) for item in data if item]
                    parts.append(f"{m_type}: {' | '.join(items)}")
            except: continue
        return "\n".join(parts)
    except: return ""

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

                # Hash e Verificação (Incluindo investigações no hash para detectar mudanças)
                content_parts = [
                    f"ID_RCA: {rca_id}",
                    f"TÍTULO: {rca.get('what', 'Sem Título')}",
                    f"PROBLEMA: {rca.get('problem_description', 'Sem Descrição')}",
                    f"ANÁLISE: {rca.get('analysis_details', '')}",
                    f"INVESTIGAÇÃO: {investigation_text}"
                ]
                content = "\n\n".join(content_parts).strip()
                current_hash = hashlib.sha256(content.encode('utf-8')).hexdigest()
                
                cursor.execute("SELECT content_hash FROM indexed_rcas_v2 WHERE rca_id = ?", (rca_id,))
                row = cursor.fetchone()
                if row and row[0] == current_hash and not force_reindex:
                    skipped_count += 1
                    continue
                
                try:
                    # Preparar conteúdos especializados (Padrão @issue V2.3)
                    symptom_content = "\n".join(filter(None, [
                        f"TÍTULO: {rca.get('what', '')}",
                        f"PROBLEMA/SINTOMAS: {rca.get('problem_description', '')}",
                        f"COMPONENTE: {rca.get('component_type', '')}",
                        f"INVESTIGAÇÃO (SINTOMAS): {investigation_text if 'ISHIKAWA' in investigation_text or '5 PORQUÊS' in investigation_text else ''}"
                    ]))
                    
                    raw_causes = rca.get('root_causes', [])
                    if not isinstance(raw_causes, list): raw_causes = []
                    causes_text = " | ".join([str(c.get('cause', '')) for c in raw_causes if isinstance(c, dict)])
                    analysis_details = rca.get('analysis_details', '') or ""
                    if isinstance(analysis_details, dict):
                        analysis_details = analysis_details.get('summary', '') or ""
                    
                    cause_content = "\n".join(filter(None, [
                        f"TÍTULO: {rca.get('what', '')}",
                        f"CAUSAS RAIZ: {causes_text}",
                        f"INVESTIGAÇÃO TÉCNICA: {investigation_text}",
                        f"ANÁLISE: {analysis_details}",
                    ]))

                    # Full content (History)
                    full_content = content + "\n\n" + investigation_text
                    
                    # Extração de nomes amigáveis
                    asset_dict = rca.get('asset', {})
                    area_name = asset_dict.get('area_name') or ""
                    equip_name = asset_dict.get('equipment_name') or ""
                    subg_name = asset_dict.get('subgroup_name') or ""

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
                        "component_type": str(rca.get('component_type') or ""),
                        "failure_category_id": str(rca.get('failure_category_id') or ""),
                        "failure_mode_id": str(rca.get('failure_mode_id') or ""),
                    }

                    # Indexação paralela das 3 camadas
                    def run_idx(kb, n, c, m):
                        kb.add_content(name=n, text_content=c, metadata=m, upsert=True)

                    f1 = executor.submit(run_idx, rca_history_knowledge, f"rca_{rca_id}_full", full_content, common_meta)
                    f2 = executor.submit(run_idx, rca_symptoms_knowledge, f"rca_{rca_id}_symptoms", symptom_content, common_meta)
                    f3 = executor.submit(run_idx, rca_causes_knowledge, f"rca_{rca_id}_causes", cause_content, common_meta)
                    
                    f1.result(); f2.result(); f3.result() # Wait for all

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
