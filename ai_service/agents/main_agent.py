"""
Proposta: Gerenciar a instanciação e o cache de componentes do Agente RCA Copiloto.
Fluxo: Carrega skills de disco (cacheado) -> Cria Team fresh por request -> Vincula ao SQLite.
"""
import os
from typing import Optional

from agno.agent import Agent
from agno.team import Team
from agno.models.google import Gemini
from agno.skills import Skills, LocalSkills
from agno.tools.duckduckgo import DuckDuckGoTools

from core.tools import (
    search_historical_rcas_tool,
    get_historical_rca_summary,
    get_historical_rca_causes, 
    get_historical_rca_action_plan,
    get_historical_rca_triggers,
    calculate_reliability_metrics_tool,
    get_current_screen_context
)
from agents.fmea_agent import get_fmea_agent
from agents.media_analyst import get_media_analyst_agent
from agents.hfacs_agent import get_hfacs_agent
from core.prompts import GLOBAL_RULES, MAIN_AGENT_PROMPT
from core.memory import get_agent_memory

# Cache apenas das skills (I/O de disco) para evitar latência em cada request
_skill_tools_cache: dict[str, list] = {}

def _get_skill_tools() -> list:
    """Carrega skills do disco apenas uma vez."""
    if "tools" not in _skill_tools_cache:
        skills_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "skills")
        loaders = []
        if os.path.exists(skills_path):
            loaders.append(LocalSkills(skills_path))
        rca_skills = Skills(loaders=loaders) if loaders else None
        _skill_tools_cache["tools"] = rca_skills.get_tools() if rca_skills else []
    return _skill_tools_cache["tools"]

def get_rca_agent(session_id: str, language: str = "Português-BR"):
    """
    Interface pública para obter o agente RCA.
    Cria uma nova instância do Team por request para evitar poluição de estado (Erro Gemini 400).
    O histórico é mantido automaticamente pelo Agno via SQLite.
    """
    return _create_rca_agent(session_id, language)

def _create_rca_agent(session_id: str, language: str = "Português-BR"):
    """Centraliza a lógica de construção do Team."""
    skill_tools = _get_skill_tools()
    
    agent_instructions = [
        GLOBAL_RULES.format(idioma=language), 
        MAIN_AGENT_PROMPT
    ]

    return Team(
        name="RCA_Unified_Copilot",
        session_id=session_id,
        role="Engenheiro Sênior de Confiabilidade e Orquestrador RCA",
        model=Gemini(id="gemini-2.0-flash"), 
        instructions=agent_instructions,
        tools=[
            search_historical_rcas_tool, 
            get_historical_rca_summary, 
            get_historical_rca_causes, 
            get_historical_rca_action_plan, 
            get_historical_rca_triggers,
            calculate_reliability_metrics_tool,
            get_current_screen_context,
            DuckDuckGoTools()
        ] + skill_tools,
        members=[
            get_fmea_agent(language=language),
            get_media_analyst_agent(language=language),
            get_hfacs_agent(language=language)
        ],
        db=get_agent_memory(),
        read_chat_history=True,
        add_history_to_context=True,
        add_session_summary_to_context=True,
        num_history_runs=20,
        markdown=True,
        debug_mode=True,
    )

def clear_rca_agent_cache(session_id: str = None):
    """Limpa o cache de ferramentas (skills) de disco."""
    _skill_tools_cache.clear()
