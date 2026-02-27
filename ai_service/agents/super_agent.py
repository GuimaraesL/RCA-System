# AI Service - RCA Analysis Team (Coordinate Mode)
# Substitui o Super Agent monolítico por um Time de especialistas coordenados.
# O líder delega sub-tarefas para Detective, Specialist e Writer,
# depois sintetiza os resultados em um único output consolidado.

from agno.agent import Agent
from agno.team import Team
from agno.team.mode import TeamMode
from agno.models.google import Gemini
from core.prompts import GLOBAL_RULES, SUPER_AGENT_PROMPT
from core.memory import get_agent_memory

from agents.detective_agent import get_detective_agent
from agents.specialist_agent import get_specialist_agent
from agents.writer_agent import get_writer_agent


def get_super_agent(session_id: str, language: str = "Português-BR"):
    """
    Cria um Time de Análise de RCA (substituindo o Super Agente monolítico).
    Usa TeamMode.coordinate: o líder delega para os especialistas e sintetiza o resultado.
    
    O líder (Team Leader) tem o SUPER_AGENT_PROMPT e orquestra:
    - Detective: Busca histórica e recorrências
    - Specialist: Validação técnica via FMEA
    - Writer: Formatação de Ishikawa e Planos de Ação
    """
    # Cria os membros especialistas
    detective = get_detective_agent(language)
    specialist = get_specialist_agent(language)
    writer = get_writer_agent(language)

    return Team(
        name="RCA_Analysis_Team",
        mode=TeamMode.coordinate,
        model=Gemini(id="gemini-2.0-flash"),
        members=[detective, specialist, writer],
        instructions=[
            GLOBAL_RULES.format(idioma=language),
            SUPER_AGENT_PROMPT,
        ],
        db=get_agent_memory(session_id),
        markdown=True,
        debug_mode=True,
        stream_member_events=False, # Evita duplicação: silencia os membros no stream e deixa apenas o Líder falar
    )
