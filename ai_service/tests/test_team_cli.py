import sys
import os

# Adiciona o diretório ai_service ao path para facilitar imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from rca_team import get_rca_detectives_team
from config import GOOGLE_API_KEY
import os
import dotenv

# Carrega variáveis de ambiente
dotenv.load_dotenv()

print(f"🐍 Python Executable: {sys.executable}")
print(f"📂 Current Dir: {os.getcwd()}")
print(f"📦 Sys Path: {sys.path[:3]}...") # Primeiros caminhos

def test_team_analysis():
    print("🚀 Iniciando Teste do Time RCA-Detectives via CLI...\n")
    
    # Simulação de um contexto de RCA para teste
    test_rca_id = "TEST-CLI-001"
    test_context = """
    PROBLEMA: Vazamento de óleo hidráulico na Prensa 05.
    QUEM: João Silva (Líder de Manutenção).
    QUANDO: 23/02/2026 às 10:45.
    ONDE: Área de Laminação, Prensa 05, Conjunto de Válvulas.
    IMPACTO: Parada de linha por 120 minutos, 50 litros de óleo perdidos.
    DESCRIÇÃO: Durante a operação normal, o mangote de alta pressão estourou próximo à conexão flangeada. 
    Observou-se desgaste abrasivo na malha externa do mangote.
    """

    # Inicializa o time
    team = get_rca_detectives_team(rca_id=test_rca_id)
    
    # Preparar o prompt enriquecido com recorrências simuladas
    recurr_str = "- [RCA RCA-2025-999](/rcas/RCA-2025-999): Vazamento similar em Prensa 01 (Nível: area)\n- [RCA RCA-2024-123](/rcas/RCA-2024-123): Rompimento de mangote por abrasão (Nível: subgroup)"
    
    prompt = f"Analise o seguinte evento de falha e sugira causas raiz e um plano de ação: {test_context}"
    prompt += f"\n\n⚠️ RECORRÊNCIAS ENCONTRADAS:\n{recurr_str}\n\nObrigatório: No seu relatório, crie um banner (usando blockquote Markdown `>`) na seção de Histórico e liste essas RCAs com os links fornecidos."

    print("--- SOLICITANDO ANÁLISE ---\n")
    team.print_response(
        prompt,
        stream=True,
        show_members_responses=False # Mantenha limpo para ver apenas a resposta do líder
    )
    print("\n--- TESTE FINALIZADO ---")

if __name__ == "__main__":
    if not os.getenv("GOOGLE_API_KEY"):
        print("❌ ERRO: A variável de ambiente GOOGLE_API_KEY não está configurada.")
        sys.exit(1)
    
    test_team_analysis()
