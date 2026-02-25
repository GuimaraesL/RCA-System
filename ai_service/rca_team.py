# AI Service - Orquestração de Time RCA-Detectives (F45 Design)
import os
from agno.team import Team
from agno.models.google import Gemini
from dotenv import load_dotenv

from config import GOOGLE_API_KEY
from agent.teams.lead_detective import get_detective_agent
from agent.teams.asset_specialist import get_specialist_agent
from agent.teams.tech_writer import get_writer_agent
from agent.prompts import ORCHESTRATOR_PROMPT
from agent.memory import get_agent_memory

load_dotenv()

def create_rca_detectives_team(session_id: str = "default_rca", language: str = "Português-BR"):
    """
    Cria o time RCA-Detectives orquestrado por um Lead Agent.
    A orquestração silenciosa garante que apenas o relatório consolidado seja retornado.
    """
    
    # 1. Carregar Membros Especialistas (Silent Workers)
    detective = get_detective_agent(language)
    specialist = get_specialist_agent(language)
    writer = get_writer_agent(language)

    # 2. O Time (Team) como Orquestrador Único
    return Team(
        name="RCA-Detectives",
        members=[detective, specialist, writer],
        # O modelo do Team atua como o Gerente que lê e sintetiza as respostas dos membros
        model=Gemini(id="gemini-2.0-flash"),
        instructions=ORCHESTRATOR_PROMPT,
        db=get_agent_memory(session_id),
        add_history_to_context=True,
        num_history_runs=3,
        markdown=True,
    )

def get_rca_detectives_team(rca_id: str, language: str = "Português-BR"):
    """Alias para compatibilidade legado com scripts de teste."""
    return create_rca_detectives_team(rca_id, language)

# --- CLI PREVIEW ---

if __name__ == "__main__":
    if not os.getenv("GOOGLE_API_KEY"):
        print("❌ Por favor, configure a variável GOOGLE_API_KEY no arquivo .env")
    else:
        # Garante que o diretório de dados existe
        from config import AGENT_MEMORY_PATH
        os.makedirs(os.path.dirname(AGENT_MEMORY_PATH), exist_ok=True)
        
        team = create_rca_detectives_team()
        print("🤖 Lead Orchestrator Ativo. Digite sua mensagem:")
        team.cli_app(stream=True)
