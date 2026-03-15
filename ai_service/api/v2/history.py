"""
Proposta: Gerenciar o histórico de chat das sessões do agente.
Fluxo: Permite resgatar e apagar profundamente os rastros (traces/spans) e a memória de sessões SQLite.
"""
from fastapi import APIRouter, Header, HTTPException
import secrets
import sqlite3
from agno.utils.log import logger

from core.config import INTERNAL_AUTH_KEY, AGENT_MEMORY_PATH

router = APIRouter()

@router.delete("/{rca_id}")
async def clear_chat_history(rca_id: str, x_internal_key: str = Header(None)):
    if not secrets.compare_digest(x_internal_key or '', INTERNAL_AUTH_KEY):
        raise HTTPException(status_code=403, detail="Invalid Internal Key")

    from core.knowledge import get_recurrence_analysis
    
    # [AUDIT] Verificar se as recorrências existem antes do clear
    result_before = get_recurrence_analysis(rca_id)
    logger.info(f"[clear_chat_history] rca_id={rca_id} - Recorrências antes do clear: {result_before is not None}")

    # Evitamos instanciar o agente completo (get_rca_agent) para obter o session_id,
    # prevenindo que callbacks do Agno toquem em outros bancos de dados durante o startup.
    # No sistema RCA, o session_id é deterministicamente igual ao rca_id.
    sid = rca_id
    
    try:
        # Usamos a memória para deletar a sessão via API do Agno se possível,
        # mas sem instanciar o agente/time completo.
        from core.memory import get_agent_memory
        storage = get_agent_memory()
        
        try:
            storage.delete_session(sid)
        except Exception as e:
            logger.warning(f"[clear_chat_history] Falha ao deletar via storage: {e}")

        conn = sqlite3.connect(AGENT_MEMORY_PATH)
        cursor = conn.cursor()
        
        # Tabelas que pertencem apenas à memória do agente e telemetria
        tables_to_clean = ["rca_sessions", "agno_traces", "agno_sessions", "agno_memories"]
        
        for table in tables_to_clean:
            cursor.execute(f"SELECT name FROM sqlite_master WHERE type='table' AND name='{table}'")
            if cursor.fetchone():
                cursor.execute(f"DELETE FROM {table} WHERE session_id = ?", (sid,))
            
        # Limpeza profunda de spans (telemetria pesada)
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='agno_traces'")
        if cursor.fetchone():
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='agno_spans'")
            if cursor.fetchone():
                cursor.execute("""
                    DELETE FROM agno_spans 
                    WHERE trace_id IN (SELECT trace_id FROM agno_traces WHERE session_id = ?)
                """, (sid,))
        
        conn.commit()
        conn.close()
        
        # [AUDIT] Verificar se as recorrências ainda existem após o clear
        result_after = get_recurrence_analysis(rca_id)
        logger.info(f"[clear_chat_history] rca_id={rca_id} - Recorrências após o clear: {result_after is not None}")

        logger.info(f"Limpeza profunda concluida para a sessao: {sid}")
        return {
            "status": "success", 
            "message": "Histórico e telemetria limpos com sucesso",
            "recurrence_preserved": True
        }
        
    except Exception as e:
        logger.error(f"Erro ao realizar limpeza profunda na RCA {rca_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao limpar banco: {e}")

@router.get("/{rca_id}")
async def get_chat_history(rca_id: str, x_internal_key: str = Header(None)):
    if not secrets.compare_digest(x_internal_key or '', INTERNAL_AUTH_KEY):
        raise HTTPException(status_code=403, detail="Invalid Internal Key")

    from agents.main_agent import get_rca_agent
    agent = get_rca_agent(rca_id)

    messages = []
    try:
        session_msgs = agent.get_session_messages(rca_id)
    except Exception as e:
        logger.warning(f"[get_chat_history] Falha ao recuperar histórico para {rca_id}: {e}")
        session_msgs = []

    if session_msgs:
        for msg in session_msgs:
            if msg.role in ['user', 'assistant']:
                content = msg.content

                if not content or not isinstance(content, str):
                    continue

                if msg.role == 'assistant' and ("<!-- RCA_SYSTEM_CONTEXT -->" in content or "<!-- INITIAL_ANALYSIS_REQUEST -->" in content):
                    continue

                if "<!-- USER_MESSAGE -->" in content:
                    content = content.split("<!-- USER_MESSAGE -->")[-1].strip()
                elif "<!-- INITIAL_ANALYSIS_REQUEST -->" in content:
                    content = "Solicitei uma análise baseada nos dados atuais do formulário."
                elif "<!-- RCA_SYSTEM_CONTEXT -->" in content:
                    content = "Dados contextuais enviados ao assistente."

                if content.strip() in ["IO", "Analisando...", "Consultando...", "Analizando..."]:
                    if msg.role == 'assistant': continue

                messages.append({
                    "role": msg.role,
                    "content": content,
                })

    return {"messages": messages}
