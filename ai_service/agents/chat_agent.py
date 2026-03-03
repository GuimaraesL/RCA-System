# AI Service - Chat Agent (Single Agent for Q&A)
from agno.agent import Agent
from agno.models.google import Gemini
from core.tools import (
    search_historical_rcas_tool, 
    get_asset_fmea_tool,
    get_historical_rca_summary, 
    get_historical_rca_causes, 
    get_historical_rca_action_plan,
    get_historical_rca_triggers
)
from core.knowledge import get_rca_history_knowledge
from core.prompts import GLOBAL_RULES, CHAT_AGENT_PROMPT
from core.memory import get_agent_memory

from agno.skills import Skills, LocalSkills
from agno.tools.duckduckgo import DuckDuckGoTools
import os

def get_chat_agent(session_id: str, language: str = "Português-BR"):
    """
    Cria um Agente Único focado em respostas de chat conversacionais rápidas,
    evitando a sobrecarga computacional de um Team completo.
    """
    # Define o caminho base das skills
    skills_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "skills")

    return Agent(
        name="RCA_Chat_Copilot",
        session_id=session_id,
        role="Engenheiro Sênior Conversacional",
        model=Gemini(id="gemini-2.0-flash"),
        instructions=[GLOBAL_RULES.format(idioma=language), CHAT_AGENT_PROMPT],
        tools=[
            search_historical_rcas_tool, 
            get_historical_rca_summary, 
            get_historical_rca_causes, 
            get_historical_rca_action_plan,
            get_historical_rca_triggers,
            get_asset_fmea_tool,
            DuckDuckGoTools()
        ],
        skills=Skills(loaders=[LocalSkills(skills_path)]), # Carrega skills de formatação
        knowledge=None, # Desativado para economizar tokens
        search_knowledge=False, 
        db=get_agent_memory(session_id),
        read_chat_history=True,
        add_history_to_context=True,
        num_history_runs=4, # Mais contexto para fluidez conversacional
        debug_mode=True,
        markdown=True,
    )
