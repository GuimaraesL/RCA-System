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
    # Configura o leitor com chunk gigante (50k) para evitar fatiamento das RCAs
    readers=[
        TextReader(chunking_strategy=FixedSizeChunking(chunk_size=50000))
    ],
    name="RCA History"
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

def index_historical_rcas(force_reindex: bool = False):
    """
    Busca todas as RCAs finalizadas do backend e indexa no ChromaDB de forma otimizada.
    """
    
    logger.info("Iniciando indexação de RCAs histórico...")
    base_url = BACKEND_URL.rstrip('/')
    api_url = f"{base_url}/api/rcas"
    
    import httpx
    
    print(f"Indexing RCAs from {api_url}...")
    try:
        conn = init_hash_db()
        cursor = conn.cursor()

        response = httpx.get(f"{api_url}", timeout=15.0)
        if response.status_code != 200:
            print(f"Failed to fetch RCAs: {response.status_code}")
            return

        rcas = response.json()
        if isinstance(rcas, dict) and 'data' in rcas:
            rcas = rcas['data']
            
        if not rcas:
            print("No RCAs found to index.")
            return

        total = len(rcas)
        print(f"[SYNC] Processing {total} RCAs...")
        
        indexed_count = 0
        skipped_count = 0
        
        for rca in rcas:
            # Inicialização segura de variáveis para evitar NameError
            rca_id = str(rca.get('id', 'unknown'))
            if rca_id == 'unknown': continue
            
            # Pula rascunhos vazios
            if not rca.get('what') and not rca.get('description'):
                continue

            area_id = rca.get('area_id', "")
            equip_id = rca.get('equipment_id', "")
            subg_id = rca.get('subgroup_id', "")
            
            asset_dict = rca.get('asset', {})
            area_name = asset_dict.get('area_name') if isinstance(asset_dict, dict) else None
            equip_name = asset_dict.get('equipment_name') if isinstance(asset_dict, dict) else None
            subg_name = asset_dict.get('subgroup_name') if isinstance(asset_dict, dict) else None
            comp_type = rca.get('component_type')
            
            area_label = area_name or area_id
            equip_label = equip_name or equip_id
            subg_label = subg_name or subg_id

            # Montagem da Narrativa
            location_parts = []
            if area_label: location_parts.append(f"na área {area_label}")
            if equip_label: location_parts.append(f"afetando o equipamento {equip_label}")
            if subg_label: location_parts.append(f"com impacto focado no subgrupo {subg_label}")
            if comp_type: location_parts.append(f"no componente {comp_type}")

            content_parts = []
            if location_parts:
                content_parts.append(f"LOCALIZAÇÃO DO ATIVO: O incidente ocorreu {', '.join(location_parts)}.")
            # Conteúdo da RCA (Storytelling)
            content_parts = [
                f"ID_RCA: {rca_id}",
                f"TÍTULO/O QUE (What): {rca.get('what', 'Sem Título')}",
                f"QUEM (Who): {rca.get('who', 'Não Informado')}",
                f"PROBLEMA (Why): {rca.get('problem_description', 'Sem Descrição')}",
                f"TIPO COMPONENTE: {rca.get('component_type', 'Geral')}"
            ]
            
            fail_date = rca.get('failure_date', "")
            if fail_date: content_parts.append(f"DATA DA FALHA: {fail_date}")

            causes = [c.get('cause', '') for c in rca.get('root_causes', [])]
            if causes: content_parts.append(f"CAUSAS RAIZ: " + " | ".join(causes))
                
            actions = [a.get('action_title', '') for a in rca.get('action_plans', [])]
            if actions: content_parts.append(f"AÇÕES DO PLANO: " + " | ".join(actions))
            
            content = "\n\n".join(content_parts).strip()
            current_hash = hashlib.sha256(content.encode('utf-8')).hexdigest()
            
            cursor.execute("SELECT content_hash FROM indexed_rcas WHERE rca_id = ?", (rca_id,))
            row = cursor.fetchone()
            if row and row[0] == current_hash and not force_reindex:
                skipped_count += 1
                continue
            
            try:
                # Agora o add_content usará o reader configurado globalmente (50k chunk)
                rca_history_knowledge.add_content(
                    name=f"rca_{rca_id}",
                    text_content=content,
                    metadata={
                        "rca_id": rca_id,
                        "status": rca.get('status'),
                        "area_id": str(area_id or ""),
                        "equipment_id": str(equip_id or ""),
                        "subgroup_id": str(subg_id or ""),
                        "failure_date": str(fail_date or "")
                    },
                    upsert=True
                )
                
                cursor.execute("INSERT OR REPLACE INTO indexed_rcas (rca_id, content_hash) VALUES (?, ?)", (rca_id, current_hash))
                conn.commit()
                indexed_count += 1
                
            except Exception as doc_e:
                print(f"[WARNING] Error indexing RCA {rca_id}: {doc_e}")
                continue
                
        print(f"[OK] Sync Finished! New: {indexed_count} | Skipped: {skipped_count} | Total: {total}")
        conn.close()
        
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
