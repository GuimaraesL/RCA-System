import sqlite3
import os
import sys

# Adiciona o diretório ai_service ao path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.config import AGENT_MEMORY_PATH

def clear_session(session_id):
    if not os.path.exists(AGENT_MEMORY_PATH):
        print(f"❌ Banco de dados não encontrado em {AGENT_MEMORY_PATH}")
        return

    conn = sqlite3.connect(AGENT_MEMORY_PATH)
    cursor = conn.cursor()
    
    # Verifica se a tabela existe
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='agno_sessions'")
    if not cursor.fetchone():
        print("❌ Tabela agno_sessions não encontrada.")
        conn.close()
        return

    cursor.execute("DELETE FROM agno_sessions WHERE session_id = ?", (session_id,))
    deleted_count = cursor.rowcount
    conn.commit()
    
    if deleted_count > 0:
        print(f"✅ Memória da sessão '{session_id}' apagada com sucesso! ({deleted_count} registros removidos)")
    else:
        print(f"⚠️ Nenhuma sessão encontrada com o ID '{session_id}'.")
        
    conn.close()

if __name__ == "__main__":
    if len(sys.argv) > 1:
        session = sys.argv[1]
    else:
        session = input("Digite o ID da sessão para limpar (ex: cli_dev_session_001): ")
        
    if session.strip():
        clear_session(session)
    else:
        print("❌ ID de sessão não pode ser vazio.")