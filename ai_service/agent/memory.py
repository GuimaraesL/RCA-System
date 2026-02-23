# AI Service - Memória e Persistência (SQLite)
from agno.db.sqlite import SqliteDb
from config import AGENT_MEMORY_PATH

def get_agent_memory(session_id: str):
    """Retorna a persistência SQLite vinculada a um session_id (rca_id)."""
    return SqliteDb(
        session_table="rca_sessions",
        db_file=AGENT_MEMORY_PATH,
    )
