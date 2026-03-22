"""
Proposta: Agente validador de recorrências RAG (Estágio 2).
Fluxo: Recebe candidatos da busca vetorial -> Aplica lógica de Engenharia de Confiabilidade (Gold Standard) -> Retorna JSON com decisões de validação/descarte.
"""
from agno.agent import Agent
from agno.models.google import Gemini

from core.prompts import RAG_VALIDATOR_PROMPT


def get_rag_validator(language: str = "Português-BR"):
    """
    Cria um agente leve e efêmero (sem memória) cujo único papel é
    filtrar falsos positivos do RAG e retornar apenas recorrências válidas.
    """
    return Agent(
        name="RAG_Recurrence_Validator",
        role="Especialista em Triagem de Recorrências Técnicas",
        model=Gemini(id="gemini-2.0-flash", temperature=0.4),  # Temperatura alta para máxima correlação mecânica
        instructions=[
            f"Responda SEMPRE em {language}.",
            RAG_VALIDATOR_PROMPT
        ],
        markdown=False,
        debug_mode=True,
    )
