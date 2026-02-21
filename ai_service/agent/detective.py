# AI Service - Agente RCA Detective
# Fábrica de criação do agente Agno com orquestração de modelos e ferramentas.

from agno.agent import Agent
from agno.models.google import Gemini
from .prompts import SYSTEM_INSTRUCTIONS, DETECTIVE_DESCRIPTION
from .tools import AGENT_TOOLS

def get_rca_detective_agent():
    """Instancia o Agente Agno com as ferramentas e instruções configuradas."""
    return Agent(
        model=Gemini(id="gemini-2.0-flash"),
        description=DETECTIVE_DESCRIPTION,
        instructions=SYSTEM_INSTRUCTIONS,
        tools=AGENT_TOOLS
    )
