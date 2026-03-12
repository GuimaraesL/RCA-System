import sqlite3
import json
import os
import sys
from datetime import datetime

# Caminho dinâmico para o banco de dados
LOCAL_DATA_DIR = os.path.join(os.environ.get("LOCALAPPDATA", os.path.expanduser("~")), "RCA-System")
DB_PATH = os.path.join(LOCAL_DATA_DIR, "agent_memory.db")

def safe_load(data):
    """Realiza decodificação JSON recursiva se necessário."""
    while isinstance(data, str):
        try:
            data = json.loads(data)
        except:
            break
    return data

def audit(session_id):
    if not os.path.exists(DB_PATH):
        print(f"❌ Banco de dados não encontrado em: {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    try:
        # Busca a coluna 'runs' que contém o histórico de execução no Agno
        query = "SELECT runs FROM agno_sessions WHERE session_id = ?"
        r = conn.execute(query, (session_id,)).fetchone()
        
        if not r or not r[0]:
            print(f"❌ Sessão {session_id} não encontrada no banco de memórias.")
            return

        runs = safe_load(r[0])
        
        print(f"\n{'='*70}")
        print(f"📋 AUDITORIA AGNO: {session_id}")
        print(f"{'='*70}")

        if isinstance(runs, list):
            for i, run in enumerate(runs):
                run = safe_load(run)
                run_id = run.get('run_id', 'N/A')
                created = run.get('created_at', 'N/A')
                
                print(f"\n🚀 EXECUÇÃO {i+1} [RUN: {run_id}] em {created}")
                print("-" * 40)
                
                msgs = run.get('messages', [])
                for m in msgs:
                    m = safe_load(m)
                    role = m.get('role', 'unknown').upper()
                    content = m.get('content', '')
                    
                    if role == "USER":
                        print(f"👤 USUÁRIO: {content}")
                    elif role == "ASSISTANT":
                        if 'tool_calls' in m and m['tool_calls']:
                            for tc in m['tool_calls']:
                                f = tc.get('function', {})
                                print(f"  🛠️  TOOL: {f.get('name')}({f.get('arguments')})")
                        if content:
                            print(f"🤖 AGENTE: {content}")
                    elif role == "TOOL":
                        # Resumir retorno de ferramentas para não poluir o terminal
                        summary = str(content)[:200] + "..." if len(str(content)) > 200 else str(content)
                        print(f"  📥 RETURN: {summary}")
        else:
            print("⚠️ Estrutura de 'runs' inválida (não é uma lista).")

    except Exception as e:
        print(f"💥 Erro na auditoria: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: python audit_session.py <session_id>")
        sys.exit(1)
    
    audit(sys.argv[1])
