# AI Service - Base de Conhecimento (RAG)
# Gerencia a indexação de RCAs históricas e integração com ChromaDB.

import hashlib
import sqlite3
from agno.knowledge import Knowledge
from agno.vectordb.chroma import ChromaDb
from agno.knowledge.embedder.google import GeminiEmbedder
from .config import VECTOR_DB_PATH, KNOWLEDGE_DB_PATH, GOOGLE_API_KEY, BACKEND_URL

# Configuração do Embedder (Google Gemini 2.0 Flash)
embedder = GeminiEmbedder(api_key=GOOGLE_API_KEY)

from agno.knowledge.reader.text_reader import TextReader
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

# Base de Conhecimento para FMEA (Documentos Técnicos)
fmea_knowledge = Knowledge(
    vector_db=ChromaDb(
        collection="fmea_library_v2",
        path=VECTOR_DB_PATH,
        persistent_client=True,
        embedder=embedder
    ),
    readers=[
        TextReader(chunking_strategy=FixedSizeChunking(chunk_size=2000))
    ],
    name="FMEA Library"
)

def get_rca_history_knowledge():
    """Retorna a base de conhecimento do histórico de RCAs."""
    return rca_history_knowledge

def get_fmea_knowledge():
    """Retorna a base de conhecimento de manuais FMEA."""
    return fmea_knowledge

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
    conn.commit()
    return conn

def index_historical_rcas(api_url=None):
    """
    Busca RCAs concluídas no backend principal e as indexa no VectorDB.
    """
    if api_url is None:
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
            
            what_desc = rca.get('what')
            if what_desc: content_parts.append(f"RESUMO DO PROBLEMA: {what_desc}")
            
            problem_desc = rca.get('problem_description', rca.get('description'))
            if problem_desc: content_parts.append(f"DESCRIÇÃO TÉCNICA (SINTOMAS): {problem_desc}")
            
            causes = [c.get('cause', '') for c in rca.get('root_causes', [])]
            if causes: content_parts.append(f"CAUSAS RAIZ: " + " | ".join(causes))
                
            actions = [a.get('action_title', '') for a in rca.get('action_plans', [])]
            if actions: content_parts.append(f"AÇÕES DO PLANO: " + " | ".join(actions))
            
            content = "\n\n".join(content_parts).strip()
            current_hash = hashlib.sha256(content.encode('utf-8')).hexdigest()
            
            cursor.execute("SELECT content_hash FROM indexed_rcas WHERE rca_id = ?", (rca_id,))
            row = cursor.fetchone()
            if row and row[0] == current_hash:
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
                        "subgroup_id": str(subg_id or "")
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

def index_fmea_documents():
    """
    Varre a pasta data/fmea por arquivos .md e os indexa para busca vetorial.
    """
    import os
    import glob
    
    base_dir = os.path.dirname(os.path.dirname(__file__))
    fmea_path = os.path.join(base_dir, "data", "fmea")
    
    if not os.path.exists(fmea_path):
        print(f"[FMEA] Pasta não encontrada: {fmea_path}")
        return

    md_files = glob.glob(os.path.join(fmea_path, "*.md"))
    if not md_files:
        print("[FMEA] Nenhum manual .md encontrado para indexação.")
        return

    print(f"[FMEA] Analisando {len(md_files)} manuais técnicos...")
    
    try:
        conn = init_hash_db()
        cursor = conn.cursor()
        
        indexed = 0
        skipped = 0
        
        for file_path in md_files:
            filename = os.path.basename(file_path)
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    content = f.read()
                
                current_hash = hashlib.sha256(content.encode('utf-8')).hexdigest()
                
                cursor.execute("SELECT content_hash FROM indexed_fmea WHERE filename = ?", (filename,))
                row = cursor.fetchone()
                if row and row[0] == current_hash:
                    skipped += 1
                    continue

                fmea_knowledge.add_content(
                    name=filename,
                    text_content=content,
                    metadata={"filename": filename, "type": "fmea_manual"},
                    upsert=True
                )
                
                cursor.execute("INSERT OR REPLACE INTO indexed_fmea (filename, content_hash) VALUES (?, ?)", (filename, current_hash))
                conn.commit()
                indexed += 1
            except Exception as e:
                print(f"[WARNING] Erro ao indexar {filename}: {e}")

        print(f"[FMEA] Sync: {indexed} novos/atualizados, {skipped} mantidos.")
        conn.close()
    except Exception as e:
        print(f"[CRITICAL] Erro na indexação FMEA: {e}")
