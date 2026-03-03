# AI Service - Detective Agent (Lead Investigator)
# Especialista em mineração de histórico e busca de recorrências no RAG.

from agno.agent import Agent
from agno.models.google import Gemini
from core.tools import (
    search_historical_rcas_tool,
    get_historical_rca_summary,
    get_historical_rca_causes,
    get_historical_rca_action_plan,
    get_historical_rca_triggers
)
from core.prompts import GLOBAL_RULES, MEMBER_RULES, DETECTIVE_PROMPT


def get_detective_agent(language: str = "Português-BR"):
    """
    Cria o agente Detetive de Histórico.
    Responsável por buscar RCAs passadas, identificar recorrências
    e extrair lições aprendidas do banco vetorial.
    """
    return Agent(
        name="RCA_Detective",
        role="Mineração de histórico de falhas e identificação de recorrências",
        model=Gemini(id="gemini-2.0-flash"),
        instructions=[
            GLOBAL_RULES.format(idioma=language),
            MEMBER_RULES,
            DETECTIVE_PROMPT,
        ],
        tools=[
            search_historical_rcas_tool,
            get_historical_rca_summary,
            get_historical_rca_causes,
            get_historical_rca_action_plan,
            get_historical_rca_triggers
        ],
        markdown=True,
    )
