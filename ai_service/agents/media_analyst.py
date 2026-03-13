"""
Media Analyst Agent (Especialista em Análise Visual de Falhas)
Especializado em identificar padrões de corrosão, fadiga, trincas e desalinhamento em mídias.
"""
from agno.agent import Agent
from agno.models.google import Gemini
from core.prompts import MEDIA_ANALYST_PROMPT

def get_media_analyst_agent():
    """
    Retorna o agente especialista em análise de imagem e vídeo.
    Configurado para processar mídias via multimodalidade.
    """
    return Agent(
        name="Media_Failure_Analyst",
        role="Perito em Engenharia e Análise Visual de Materiais",
        model=Gemini(id="gemini-2.5-flash"),
        instructions=[MEDIA_ANALYST_PROMPT],
        markdown=True,
        debug_mode=True,
    )
