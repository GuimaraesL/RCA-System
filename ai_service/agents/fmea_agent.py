"""
FMEA Specialist Agent (Agente Especialista FMEA)
Responsável pela análise técnica profunda cruzando manuais e histórico.
"""
from agno.agent import Agent
from agno.models.google import Gemini
from core.tools import get_asset_fmea_tool, search_historical_rcas_tool, get_full_rca_detail_tool, get_deterministic_fmea_tool
from core.knowledge import get_fmea_knowledge, get_rca_history_knowledge, get_technical_docs_knowledge
from core.prompts import FMEA_AGENT_PROMPT

def get_fmea_agent():
    """
    Retorna o agente especialista em FMEA.
    Configurado para ser stateless e técnico.
    """
    return Agent(
        name="FMEA_Technical_Specialist",
        role="Especialista em Engenharia de Manutenção",
        model=Gemini(id="gemini-2.0-flash"),
        instructions=[FMEA_AGENT_PROMPT],
        tools=[
            get_asset_fmea_tool,
            get_deterministic_fmea_tool,
            search_historical_rcas_tool,
            get_full_rca_detail_tool
        ],
        knowledge=[
            get_fmea_knowledge(), 
            get_rca_history_knowledge(),
            get_technical_docs_knowledge()
        ],
        search_knowledge=True,
        markdown=True,
        debug_mode=True,
    )
