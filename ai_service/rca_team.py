import os
from typing import Optional, List
from agno.agent import Agent
from agno.team import Team
from agno.models.google import Gemini
from agno.tools.duckduckgo import DuckDuckGoTools
from agno.db.sqlite import SqliteDb
from config import AGENT_MEMORY_PATH, GOOGLE_API_KEY
from dotenv import load_dotenv

load_dotenv()

# --- 1. PROMPTS & INSTRUÇÕES (Baseado no F45 Design) ---

GLOBAL_RULES = """
Você é parte do time 'RCA-Detectives', especializado em análise de causa raiz de falhas industriais.
REGRAS CRÍTICAS:
- Responda SEMPRE em Português-BR.
- Se usar termos técnicos em inglês, forneça a tradução ou contexto.
- Nunca invente dados de ativos; se não encontrar, informe que o ativo precisa de cadastro.
- Foque em causas físicas, humanas e latentes (organizacionais).
"""

DETECTIVE_INSTRUCTIONS = """
Como detetive líder:
1. Analise as evidências e a cronologia do evento.
2. Use a ferramenta DuckDuckGo para pesquisar modos de falha comuns em equipamentos similares se necessário.
3. Questione o usuário sobre 'o que não está sendo dito'.
"""

SPECIALIST_INSTRUCTIONS = """
Como especialista em ativos e FMEA:
1. Utilize a taxonomia técnica da Novelis para classificar a falha.
2. Verifique se o modo de falha descrito já existe no FMEA do ativo.
3. Sugira componentes adjacentes que podem ter sofrido danos colaterais.
"""

WRITER_INSTRUCTIONS = """
Como redator técnico:
1. Formate o plano de ação final seguindo a metodologia 5W2H.
2. Garanta que as ações corretivas foquem na eliminação da causa e não apenas no sintoma.
3. Utilize a Hierarquia de Controles (Eliminação > Substituição > Engenharia > ADM > EPI).
"""

TEAM_INSTRUCTIONS = [
    "O time deve colaborar para fornecer a análise mais profunda possível.",
    "O Detetive começa analisando o contexto.",
    "O Especialista valida tecnicamente os componentes e modos de falha.",
    "O Redator consolida tudo em um relatório executivo e plano de ação estruturado."
]

# --- 2. FERRAMENTAS (Simulação de integração com Backend) ---

def get_rca_context_tool(rca_id: str):
    """Busca contexto histórico de RCAs similares."""
    # Simulação: No futuro isso fará um fetch no backend/vector db
    return "Nota: Falhas similares em mangotes hidráulicos ocorreram na Prensa 02 ano passado por abrasão."

def get_asset_fmea_tool(equipment_id: str):
    """Busca modos de falha conhecidos para este equipamento no FMEA."""
    return f"FMEA Equipamento {equipment_id}: Modos de falha mapeados: Vazamento de Vedação, Ruptura por Fadiga, Entupimento."

# --- 3. CONSTRUÇÃO DO TIME ---

def create_rca_detectives_team(session_id: str = "default_rca"):
    # Agente 1: O Detetive
    detective = Agent(
        name="Detetive_Lider",
        role="Investigador de Causas Raiz",
        model=Gemini(id="gemini-2.0-flash"),
        instructions=GLOBAL_RULES + DETECTIVE_INSTRUCTIONS,
        tools=[DuckDuckGoTools(), get_rca_context_tool],
    )

    # Agente 2: O Especialista
    specialist = Agent(
        name="Especialista_Ativos",
        role="Consultor Técnico e de FMEA",
        model=Gemini(id="gemini-2.0-flash"),
        instructions=GLOBAL_RULES + SPECIALIST_INSTRUCTIONS,
        tools=[get_asset_fmea_tool],
    )

    # Agente 3: O Redator
    writer = Agent(
        name="Redator_Tecnico",
        role="Especialista em Documentação e 5W2H",
        model=Gemini(id="gemini-2.0-flash"),
        instructions=GLOBAL_RULES + WRITER_INSTRUCTIONS,
    )

    # O Time (Team)
    return Team(
        name="RCA-Detectives",
        members=[detective, specialist, writer],
        model=Gemini(id="gemini-2.0-flash"),
        instructions=TEAM_INSTRUCTIONS,
        db=SqliteDb(
            session_table="rca_sessions",
            db_file=AGENT_MEMORY_PATH,
        ),
        add_history_to_context=True,
        num_history_runs=3,
        markdown=True,
        debug_mode=True,
    )

# --- 4. EXECUÇÃO CLI (Para Teste Direto) ---

if __name__ == "__main__":
    if not os.getenv("GOOGLE_API_KEY"):
        print("❌ Por favor, configure a variável GOOGLE_API_KEY no arquivo .env")
    else:
        # Garante que o diretório de storage existe
        os.makedirs("ai_service/storage", exist_ok=True)
        
        team = create_rca_detectives_team()
        print("🤖 Time RCA-Detectives Inicializado. Digite sua mensagem (ex: 'Analise um vazamento de óleo na Prensa 05'):")
        team.cli_app(stream=True)
