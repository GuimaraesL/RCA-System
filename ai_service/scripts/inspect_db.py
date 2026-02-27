import sqlite3
import os
from core.config import AGENT_MEMORY_PATH

def inspect_db():
    print(f"🔍 Inspecionando banco: {AGENT_MEMORY_PATH}")
    if not os.path.exists(AGENT_MEMORY_PATH):
        print("❌ Arquivo não encontrado!")
        return

    conn = sqlite3.connect(AGENT_MEMORY_PATH)
    cursor = conn.cursor()
    
    # Listar tabelas
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()
    print(f"📊 Tabelas encontradas: {[t[0] for t in tables]}")
    
    for table_name in [t[0] for t in tables]:
        cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
        count = cursor.fetchone()[0]
        print(f"  - {table_name}: {count} registros")
        
        # Se for agno_memories ou rca_sessions, ver algumas colunas
        if table_name in ["agno_memories", "rca_sessions"]:
            cursor.execute(f"PRAGMA table_info({table_name})")
            columns = [col[1] for col in cursor.fetchall()]
            print(f"    Colunas: {columns}")
            
            # Ver IDs de sessão
            if "session_id" in columns:
                cursor.execute(f"SELECT DISTINCT session_id FROM {table_name} LIMIT 5")
                sessions = cursor.fetchall()
                print(f"    Exemplos de Session IDs: {[s[0] for s in sessions]}")

    conn.close()

if __name__ == "__main__":
    inspect_db()
