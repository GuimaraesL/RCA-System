import sys
import os

# Adiciona o diretório ai_service ao path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from agno.agent import Agent
from agno.models.google import Gemini
from core.tools import (
    search_historical_rcas_tool, 
    get_asset_fmea_tool,
    get_historical_rca_summary, 
    get_historical_rca_causes, 
    get_historical_rca_action_plan
)
from core.prompts import CHAT_AGENT_PROMPT

def test_agent():
    print("🔧 INICIANDO TESTE DO AGENTE (NON-INTERACTIVE) 🔧")
    
    agent = Agent(
        name="RCA_CLI_Test",
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
            get_asset_fmea_tool
        ],
        markdown=True,
    )

    prompt = "[DADOS ATUAIS DA TELA]\nAtivo: Motor Principal do Conveyor 01\nDescrição: O motor parou repentinamente. Parece haver um vazamento de óleo.\n\nPor favor, pesquise o histórico para ver se temos algo parecido com esse motor."
    print(f"\n--- PROMPT ---\n{prompt}\n")
    
    print("--- RESPOSTA DO AGENTE ---")
    agent.print_response(prompt, stream=False)

if __name__ == "__main__":
    test_agent()
