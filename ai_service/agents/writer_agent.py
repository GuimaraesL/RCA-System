# AI Service - Writer Agent (Technical Writer)
# Especialista em estruturação de Ishikawa (Mermaid) e Planos de Ação (5W2H).

from agno.agent import Agent
from agno.models.google import Gemini
from agno.skills import Skills, LocalSkills
from core.prompts import GLOBAL_RULES, MEMBER_RULES, WRITER_PROMPT
import os


def get_writer_agent(language: str = "Português-BR"):
    """
    Cria o agente Redator Técnico.
    Responsável por transformar dados brutos dos outros agentes
    em Ishikawa (Mermaid) e Planos de Ação (5W2H Markdown).
    """
    skills_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "skills")

    return Agent(
        name="RCA_Technical_Writer",
        role="Formatação de Ishikawa (Mermaid 6M) e Planos de Ação (5W2H) conforme padrões industriais",
        model=Gemini(id="gemini-2.0-flash"),
        instructions=[
            GLOBAL_RULES.format(idioma=language),
            MEMBER_RULES,
            WRITER_PROMPT,
        ],
        skills=Skills(loaders=[LocalSkills(skills_path)]),
        markdown=True,
    )
