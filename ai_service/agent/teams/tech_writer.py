# AI Service - Technical Writer Agent (Action Planner)
from agno.agent import Agent
from agno.models.google import Gemini
from agent.prompts import GLOBAL_RULES, WRITER_PROMPT, MEMBER_RULES

def get_writer_agent(language: str = "Português-BR"):
    return Agent(
        name="Technical_Writer",
        role="Action Planner (Redator Técnico 5W2H)",
        model=Gemini(id="gemini-2.0-flash"),
        instructions=[GLOBAL_RULES.format(idioma=language), WRITER_PROMPT, MEMBER_RULES],
        markdown=True,
    )
