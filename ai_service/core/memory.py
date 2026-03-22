# AI Service - Memória e Persistência (SQLite)
# Singleton global compartilhado entre AgentOS e todos os Agentes.
from agno.db.sqlite import SqliteDb
from .config import AGENT_MEMORY_PATH

# Instância única de storage para todo o sistema.
# - id: GUID fixo para estabilizar a referência no Agno OS Dashboard.
# - session_table: Tabela onde o Agno persiste sessões (histórico de runs).
# - memory_table: Tabela onde o Agno persiste "memórias" (fatos extraídos).
_storage_instance = SqliteDb(
    id="rca-system-db-v1",
    db_file=AGENT_MEMORY_PATH,
    session_table="agno_sessions",
    memory_table="agno_memories",
    metrics_table="agno_metrics", # CRÍTICO: Evita erros de telemetria e interrupção de stream
)

def get_agent_memory():
    """Retorna a instância global de persistência SQLite compartilhada."""
    return _storage_instance
