import os
import shutil
import sqlite3
import sys
sys.path.append(os.getcwd())

from core.config import VECTOR_DB_PATH, KNOWLEDGE_DB_PATH

AGENT_MEMORY = KNOWLEDGE_DB_PATH
CHROMA_DB = VECTOR_DB_PATH

def force_reindex():
    print("🧹 Cleaning VectorDB and Hashes...")
    if os.path.exists(CHROMA_DB):
        try:
            shutil.rmtree(CHROMA_DB)
            print(f"Deleted {CHROMA_DB}")
        except Exception as e:
            print(f"Failed to delete {CHROMA_DB}: {e}")
            
    if os.path.exists(AGENT_MEMORY):
        try:
            conn = sqlite3.connect(AGENT_MEMORY)
            cursor = conn.cursor()
            cursor.execute("DROP TABLE IF EXISTS indexed_rcas_v2")
            conn.commit()
            conn.close()
            print("Dropped indexed_rcas_v2 hash table")
        except Exception as e:
            print(f"Failed to drop table: {e}")
        
    print("🚀 Triggering Reindex...")
    from core.knowledge import index_historical_rcas
    index_historical_rcas()
    print("✅ Finished.")

if __name__ == "__main__":
    force_reindex()
