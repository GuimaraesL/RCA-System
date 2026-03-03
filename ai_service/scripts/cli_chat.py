import sys
import os

# Adiciona o diretório ai_service ao path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from agno.agent import Agent
from agno.models.google import Gemini
from core.memory import get_agent_memory
import dotenv
from core.tools import (
    search_historical_rcas_tool, 
    get_asset_fmea_tool,
    get_historical_rca_summary, 
    get_historical_rca_causes, 
    get_historical_rca_action_plan,
    get_historical_rca_triggers
)
from core.prompts import CHAT_AGENT_PROMPT

def run_interactive_cli():
    dotenv.load_dotenv()
    print("🔧 INICIANDO RCA COPILOT EM MODO CLI DEBUG (Agno cli_app) 🔧")
    print("----------------------------------------------------------")
    print("Simule dados vindos do frontend nas primeiras mensagens para dar contexto ao agente.")
    
    agent = Agent(
        name="RCA_CLI_Debugger",
        model=Gemini(id="gemini-2.0-flash"),
        instructions=[
            "Você é o RCA Copilot.",
            "Lembre-se: O usuário irá lhe fornecer o CONTEXTO ATUAL da falha (como se viesse do frontend). Trate esses dados como a verdade do incidente atual.",
            CHAT_AGENT_PROMPT
        ],
        tools=[
            search_historical_rcas_tool,
            get_historical_rca_summary,
            get_historical_rca_causes,
            get_historical_rca_action_plan,
            get_historical_rca_triggers,
            get_asset_fmea_tool
        ],
        db=get_agent_memory("cli_test_session"),
        read_chat_history=True,
        add_history_to_context=True,
        num_history_runs=5,
        markdown=True,
        debug_mode=True # Exibe logs detalhados do Agno
    )

    # Inicia a interface CLI interativa nativa do Agno
    agent.cli_app(markdown=True)

if __name__ == "__main__":
    run_interactive_cli()