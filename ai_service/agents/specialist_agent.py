# AI Service - Specialist Agent (Asset Engineer)
# Especialista em FMEA e análise técnica de modos de falha.

from agno.agent import Agent
from agno.models.google import Gemini
from agno.tools.duckduckgo import DuckDuckGoTools
from core.tools import get_asset_fmea_tool
from core.prompts import GLOBAL_RULES, MEMBER_RULES, SPECIALIST_PROMPT


def get_specialist_agent(language: str = "Português-BR"):
    """
    Cria o agente Especialista em Ativos.
    Responsável por consultar o FMEA, validar hipóteses técnicas
    e identificar modos de falha prováveis.
    """
    return Agent(
        name="RCA_Asset_Specialist",
        role="Análise de modos de falha (FMEA) e validação técnica de hipóteses",
        model=Gemini(id="gemini-2.5-flash"),
        instructions=[
            GLOBAL_RULES.format(idioma=language),
            MEMBER_RULES,
            SPECIALIST_PROMPT,
        ],
        tools=[get_asset_fmea_tool, DuckDuckGoTools()],
        markdown=True,
    )
