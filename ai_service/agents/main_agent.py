import os
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
from core.prompts import GLOBAL_RULES, MAIN_AGENT_PROMPT, MEDIA_ANALYSIS_RULES
from core.memory import get_agent_memory

def get_rca_agent(session_id: str, language: str = "Português-BR", rca_context: str = None, validated_recurrences: str = None):
    """
    Cria o Agente Copiloto RCA (Estágio 3 do Pipeline).
    Recebe contexto do incidente e recorrências já validadas pelo RAG Validator.
    Tem acesso à metodologia (.md) via search_knowledge e ferramentas de detalhe sob demanda.
    """
    # Carrega Skills Locais (Agno Skills)
    skills_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "skills")
    loaders = []
    if os.path.exists(skills_path):
        loaders.append(LocalSkills(skills_path))
    
    rca_skills = Skills(loaders=loaders) if loaders else None
    skill_tools = rca_skills.get_tools() if rca_skills else []

    # Prepara as instruções base (SEM injetar contexto pesado dinamico aqui)
    agent_instructions = [
        GLOBAL_RULES.format(idioma=language), 
        MAIN_AGENT_PROMPT
    ]

    # Cria o Time de Especialistas Unificado
    # O Team no Agno 2.x suporta orquestração direta de agentes
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
