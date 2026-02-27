"""
Script de migração para consolidar tabelas legadas (agno_memories, rca_sessions) 
na tabela padrão agno_sessions.
"""
import sqlite3
import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from core.config import AGENT_MEMORY_PATH

def migrate():
    print(f"🚀 Iniciando migração de banco: {AGENT_MEMORY_PATH}")
    if not os.path.exists(AGENT_MEMORY_PATH):
        print("❌ Banco de dados não encontrado.")
        return

    conn = sqlite3.connect(AGENT_MEMORY_PATH)
    cursor = conn.cursor()

    # Listar tabelas existentes
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = [t[0] for t in cursor.fetchall()]
    print(f"📊 Tabelas encontradas: {tables}")

    # Garantir que agno_sessions existe (criar a partir do schema de agno_memories se possível)
    if "agno_sessions" not in tables:
        source = "agno_memories" if "agno_memories" in tables else "rca_sessions" if "rca_sessions" in tables else None
        if source:
            cursor.execute(f"SELECT sql FROM sqlite_master WHERE type='table' AND name='{source}'")
            schema = cursor.fetchone()[0]
            new_schema = schema.replace(source, "agno_sessions")
            cursor.execute(new_schema)
            print(f"✅ Tabela agno_sessions criada a partir de {source}.")
        else:
            print("⚠️ Nenhuma tabela de origem para criar o schema.")
            conn.close()
            return

    # Migrar dados de agno_memories
    if "agno_memories" in tables:
        try:
            cursor.execute("INSERT OR IGNORE INTO agno_sessions SELECT * FROM agno_memories")
            count = cursor.rowcount
            print(f"✅ {count} registros migrados de agno_memories → agno_sessions.")
        except Exception as e:
            print(f"ℹ️ Pulo de agno_memories: {e}")

    # Migrar dados de rca_sessions
    if "rca_sessions" in tables:
        try:
            cursor.execute("INSERT OR IGNORE INTO agno_sessions SELECT * FROM rca_sessions")
            count = cursor.rowcount
            print(f"✅ {count} registros migrados de rca_sessions → agno_sessions.")
        except Exception as e:
            print(f"ℹ️ Pulo de rca_sessions: {e}")

    conn.commit()

    # Verificar resultado final
    cursor.execute("SELECT COUNT(*) FROM agno_sessions")
    total = cursor.fetchone()[0]
    print(f"📦 Total de registros em agno_sessions: {total}")

    conn.close()
    print("🎉 Migração concluída com sucesso!")

if __name__ == "__main__":
    migrate()
