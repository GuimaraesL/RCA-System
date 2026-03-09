import asyncio
import sys
from pathlib import Path

# Adiciona o diretório raiz ao sys.path para importar core
sys.path.append(str(Path(__file__).parent.parent))

from core.knowledge import rca_history_knowledge, embedder

async def test_proven_no_chunking():
    log_path = Path("rag_test_result.txt")
    print(f"Iniciando Prova Real de Integridade (Bypass Chunking). Resultados em {log_path}")
    
    with open(log_path, "w", encoding="utf-8") as f:
        f.write("RELATÓRIO DE INTEGRIDADE RAG\n")
        f.write("=" * 30 + "\n")
    
    target_rca_id = "test-atomic-rca"
    
    # 2. Gera Conteúdo Real (Lógica exata do core)
    # Copiado de knowledge.py para garantir paridade total
    rca_data = {
        "rca_id": target_rca_id,
        "area_id": "AREA001",
        "equipment_id": "EQUIP001",
        "subgroup_id": "SUBG001",
        "asset": {
            "area_name": "Área de Produção Principal",
            "equipment_name": "Máquina de Embalagem X",
            "subgroup_name": "Sistema de Alimentação"
        },
        "component_type": "Sensor de Proximidade",
        "what": "Falha intermitente no sensor de proximidade da esteira de embalagem.",
        "problem_description": "O sensor de proximidade da esteira de embalagem X apresenta falhas intermitentes, resultando em paradas não programadas e redução da produtividade. A falha ocorre aleatoriamente, dificultando o diagnóstico. Observou-se que a falha é mais comum em períodos de alta umidade.",
        "root_causes": [
            {"cause": "Degradação do isolamento do cabo do sensor devido à umidade."},
            {"cause": "Acúmulo de sujeira e poeira no sensor, afetando sua leitura."},
            {"cause": "Vibração excessiva na estrutura da máquina, causando mau contato."}
        ],
        "action_plans": [
            {"action_title": "Substituição do sensor de proximidade por modelo selado."},
            {"action_title": "Implementação de rotina de limpeza semanal do sensor."},
            {"action_title": "Verificação e reforço da estrutura de montagem do sensor."}
        ]
    }

    area_id = rca_data.get('area_id', "")
    equip_id = rca_data.get('equipment_id', "")
    subg_id = rca_data.get('subgroup_id', "")
    asset_dict = rca_data.get('asset', {})
    area_label = asset_dict.get('area_name') or area_id
    equip_label = asset_dict.get('equipment_name') or equip_id
    subg_label = asset_dict.get('subgroup_name') or subg_id
    comp_type = rca_data.get('component_type')

    location_parts = []
    if area_label: location_parts.append(f"na área {area_label}")
    if equip_label: location_parts.append(f"afetando o equipamento {equip_label}")
    if subg_label: location_parts.append(f"com impacto focado no subgrupo {subg_label}")
    if comp_type: location_parts.append(f"no componente {comp_type}")

    content_parts = []
    if location_parts:
        content_parts.append(f"LOCALIZAÇÃO DO ATIVO: O incidente ocorreu {', '.join(location_parts)}.")
    
    what_desc = rca_data.get('what')
    if what_desc: content_parts.append(f"RESUMO DO PROBLEMA: {what_desc}")
    
    problem_desc = rca_data.get('problem_description', rca_data.get('description'))
    if problem_desc: content_parts.append(f"DESCRIÇÃO TÉCNICA (SINTOMAS): {problem_desc}")
    
    causes = [c.get('cause', '') for c in rca_data.get('root_causes', [])]
    if causes: content_parts.append(f"CAUSAS RAIZ: " + " | ".join(causes))
        
    actions = [a.get('action_title', '') for a in rca_data.get('action_plans', [])] if 'action_plans' in rca_data else []
    if not actions: actions = [a.get('action_title', '') for a in rca_data.get('action_plans', [])]
    if actions: content_parts.append(f"AÇÕES DO PLANO: " + " | ".join(actions))
    
    content = "\n\n".join(content_parts).strip()
    
    print(f"Original Length: {len(content)}")

    # 2. Indexa via add_content (que agora usa nosso leitor global de 50k)
    print("Inserindo via add_content...")
    rca_history_knowledge.add_content(
        text_content=content,
        name=target_rca_id,
        metadata={"rca_id": target_rca_id},
        upsert=True
    )

    # 4. Recupera e Valida
    print("\n--- RESULTADO NO CHROMADB ---")
    results = rca_history_knowledge.vector_db.search(query=target_rca_id, limit=1)
    
    if results:
        doc = results[0]
        with open(log_path, "a", encoding="utf-8") as f:
            f.write(f"Original Length: {len(content)}\n")
            f.write(f"Stored Length:   {len(doc.content)}\n")
            
            diff = abs(len(doc.content) - len(content))
            if diff <= 2:
                f.write("\n[VITORIA] INTEGRIDADE CONFIRMADA. Sem fatiamento.\n")
            else:
                f.write(f"\n[ERRO] O Agno ainda está fatiando! Diferença de {diff} caracteres.\n")
                f.write(f"TRECHO NO BANCO:\n{doc.content[:100]}...{doc.content[-100:]}\n")
    else:
        with open(log_path, "a", encoding="utf-8") as f:
            f.write("Erro: Documento não encontrado no VectorDB.\n")

if __name__ == "__main__":
    asyncio.run(test_proven_no_chunking())
