# AI Service - Chat Agent (Single Agent for Q&A)
from agno.agent import Agent
from agno.models.google import Gemini
from .tools import search_historical_rcas_tool, get_asset_fmea_tool
from .knowledge import get_rca_history_knowledge
from .prompts import GLOBAL_RULES, CHAT_AGENT_PROMPT
from .memory import get_agent_memory

def get_chat_agent(session_id: str, language: str = "Português-BR"):
    """
    Cria um Agente Único focado em respostas de chat conversacionais rápidas,
    evitando a sobrecarga computacional de um Team completo.
    """
    return Agent(
        name="RCA_Chat_Copilot",
        role="Engenheiro Sênior Conversacional",
        model=Gemini(id="gemini-2.0-flash"),
        instructions=[GLOBAL_RULES.format(idioma=language), CHAT_AGENT_PROMPT],
        tools=[search_historical_rcas_tool, get_asset_fmea_tool],
        knowledge=get_rca_history_knowledge(),
        search_knowledge=False, # Força a usar as ferramentas específicas se precisar
        db=get_agent_memory(session_id),
        add_history_to_context=True,
        num_history_runs=3,
        markdown=True,
    )
