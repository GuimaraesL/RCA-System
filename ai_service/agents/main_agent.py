import os
from agno.agent import Agent
from agno.models.google import Gemini
from agno.skills import Skills, LocalSkills
from agno.tools.duckduckgo import DuckDuckGoTools

from core.tools import (
    search_historical_rcas_tool, 
    get_asset_fmea_tool,
    get_historical_rca_summary, 
    get_historical_rca_causes, 
    get_historical_rca_action_plan,
    get_historical_rca_triggers
)
from core.knowledge import get_rca_history_knowledge, get_methodology_knowledge
from core.prompts import GLOBAL_RULES, MAIN_AGENT_PROMPT, MEDIA_ANALYSIS_RULES
from core.memory import get_agent_memory

def get_rca_agent(session_id: str, language: str = "Português-BR", rca_context: str = None):
    """
    Cria um Agente Único Unificado com acesso a todas as ferramentas, conhecimentos (RAG) 
    e habilidades para realizar análises de RCA, gerar artefatos e interagir via chat.
    """
    skills_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "skills")

    # Verifica se o caminho existe para evitar erro no carregamento das LocalSkills
    loaders = []
    if os.path.exists(skills_path):
        loaders.append(LocalSkills(skills_path))

    # Prepara as instruções base
    agent_instructions = [
        GLOBAL_RULES.format(idioma=language), 
        MAIN_AGENT_PROMPT,
        MEDIA_ANALYSIS_RULES
    ]

    # Injeta o contexto atual do formulário/RAG como instrução de sistema (não salva no histórico de chat)
    if rca_context:
        agent_instructions.append(f"\n### CONTEXTO ATUAL DO INCIDENTE (VERDADE ABSOLUTA):\n{rca_context}\n")

    return Agent(
        name="RCA_Unified_Copilot",
        session_id=session_id,
        role="Engenheiro Sênior de Confiabilidade e Copiloto RCA",
        model=Gemini(id="gemini-2.5-flash"),
        instructions=agent_instructions,
        tools=[
            search_historical_rcas_tool, 
            get_historical_rca_summary, 
            get_historical_rca_causes, 
            get_historical_rca_action_plan,
            get_historical_rca_triggers,
            get_asset_fmea_tool,
            DuckDuckGoTools()
        ],
        skills=Skills(loaders=loaders) if loaders else None, 
        knowledge=[get_rca_history_knowledge(), get_methodology_knowledge()], 
        search_knowledge=True, 
        db=get_agent_memory(session_id),
        read_chat_history=True,
        add_history_to_context=True,
        num_history_runs=4,
        debug_mode=True,
        markdown=True,
    )
