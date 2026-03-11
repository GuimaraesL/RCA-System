"""
HFACS Agent (Investigador de Fatores Humanos)
Especializado em identificar causas organizacionais, climáticas, psicológicas e operacionais.
"""
from agno.agent import Agent
from agno.models.google import Gemini
from core.prompts import HFACS_AGENT_PROMPT

def get_hfacs_agent():
    """
    Retorna o agente especialista em Human Factors Analysis and Classification System.
    """
    return Agent(
        name="Human_Factors_Investigator",
        role="Especialista em Psicologia Organizacional e Segurança do Trabalho",
        model=Gemini(id="gemini-2.0-flash"),
        instructions=[HFACS_AGENT_PROMPT],
        markdown=True,
        debug_mode=True,
    )
