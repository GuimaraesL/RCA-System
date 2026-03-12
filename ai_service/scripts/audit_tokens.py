import sqlite3
import json
import os
import sys
import tiktoken
import io

# Forçar UTF-8 no stdout para Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

LOCAL_DATA_DIR = os.path.join(os.environ.get("LOCALAPPDATA", os.path.expanduser("~")), "RCA-System")
DB_PATH = os.path.join(LOCAL_DATA_DIR, "agent_memory.db")

def safe_load(data):
    while isinstance(data, str):
        try:
            data = json.loads(data)
        except:
            break
    return data

def audit_tokens(session_id):
    if not os.path.exists(DB_PATH):
        print(f"❌ Banco não encontrado em: {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    r = conn.execute("SELECT runs FROM agno_sessions WHERE session_id = ?", (session_id,)).fetchone()
    if not r or not r[0]:
        print(f"❌ Sessão {session_id} não encontrada.")
        return

    # Usar o encoder do GPT-4o
    try:
        encoding = tiktoken.encoding_for_model("gpt-4o")
    except:
        encoding = tiktoken.get_encoding("cl100k_base")

    runs = safe_load(r[0])
    
    print(f"\n🔍 AUDITORIA DE TOKENS (CONTRA-PROVA INDEPENDENTE)")
    print(f"Sessão: {session_id}")
    print("="*90)
    print(f"{'Run':<5} | {'Agno Report (In)':<18} | {'Manual Recalc (In)':<18} | {'Diff (%)':<15} | {'Status'}")
    print("-" * 90)

    for i, run in enumerate(runs):
        run = safe_load(run)
        agno_in = run.get("metrics", {}).get("input_tokens", 0)
        
        messages = run.get("messages", [])
        raw_text = ""
        for m in messages:
            m = safe_load(m)
            raw_text += str(m.get("content", ""))
            if "tool_calls" in m:
                raw_text += json.dumps(m["tool_calls"])

        manual_in = len(encoding.encode(raw_text))
        diff = ((agno_in - manual_in) / manual_in * 100) if manual_in > 0 else 0
        
        status = "⚠️ DISCREPANTE" if diff > 20 else "✅ OK"
        if diff > 100: status = "🚨 CRÍTICO (RAG LEAK?)"
        
        print(f"{i+1:<5} | {agno_in:<18} | {manual_in:<18} | {diff:>14.2f}% | {status}")

    print("="*90)
    print("DICA: Diferenças altas indicam injeção de contexto (RAG) não persistido no histórico de mensagens.")
    conn.close()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: python audit_tokens.py <session_id>")
        sys.exit(1)
    
    audit_tokens(sys.argv[1])
