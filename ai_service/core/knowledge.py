# AI Service - Base de Conhecimento (RAG)
# Gerencia a indexação de RCAs históricas e integração com ChromaDB.

import hashlib
import sqlite3
from agno.knowledge import Knowledge
from agno.knowledge.reader.text_reader import TextReader
from agno.vectordb.chroma import ChromaDb
from agno.knowledge.embedder.google import GeminiEmbedder
from .config import VECTOR_DB_PATH, KNOWLEDGE_DB_PATH, GOOGLE_API_KEY, BACKEND_URL, KNOWLEDGE_PATH

# Configuração do Embedder (Google Gemini 2.0 Flash)
embedder = GeminiEmbedder(api_key=GOOGLE_API_KEY)

# Base de Conhecimento para Histórico de RCAs (Dinamica - RAG)
rca_history_knowledge = Knowledge(
    vector_db=ChromaDb(
        collection="rca_history_v1", # Versão explícita para evitar conflitos
        path=VECTOR_DB_PATH,
        persistent_client=True,
        embedder=embedder
    ),
    name="RCA History",
    readers=[] # Alimentado via index_historical_rcas em tools/main
)

# Base de Conhecimento para Documentação/Metodologia (Estática)
methodology_knowledge = Knowledge(
    vector_db=ChromaDb(
        collection="methodology_docs",
        path=VECTOR_DB_PATH,
        persistent_client=True,
        embedder=embedder
    ),
    name="Methodology Docs",
    readers=[]
)

def get_rca_history_knowledge():
    """Retorna a base de conhecimento do histórico de RCAs."""
    return rca_history_knowledge

def get_methodology_knowledge():
    """Retorna a base de conhecimento da metodologia."""
    return methodology_knowledge

def init_hash_db():
    """Inicializa um banco SQLite simples para controlar os hashes das RCAs indexadas."""
    conn = sqlite3.connect(KNOWLEDGE_DB_PATH)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS indexed_rcas (
            rca_id TEXT PRIMARY KEY,
            content_hash TEXT
        )
    ''')
    conn.commit()
    return conn

def index_historical_rcas(api_url=None):
    """
    Busca RCAs concluídas no backend principal e as indexa no VectorDB.
    Usa um banco local de hashes para evitar re-indexar o que não mudou (Saves Credits).
    """
    if api_url is None:
        base_url = BACKEND_URL.rstrip('/')
        api_url = f"{base_url}/api/rcas"
    
    import httpx
    from agno.knowledge.document import Document
    
    print(f"Indexing RCAs from {api_url}...")
    try:
        # Inicializa controle de hashes
        conn = init_hash_db()
        cursor = conn.cursor()

        # Busca todas as RCAs
        response = httpx.get(f"{api_url}", timeout=10.0)
        
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
            # Pula RCAs sem descrição ou causa raiz (rascunhos vazios)
            if not rca.get('what') and not rca.get('description'):
                continue

            # Garante que o ID seja string para busca consistente no SQLite
            rca_id = str(rca.get('id'))
            
            import json
            # Formata o conteúdo para busca semântica leve (Foco em Título, Descrição, Quem e Onde)
            content_parts = [
                f"ID DA RCA: {rca_id}",
                f"TÍTULO/O QUE (What): {rca.get('what', 'N/A')}",
                f"QUEM (Who): {rca.get('who', 'N/A')}",
                f"ONDE (Where): {rca.get('where_description', 'N/A')}",
                f"DESCRIÇÃO TÉCNICA: {rca.get('problem_description', rca.get('description', 'N/A'))}",
                f"TIPO DE COMPONENTE: {rca.get('component_type', 'N/A')}",
                f"TIPO DE ANÁLISE: {rca.get('analysis_type', 'N/A')}"
            ]
            
            content = "\n".join(content_parts).strip()

            
            # Gera hash do conteúdo atual
            current_hash = hashlib.sha256(content.encode('utf-8')).hexdigest()
            
            # Verifica se já está indexado com este mesmo hash
            cursor.execute("SELECT content_hash FROM indexed_rcas WHERE rca_id = ?", (rca_id,))
            row = cursor.fetchone()
            
            if row and row[0] == current_hash:
                skipped_count += 1
                continue
            
            # Se mudou ou é novo, indexa no Vector DB
            try:
                rca_history_knowledge.add_content(
                    name=f"rca_{rca_id}",
                    text_content=content,
                    metadata={
                        "rca_id": rca_id,
                        "asset": str(rca.get('asset_name_display', rca.get('asset', ''))),
                        "status": rca.get('status'),
                        "area_id": str(rca.get('area_id', '')),
                        "equipment_id": str(rca.get('equipment_id', '')),
                        "subgroup_id": str(rca.get('subgroup_id', ''))
                    },
                    upsert=True
                )
                
                # Atualiza o banco de hashes
                cursor.execute("INSERT OR REPLACE INTO indexed_rcas (rca_id, content_hash) VALUES (?, ?)", (rca_id, current_hash))
                conn.commit()
                indexed_count += 1
                
            except Exception as doc_e:
                print(f"[WARNING] Error indexing RCA {rca_id}: {doc_e}")
                continue
                
        print(f"[OK] Sync Finished! New: {indexed_count} | Skipped (unchanged): {skipped_count} | Total: {total}")
        conn.close()
        
    except Exception as e:
        print(f"[CRITICAL] Critical error during RCA indexing: {str(e)}")
