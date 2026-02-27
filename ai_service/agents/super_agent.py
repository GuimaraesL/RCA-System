# AI Service - Super Agent (Unified RCA Agent)
from agno.agent import Agent
from agno.models.google import Gemini
from agno.tools.duckduckgo import DuckDuckGoTools
from core.tools import search_historical_rcas_tool, get_asset_fmea_tool, get_full_rca_detail_tool
from core.knowledge import get_rca_history_knowledge
from core.prompts import GLOBAL_RULES, SUPER_AGENT_PROMPT
from core.memory import get_agent_memory

from agno.skills import Skills, LocalSkills
import os

def get_super_agent(session_id: str, language: str = "Português-BR"):
    """
    Cria um Agente Único (Super Agente) que consolida as funções do Detetive, Especialista e Redator.
    Em vez de orquestrar múltiplos agentes, este agente faz a análise completa em um único turno.
    """
    # Define o caminho base das skills
    skills_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "skills")

    return Agent(
        name="RCA_Super_Copilot",
        role="Especialista Definitivo em RCA",
        model=Gemini(id="gemini-2.0-flash"),
        instructions=[GLOBAL_RULES.format(idioma=language), SUPER_AGENT_PROMPT],
        tools=[search_historical_rcas_tool, get_full_rca_detail_tool, get_asset_fmea_tool, DuckDuckGoTools()],
        skills=Skills(loaders=[LocalSkills(skills_path)]), # Carrega skills de formatação
        knowledge=None, # Desativado carregamento automático para economizar tokens
        search_knowledge=False, 
        db=get_agent_memory(session_id),
        add_history_to_context=True,
        num_history_runs=2, # Reduzido para economizar tokens
        debug_mode=True,
        markdown=True,
    )
