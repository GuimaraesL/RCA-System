# AI Service - Detective Agent (Lead Investigator)
from agno.agent import Agent
from agno.models.google import Gemini
from agno.tools.duckduckgo import DuckDuckGoTools
from ..tools import get_rca_context_tool
from ..knowledge import get_rca_knowledge_base
from agent.prompts import GLOBAL_RULES, DETECTIVE_PROMPT, MEMBER_RULES

def get_detective_agent():
    return Agent(
        name="Detective_Agent",
        role="Lead Investigator (Investigador de Fatos e Recorrências)",
        model=Gemini(id="gemini-2.0-flash"),
        instructions=[GLOBAL_RULES, DETECTIVE_PROMPT, MEMBER_RULES],
        tools=[DuckDuckGoTools(), get_rca_context_tool],
        knowledge=get_rca_knowledge_base(),
        markdown=True,
    )
