# AI Service - Detective Agent (Lead Investigator)
from agno.agent import Agent
from agno.models.google import Gemini
from agno.tools.duckduckgo import DuckDuckGoTools
from ..tools import search_historical_rcas_tool
from ..knowledge import get_rca_history_knowledge
from agent.prompts import GLOBAL_RULES, DETECTIVE_PROMPT, MEMBER_RULES

def get_detective_agent(language: str = "Português-BR"):
    return Agent(
        name="Detective_Agent",
        role="Lead Investigator (Investigador de Fatos e Recorrências)",
        model=Gemini(id="gemini-2.0-flash"),
        instructions=[GLOBAL_RULES.format(idioma=language), DETECTIVE_PROMPT, MEMBER_RULES],
        tools=[DuckDuckGoTools(), search_historical_rcas_tool],
        knowledge=get_rca_history_knowledge(),
        search_knowledge=False, # <-- Desabilita busca genérica para forçar a tool `search_historical_rcas_tool`
        markdown=True,
    )
