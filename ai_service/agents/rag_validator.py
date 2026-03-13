"""
RAG Validator Agent (Estágio 2 do Pipeline)
Recebe os resultados brutos da busca vetorial e valida se são recorrências reais.
"""
from agno.agent import Agent
from agno.models.google import Gemini

from core.prompts import RAG_VALIDATOR_PROMPT


def get_rag_validator():
    """
    Cria um agente leve e efêmero (sem memória) cujo único papel é
    filtrar falsos positivos do RAG e retornar apenas recorrências válidas.
    """
    return Agent(
        name="RAG_Recurrence_Validator",
        role="Especialista em Triagem de Recorrências Técnicas",
        model=Gemini(id="gemini-2.5-flash"),  # Modelo barato para triagem rápida
        instructions=[RAG_VALIDATOR_PROMPT],
        markdown=False,
        debug_mode=True,
    )
