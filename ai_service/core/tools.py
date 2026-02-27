import httpx
from .config import BACKEND_URL

def get_asset_fmea_tool(equipment_id: str):
    """
    Busca modos de falha mapeados para este equipamento no FMEA do sistema.
    Use esta ferramenta quando precisar de base técnica sobre falhas conhecidas de um ativo.
    """
    print(f"DEBUG TOOL: get_asset_fmea_tool chamado para equipamento {equipment_id}")
    # Retornamos mensagem informativa para evitar alucinação enquanto o FMEA não é populado.
    return f"Nota: Não foram encontrados registros de FMEA para o Ativo ID {equipment_id} no Banco de Dados. Sugira causas baseadas na sua experiência geral."

def get_full_rca_detail_tool(rca_id: str):
    """
    Busca o conteúdo INTEGRAL e DETERMINÍSTICO de uma RCA e seus Gatilhos vinculados por ID.
    Use esta ferramenta quando encontrar um ID relevante no RAG e precisar de 100% de precisão para confronto de dados,
    incluindo Ishikawa, 5 Porquês, Planos de Ação (Status/Prazos) e Gatilhos (Triggers).
    """
    print(f"DEBUG TOOL: get_full_rca_detail_tool chamado para RCA {rca_id}")
    try:
        # Busca RCA
        with httpx.Client(base_url=BACKEND_URL, timeout=10.0) as client:
            rca_res = client.get(f"/api/rcas/{rca_id}")
            if rca_res.status_code != 200:
                return f"Erro ao buscar RCA {rca_id}: {rca_res.text}"
            
            rca_data = rca_res.json()
            
            # Poda recursiva para economizar tokens
            def prune_json(obj, depth=0):
                if isinstance(obj, list):
                    return [prune_json(i, depth + 1) for i in obj]
                if isinstance(obj, dict):
                    # Mantemos chaves úteis mesmo que pareçam técnicas, para não quebrar correlações
                    # 'actions' e 'plan' são cruciais, não devem ser removidos.
                    # Removemos apenas o que é comprovadamente ruído sistêmico.
                    skip_keys = {"created_at", "updated_at", "deleted_at", "_id"} 
                    return {k: prune_json(v, depth + 1) for k, v in obj.items() if k not in skip_keys}
                return obj

            pruned_rca = prune_json(rca_data)
            
            # Busca Triggers vinculados
            triggers_res = client.get(f"/api/triggers/rca/{rca_id}")
            triggers_data = triggers_res.json() if triggers_res.status_code == 200 else []
            pruned_triggers = prune_json(triggers_data)
            
            # Consolida a resposta para o agente
            full_context = {
                "DADOS_DA_RCA": pruned_rca,
                "GATILHOS_VINCULADOS": pruned_triggers,
                "ESTRUTURA_DE_DADOS": {
                    "ACOES_CONTENCAO": "Disponíveis em 'containment_actions'.",
                    "ACOES_CORRETIVAS": "Disponíveis dentro de 'root_causes' -> 'actions'.",
                    "CONFIABILIDADE_HUMANA": "Planos de ação específicos em 'human_reliability'."
                }
            }
            
            import json
            return f"CONTEÚDO DA RCA {rca_id} (OTIMIZADO):\n\n" + json.dumps(full_context, indent=2, ensure_ascii=False)
            
    except Exception as e:
        return f"Erro na comunicação com o backend para detalhamento da RCA: {str(e)}"

def search_historical_rcas_tool(query: str, subgroup_id: str = None, equipment_id: str = None, area_id: str = None, search_scope: str = "auto"):
    """
    Busca RCAs históricas no banco vetorial (conhecimento coletivo) por similaridade semântica.
    ESTA FERRAMENTA RETORNA APENAS O 'MAPA'. Use get_full_rca_detail_tool para ver o conteúdo completo do ID encontrado.

    Args:
        query (str): Termo de busca (ex: 'vazamento de óleo', 'falha rolamento').
        subgroup_id (str, optional): ID do subgrupo para busca restrita.
        equipment_id (str, optional): ID do equipamento para busca restrita.
        area_id (str, optional): ID da área para busca restrita.
        search_scope (str): 'auto' (segue hierarquia Subgrupo > Equipamento > Área), 
                          'subgroup', 'equipment' ou 'area' para busca fixa em um nível.
    """
    print(f"DEBUG TOOL: search_historical_rcas_tool chamado com query='{query}', scope='{search_scope}'")
    from .knowledge import get_rca_history_knowledge
    knowledge_base = get_rca_history_knowledge()
    
    # Define a ordem de fallback se o escopo for 'auto'
    hierarchy_configs = [
        ("subgroup", subgroup_id),
        ("equipment", equipment_id),
        ("area", area_id)
    ]
    
    results = []
    level_found = "Geral"
    
    try:
        if search_scope == "auto":
            # Tenta do mais específico para o mais abrangente
            for level_name, level_id in hierarchy_configs:
                if level_id:
                    filters = {f"{level_name}_id": str(level_id)}
                    res = knowledge_base.vector_db.search(query=query, limit=5, filters=filters)
                    if res:
                        results = res
                        level_found = level_name
                        break
            
            # Se ainda não houver resultados e nenhum ID foi passado, faz busca global
            if not results:
                results = knowledge_base.vector_db.search(query=query, limit=5)
        else:
            # Busca em escopo específico solicitado pelo agente
            target_id = None
            if search_scope == "subgroup": target_id = subgroup_id
            elif search_scope == "equipment": target_id = equipment_id
            elif search_scope == "area": target_id = area_id
            
            filters = {f"{search_scope}_id": str(target_id)} if target_id else None
            results = knowledge_base.vector_db.search(query=query, limit=5, filters=filters)
            level_found = search_scope

        if not results:
            return f"Nenhuma RCA histórica foi encontrada no RAG para a busca: '{query}' dentro do escopo '{search_scope}'."
            
        formatted_results = []
        for doc in results:
            rid = doc.meta_data.get("rca_id", "Desconhecido")
            # Retorna o conteúdo COMPLETO da RCA formatada no knowledge.py
            formatted_results.append(
                f"--- RCA ID: {rid} (Similaridade encontrada no nível: {level_found.upper()}) ---\n"
                f"{doc.content.strip()}"
            )
            
        return "RCAS HISTÓRICAS ENCONTRADAS (DADOS COMPLETOS):\n\n" + "\n\n".join(formatted_results)
    except Exception as e:
        return f"Erro ao realizar a busca RAG: {str(e)}"
