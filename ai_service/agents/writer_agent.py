# AI Service - Writer Agent (Technical Writer)
# Especialista em estruturação de Ishikawa (Mermaid) e Planos de Ação (5W2H).
# O template Mermaid está embutido diretamente no WRITER_PROMPT (core/prompts.py).

from agno.agent import Agent
from agno.models.google import Gemini
from core.prompts import GLOBAL_RULES, MEMBER_RULES, WRITER_PROMPT


def get_writer_agent(language: str = "Português-BR"):
    """
    Cria o agente Redator Técnico.
    Responsável por transformar dados brutos dos outros agentes
    em Ishikawa (Mermaid) e Planos de Ação (5W2H Markdown).
    O template está hardcoded no prompt para garantir 100% de consistência.
    """
    return Agent(
        name="RCA_Technical_Writer",
        role="Formatação de Ishikawa (Mermaid 6M) e Planos de Ação (5W2H) conforme padrões industriais",
        model=Gemini(id="gemini-2.0-flash"),
        instructions=[
            GLOBAL_RULES.format(idioma=language),
            MEMBER_RULES,
            WRITER_PROMPT,
        ],
        markdown=True,
    )

