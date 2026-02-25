# AI Service - Super Agent (Unified RCA Agent)
from agno.agent import Agent
from agno.models.google import Gemini
from agno.tools.duckduckgo import DuckDuckGoTools
from .tools import get_rca_context_tool, search_historical_rcas_tool, get_asset_fmea_tool
from .knowledge import get_rca_history_knowledge
from .prompts import GLOBAL_RULES, SUPER_AGENT_PROMPT
from .memory import get_agent_memory

def get_super_agent(session_id: str, language: str = "Português-BR"):
    """
    Cria um Agente Único (Super Agente) que consolida as funções do Detetive, Especialista e Redator.
    Em vez de orquestrar múltiplos agentes, este agente faz a análise completa em um único turno.
    """
    return Agent(
        name="RCA_Super_Copilot",
        role="Especialista Definitivo em RCA",
        model=Gemini(id="gemini-2.0-flash"),
        instructions=[GLOBAL_RULES.format(idioma=language), SUPER_AGENT_PROMPT],
        tools=[get_rca_context_tool, search_historical_rcas_tool, get_asset_fmea_tool, DuckDuckGoTools()],
        knowledge=get_rca_history_knowledge(),
        search_knowledge=False, # Força a usar search_historical_rcas_tool
        db=get_agent_memory(session_id),
        add_history_to_context=True,
        num_history_runs=3,
        markdown=True,
    )
