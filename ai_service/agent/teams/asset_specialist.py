# AI Service - Asset Specialist Agent (Consultant)
from agno.agent import Agent
from agno.models.google import Gemini
from ..tools import get_asset_fmea_tool
from agent.prompts import GLOBAL_RULES, SPECIALIST_PROMPT, MEMBER_RULES

def get_specialist_agent():
    return Agent(
        name="Asset_Specialist",
        role="Consultant (Especialista em Ativos e FMEA)",
        model=Gemini(id="gemini-2.0-flash"),
        instructions=[GLOBAL_RULES, SPECIALIST_PROMPT, MEMBER_RULES],
        tools=[get_asset_fmea_tool],
        markdown=True,
    )
