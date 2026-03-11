import os
import glob
import json
import httpx
from .config import BACKEND_URL
from .knowledge import get_fmea_knowledge

def get_asset_fmea_tool(query: str):
    """
    Busca modos de falha mapeados para este ativo na biblioteca técnica FMEA do sistema.
    Realiza uma busca semântica em todos os manuais (.md) carregados.
    Use esta ferramenta quando precisar de informações sobre falhas conhecidas, causas e ações recomendadas para uma FAMÍLIA de equipamentos ou um ativo específico.
    
    Args:
        query (str): Termos de busca (ex: 'Motores DC', 'Redutores de engrenagem', 'vazamento retentor').
    """
    print(f"DEBUG TOOL: get_asset_fmea_tool chamado com consulta: '{query}'")
    
    knowledge_base = get_fmea_knowledge()
    
    try:
        # Busca por similaridade no banco vetorial (RAG)
        results = knowledge_base.vector_db.search(query=query, limit=5)
        
        if not results:
            return (
                f"Nenhuma informação técnica específica encontrada para '{query}' na biblioteca de FMEA. "
                "Sugira causas baseadas na sua experiência técnica geral de engenharia para este tipo de ativo."
            )
            
        formatted_results = []
        for doc in results:
            filename = doc.meta_data.get("filename", "Manual Desconhecido")
            formatted_results.append(f"--- FONT: {filename} ---\n{doc.content}")
            
        return "CONHECIMENTO FMEA ENCONTRADO:\n\n" + "\n\n".join(formatted_results)
        
    except Exception as e:
        print(f"Erro ao realizar busca vetorial FMEA: {e}")
        return f"Erro técnico ao consultar a biblioteca FMEA: {str(e)}"

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
            asset = doc.meta_data.get("asset", "N/A")
            
            # Extrai apenas titulo e causa para o resumo (economiza tokens)
            title = "Sem titulo"
            cause = "Causa nao identificada"
            for line in doc.content.split('\n'):
                if "TITULO/O QUE" in line or "TÍTULO/O QUE" in line: 
                    title = line.split(":", 1)[-1].strip() if ":" in line else line.strip()
                if "CAUSAS RAIZ" in line: 
                    cause = line.split(":", 1)[-1].strip()[:150] if ":" in line else line.strip()[:150]

            formatted_results.append(
                f"- ID: {rid} | Ativo: {asset} | Nivel: {level_found.upper()}\n"
                f"  Titulo: {title}\n"
                f"  Causa: {cause}"
            )
            
        return "RCAS HISTORICAS (RESUMO - use get_full_rca_detail_tool para detalhes):\n\n" + "\n".join(formatted_results)
    except Exception as e:
        return f"Erro ao realizar a busca RAG: {str(e)}"

def get_historical_rca_summary(rca_id: str) -> str:
    """
    Busca o RESUMO de uma RCA histórica (O que, Onde, Quando, Quem, Impacto e Descrição do Problema).
    Use para entender o contexto básico de uma falha passada antes de se aprofundar.
    """
    try:
        with httpx.Client(base_url=BACKEND_URL, timeout=5.0) as client:
            res = client.get(f"/api/rcas/{rca_id}")
            if res.status_code != 200: return f"RCA {rca_id} não encontrada."
            data = res.json()
            
            # Extrair todas as datas possíveis para garantir precisão
            data_criacao = data.get('created_at', 'N/A')
            data_ocorrencia = data.get('date', data_criacao)
            data_atualizacao = data.get('updated_at', 'N/A')
            
            return (
                f"RCA {rca_id} - {data.get('what', 'N/A')}\n"
                f"Ativo: {data.get('asset_name_display', data.get('asset', 'N/A'))}\n"
                f"Data da Ocorrência: {data_ocorrencia}\n"
                f"Data de Criação do Relatório: {data_criacao}\n"
                f"Última Atualização: {data_atualizacao}\n"
                f"Quem: {data.get('who', 'N/A')}\n"
                f"Onde: {data.get('where_description', 'N/A')}\n"
                f"Status: {data.get('status', 'N/A')}\n"
                f"Tipo de Análise: {data.get('analysis_type', 'N/A')}\n"
                f"Descrição: {data.get('problem_description', data.get('description', 'N/A'))}"
            )
    except Exception as e: return str(e)

def get_historical_rca_causes(rca_id: str) -> str:
    """
    Busca apenas a CAUSA RAIZ e os DIAGNÓSTICOS (Ishikawa/5 Porquês) de uma RCA histórica.
    Use quando você já sabe qual é a RCA e quer saber o que causou o problema na época.
    """
    try:
        with httpx.Client(base_url=BACKEND_URL, timeout=5.0) as client:
            res = client.get(f"/api/rcas/{rca_id}")
            if res.status_code != 200: return f"RCA {rca_id} não encontrada."
            data = res.json()
            
            # Filtra apenas a parte de causas
            causes = data.get("root_causes", [])
            import json
            return f"CAUSAS DA RCA {rca_id}:\n{json.dumps(causes, indent=2, ensure_ascii=False)}"
    except Exception as e: return str(e)

def get_historical_rca_action_plan(rca_id: str) -> str:
    """
    Busca apenas o PLANO DE AÇÃO e AÇÕES DE CONTENÇÃO de uma RCA histórica.
    Use para saber o que foi feito na época para resolver o problema e verificar status.
    """
    try:
        with httpx.Client(base_url=BACKEND_URL, timeout=5.0) as client:
            # Tenta buscar do endpoint de ações primeiro (V2)
            actions_res = client.get(f"/api/actions?rca_id={rca_id}")
            actions_data = []
            if actions_res.status_code == 200:
                actions_data = actions_res.json()

            # Se a API de ações retornou dados, usa eles
            if actions_data and isinstance(actions_data, list) and len(actions_data) > 0:
                import json
                return f"PLANO DE AÇÃO DA RCA {rca_id}:\n{json.dumps(actions_data, indent=2, ensure_ascii=False)}"

            # Fallback para o legado
            res = client.get(f"/api/rcas/{rca_id}")
            if res.status_code != 200: return f"RCA {rca_id} não encontrada."
            data = res.json()

            plan = {
                "containment_actions": data.get("containment_actions", []),
                "root_cause_actions": [action for rc in data.get("root_causes", []) for action in rc.get("actions", [])],
                "human_reliability": data.get("human_reliability", [])
            }
            import json
            return f"PLANO DE AÇÃO DA RCA {rca_id}:\n{json.dumps(plan, indent=2, ensure_ascii=False)}"  
    except Exception as e: return str(e)

def get_historical_rca_triggers(rca_id: str) -> str:
    """
    Busca os GATILHOS (Triggers) que iniciaram esta RCA histórica (ex: perdas financeiras, horas de máquina parada, multas).
    Use para entender o impacto financeiro e operacional que gerou a necessidade desta RCA.
    """
    try:
        with httpx.Client(base_url=BACKEND_URL, timeout=5.0) as client:
            res = client.get(f"/api/triggers/rca/{rca_id}")
            if res.status_code != 200: return f"Não foram encontrados gatilhos atrelados à RCA {rca_id}."
            data = res.json()
            import json
            return f"GATILHOS DA RCA {rca_id}:\n{json.dumps(data, indent=2, ensure_ascii=False)}"
    except Exception as e: return str(e)
