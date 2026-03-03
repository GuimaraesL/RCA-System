# AI Service - RCA Analysis Team (Coordinate Mode)
# Substitui o Super Agent monolítico por um Time de especialistas coordenados.
# O líder delega sub-tarefas para Detective, Specialist e Writer,
# depois sintetiza os resultados em um único output consolidado.

from agno.agent import Agent
from agno.team import Team
from agno.team.mode import TeamMode
from agno.models.google import Gemini
from core.prompts import GLOBAL_RULES, COPILOT_TEAM_PROMPT
from core.memory import get_agent_memory

from agents.detective_agent import get_detective_agent
from agents.specialist_agent import get_specialist_agent
from agents.writer_agent import get_writer_agent


def get_super_agent(session_id: str, language: str = "Português-BR"):
    """
    Cria o RCA Copilot Team (TeamMode.coordinate).
    O Líder recebe o COPILOT_TEAM_PROMPT e decide se:
    - Conversa direto sem acionar ninguém.
    - Delega busca para o Detective / Specialist.
    - Delega o fluxo completo para todos os especialistas sequencialmente.
    """
    # Cria os membros especialistas
    detective = get_detective_agent(language)
    specialist = get_specialist_agent(language)
    writer = get_writer_agent(language)

    return Team(
        name="RCA_Analysis_Team",
        session_id=session_id,
        mode=TeamMode.coordinate,
        model=Gemini(id="gemini-2.0-flash"),
        members=[detective, specialist, writer],
        instructions=[
            GLOBAL_RULES.format(idioma=language),
            COPILOT_TEAM_PROMPT,
        ],
        db=get_agent_memory(session_id),
        read_chat_history=True,
        add_history_to_context=True,
        num_history_runs=4,
        markdown=True,
        debug_mode=True,
        stream_member_events=False, # Evita duplicação: silencia os membros no stream e deixa apenas o Líder falar
    )
