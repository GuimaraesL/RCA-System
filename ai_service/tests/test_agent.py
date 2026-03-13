import asyncio
import os
import sys
import json

# Adiciona o diretório atual ao path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from agents.main_agent import get_rca_agent
from agno.utils.log import logger

async def test_ishikawa_generation():
    rca_id = "test-ishikawa-flow"
    
    # Contexto da Tela no formato exato do frontend
    screen_context = {
        "title": "Roletes do Módulo 25 do conveyor não giram",
        "description": "Parada do CM2 durante 63 minutos devido rompimento da corrente de acionamento dos roletes do módulo 25 do conveyor malha 2.",
        "asset_display": "Ativo em rascunho",
        "date": "2025-11-07",
        "hierarchy": {
            "area": "LF",
            "equipment": "CM_2",
            "subgroup": "10 - CONVEYOR DE BOBINAS - CONVEYOR 02"
        },
        "current_causes": "Roteiro do plano não contém o método de execução e parâmetro para tensionamento das correntes."
    }
    context_block = f"DADOS ATUAIS DA TELA:\n{json.dumps(screen_context, indent=2, ensure_ascii=False)}"

    # Pergunta focada no Ishikawa
    prompt = "Com base nos dados da tela e no histórico de falhas, gere o Diagrama de Ishikawa completo."

    print(f"\n🎨 TESTANDO GERAÇÃO DE ISHIKAWA (FLUXO SKILL-ONLY)")
    print("-" * 60)
    
    agent = get_rca_agent(rca_id)
    
    async for event in agent.arun(
        prompt, 
        session_state={"screen_context": context_block},
        stream=True,
        stream_intermediate_steps=True
    ):
        content = ""
        if hasattr(event, "content") and event.content:
            content = event.content
        elif isinstance(event, str):
            content = event
            
        if content:
            # Filtro para ver apenas o progresso técnico relevante
            if "get_skill_reference" in str(content):
                print("\n[DEBUG] Chamando referência da Skill...")
            if not any(kw in str(content) for kw in ["Transferring", "completed in"]):
                print(content, end="", flush=True)

    print("\n" + "=" * 60)
    print("🏁 Teste de Ishikawa concluído.")

if __name__ == "__main__":
    os.environ["AGNO_DEBUG"] = "True"
    asyncio.run(test_ishikawa_generation())
