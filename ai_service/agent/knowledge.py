# AI Service - Base de Conhecimento (RAG)
# Gerencia a indexação de RCAs históricas e integração com ChromaDB.

import hashlib
import sqlite3
from agno.knowledge import Knowledge
from agno.knowledge.reader.text_reader import TextReader
from agno.vectordb.chroma import ChromaDb
from agno.knowledge.embedder.google import GeminiEmbedder
from config import VECTOR_DB_PATH, KNOWLEDGE_DB_PATH, GOOGLE_API_KEY

# Configuração do Embedder (Google Gemini 2.0 Flash)
embedder = GeminiEmbedder(api_key=GOOGLE_API_KEY)

# Banco de Dados Vetorial (Persistente)
vector_db = ChromaDb(
    collection="rca_knowledge",
    path=VECTOR_DB_PATH,
    persistent_client=True,  # CRITICAL: Necessário para salvar no disco no Agno
    embedder=embedder
)

# Base de Conhecimento (RAG) usando o Reader e a classe base Knowledge
knowledge_base = Knowledge(
    vector_db=vector_db,
    readers={"docs": TextReader(path="data/knowledge")}
)

def get_rca_knowledge_base():
    """Retorna a base de conhecimento configurada."""
    return knowledge_base

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

def index_historical_rcas(api_url="http://localhost:3001/api/rcas"):
    """
    Busca RCAs concluídas no backend principal e as indexa no VectorDB.
    Usa um banco local de hashes para evitar re-indexar o que não mudou (Saves Credits).
    """
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
        print(f"🔄 Processing {total} RCAs...")
        
        indexed_count = 0
        skipped_count = 0
        
        for rca in rcas:
            # Pula RCAs sem descrição ou causa raiz (rascunhos vazios)
            if not rca.get('what') and not rca.get('description'):
                continue

            # Garante que o ID seja string para busca consistente no SQLite
            rca_id = str(rca.get('id'))
            
            # Formata o conteúdo normalizado (removendo espaços extras de indentação do Python)
            content = (
                f"TÍTULO DA FALHA: {rca.get('what', 'N/A')}\n"
                f"DATA: {rca.get('failure_date', 'N/A')}\n"
                f"ATIVO: {rca.get('asset', 'N/A')} (ID: {rca.get('asset_id', 'N/A')})\n"
                f"DESCRIÇÃO: {rca.get('description', rca.get('problem_description', 'N/A'))}\n"
                f"CAUSAS RAIZ: {rca.get('root_causes', 'N/A')}\n"
                f"AÇÕES TOMADAS: {rca.get('actions', 'N/A')}"
            ).strip()
            
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
                knowledge_base.add_content(
                    name=f"rca_{rca_id}",
                    text_content=content,
                    metadata={
                        "source": "rca_history", 
                        "rca_id": rca_id,
                        "asset": str(rca.get('asset', '')),
                        "status": rca.get('status'),
                        "area_id": str(rca.get('area_id', rca.get('area_id', ''))),
                        "equipment_id": str(rca.get('equipment_id', rca.get('equipment_id', ''))),
                        "subgroup_id": str(rca.get('subgroup_id', rca.get('subgroup_id', '')))
                    },
                    upsert=True
                )
                
                # Atualiza o banco de hashes
                cursor.execute("INSERT OR REPLACE INTO indexed_rcas (rca_id, content_hash) VALUES (?, ?)", (rca_id, current_hash))
                conn.commit()
                indexed_count += 1
                
            except Exception as doc_e:
                print(f"⚠️ Error indexing RCA {rca_id}: {doc_e}")
                continue
                
        print(f"✅ Sync Finished! New: {indexed_count} | Skipped (unchanged): {skipped_count} | Total: {total}")
        conn.close()
        
    except Exception as e:
        print(f"❌ Critical error during RCA indexing: {str(e)}")
