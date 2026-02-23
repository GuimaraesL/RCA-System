# AI Service - Agente RCA Detective (Agno)
# Definição e orquestração do Agente especialista em análise de falhas.

from agno.agent import Agent
from agno.models.google import Gemini
from .prompts import SYSTEM_INSTRUCTIONS, DETECTIVE_DESCRIPTION
from .tools import AGENT_TOOLS
from .knowledge import get_rca_knowledge_base
from config import AGNO_API_KEY

def get_rca_detective_agent():
    """Instancia o Agente Agno com as ferramentas, instruções e RAG configurados."""
    knowledge_base = get_rca_knowledge_base()
    
    return Agent(
        name="rca-detective",
        model=Gemini(id="gemini-2.0-flash"),
        description=DETECTIVE_DESCRIPTION,
        instructions=SYSTEM_INSTRUCTIONS,
        tools=AGENT_TOOLS,
        knowledge=knowledge_base,
    )
