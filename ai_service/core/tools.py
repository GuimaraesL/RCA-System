import os
import glob
import json
import httpx
from agno.utils.log import logger
from .config import BACKEND_URL, INTERNAL_AUTH_KEY
from .knowledge import get_fmea_knowledge

from agno.run import RunContext

def get_current_screen_context(run_context: RunContext):
    """
    Retorna os dados que o usuário está vendo na tela no exato momento da requisição.
    Use esta ferramenta SEMPRE que precisar identificar o Ativo, o Título ou a Descrição do incidente ATUAL.
    """
    if run_context.session_state and "screen_context" in run_context.session_state:
        return f"[DADOS ATUAIS DA TELA]:\n{run_context.session_state['screen_context']}"
    return "Nenhum contexto dinâmico foi passado para esta sessão no session_state."

def get_asset_fmea_tool(query: str):
    """
    Busca modos de falha mapeados para este ativo na biblioteca técnica FMEA do sistema.
    Realiza uma busca semântica em todos os manuais (.md) carregados.
    Use esta ferramenta quando precisar de informações sobre falhas conhecidas, causas e ações recomendadas para uma FAMÍLIA de equipamentos ou um ativo específico.
    
    Args:
        query (str): Termos de busca (ex: 'Motores DC', 'Redutores de engrenagem', 'vazamento retentor').
    """
    logger.debug(f"get_asset_fmea_tool chamado com consulta: '{query}'")
    
    try:
        knowledge_base = get_fmea_knowledge()
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
        logger.error(f"[get_asset_fmea_tool] query={query}: {e}")
        return f"ERRO_FERRAMENTA: {type(e).__name__} ao consultar a biblioteca FMEA."

def get_full_rca_detail_tool(rca_id: str):
    """
    Busca o conteúdo INTEGRAL e DETERMINÍSTICO de uma RCA e seus Gatilhos vinculados por ID.
    Use esta ferramenta quando encontrar um ID relevante no RAG e precisar de 100% de precisão para confronto de dados,
    incluindo Ishikawa, 5 Porquês, Planos de Ação (Status/Prazos) e Gatilhos (Triggers).
    """
    logger.debug(f"get_full_rca_detail_tool chamado para RCA {rca_id}")
    try:
        # Busca RCA
        headers = {"x-internal-key": INTERNAL_AUTH_KEY}
        with httpx.Client(base_url=BACKEND_URL, timeout=10.0, headers=headers) as client:
            rca_res = client.get(f"/api/rcas/{rca_id}")
            if rca_res.status_code != 200:
                return f"ERRO_FERRAMENTA: Falha ao buscar RCA {rca_id} no backend principal."
            
            rca_data = rca_res.json()
            
            # Poda recursiva para economizar tokens
            def prune_json(obj, depth=0):
                if isinstance(obj, list):
                    return [prune_json(i, depth + 1) for i in obj]
                if isinstance(obj, dict):
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
            
            return f"CONTEÚDO DA RCA {rca_id} (OTIMIZADO):\n\n" + json.dumps(full_context, indent=2, ensure_ascii=False)
            
    except Exception as e:
        logger.error(f"[get_full_rca_detail_tool] rca_id={rca_id}: {e}")
        return f"ERRO_FERRAMENTA: {type(e).__name__} ao detalhar a RCA {rca_id}."

def search_historical_rcas_tool(query: str, run_context: RunContext, subgroup_id: str = None, equipment_id: str = None, area_id: str = None, search_scope: str = "auto"):
    """
    Busca RCAs históricas usando a estratégia hierárquica (Subgrupo > Equipamento > Área).
    Utiliza o contexto integral bruto da tela para garantir a mesma assertividade da API original.

    Args:
        query (str): Sugestão de busca da IA.
        run_context (RunContext): Contexto para extração automática de IDs e dados da tela.
        subgroup_id (str, optional): ID do subgrupo.
        equipment_id (str, optional): ID do equipamento.
        area_id (str, optional): ID da área.
        search_scope (str): 'auto' realiza a busca hierárquica completa.
    """
    logger.debug(f"search_historical_rcas_tool chamado")
    
    # --- EXTRAÇÃO DE CONTEXTO INTEGRAL (EXATAMENTE COMO VEM DA TELA) ---
    raw_screen_context = ""
    
    if run_context.session_state and "screen_context" in run_context.session_state:
        raw_screen_context = run_context.session_state["screen_context"]
        try:
            # Tenta parsear para extrair os IDs de segurança
            ctx_str = raw_screen_context
            if isinstance(ctx_str, str) and "{" in ctx_str:
                clean_ctx = ctx_str.replace("[DADOS ATUAIS DA TELA]:\n", "").strip()
                ctx_data = json.loads(clean_ctx)
                
                # Extrai da raiz ou do nó 'hierarchy' (Padrão do Frontend)
                hierarchy = ctx_data.get("hierarchy", {})
                area_id = area_id or ctx_data.get("area_id") or hierarchy.get("area")
                equipment_id = equipment_id or ctx_data.get("equipment_id") or hierarchy.get("equipment")
                subgroup_id = subgroup_id or ctx_data.get("subgroup_id") or hierarchy.get("subgroup")
                
            elif isinstance(raw_screen_context, dict):
                ctx_data = raw_screen_context
                hierarchy = ctx_data.get("hierarchy", {})
                area_id = area_id or ctx_data.get("area_id") or hierarchy.get("area")
                equipment_id = equipment_id or ctx_data.get("equipment_id") or hierarchy.get("equipment")
                subgroup_id = subgroup_id or ctx_data.get("subgroup_id") or hierarchy.get("subgroup")
                raw_screen_context = json.dumps(raw_screen_context, ensure_ascii=False)
        except Exception as e:
            logger.warning(f"[search_historical_rcas_tool] Falha ao processar contexto JSON: {e}")

    # A query de busca vetorial DEVE ser o contexto bruto completo, 
    # exatamente como era feito antes para capturar toda a semântica.
    search_query = raw_screen_context.strip() if raw_screen_context else query
    if search_query and not search_query.startswith("[DADOS ATUAIS DA TELA]:"):
        search_query = f"[DADOS ATUAIS DA TELA]:\n{search_query}"

    if not area_id:
        return "ERRO_FERRAMENTA: Não foi possível identificar a Manufatura (Área). Informe o Ativo primeiro."

    from services.rag_service import search_hierarchical, validate_recurrences
    
    # EXTRAÇÃO DO ID DA RCA ATUAL PARA FILTRAGEM
    current_rca_id = run_context.session_id if run_context and run_context.session_id else None

    try:
        subgroup_matches, equipment_matches, area_matches = search_hierarchical(
            query_text=search_query,
            subgroup_id=subgroup_id,
            equipment_id=equipment_id,
            area_id=area_id,
            current_rca_id=current_rca_id,
            limit_subgroup=15,
            limit_equipment=15,
            limit_area=20
        )

        all_candidates = subgroup_matches + equipment_matches + area_matches

        if not all_candidates:
            return f"Nenhuma recorrência técnica encontrada para o problema na Área: {area_id}."

        # ESTÁGIO 2: VALIDAÇÃO TÉCNICA
        _, _, val_text = validate_recurrences(search_query, all_candidates)
        
        return (
            f"### RECORRÊNCIAS HISTÓRICAS VALIDADAS (NA ÁREA {area_id}):\n"
            f"{val_text}\n\n"
            f"**NOTA PARA MÉTRICAS:** Use apenas as RCAs da categoria 'subgroup' para o cálculo de MTBF real do Ativo. "
            f"As demais servem para inteligência de modo de falha transversal."
        )
        
    except Exception as e:
        logger.error(f"[search_historical_rcas_tool] query={query}: {e}")
        return f"ERRO_FERRAMENTA: Falha no motor de busca hierárquica (RAG)."

def get_historical_rca_summary(rca_id: str) -> str:
    """
    Busca o RESUMO de uma RCA histórica (O que, Onde, Quando, Quem, Impacto e Descrição do Problema).
    Use para entender o contexto básico de uma falha passada antes de se aprofundar.
    """
    try:
        headers = {"x-internal-key": INTERNAL_AUTH_KEY}
        with httpx.Client(base_url=BACKEND_URL, timeout=5.0, headers=headers) as client:
            res = client.get(f"/api/rcas/{rca_id}")
            if res.status_code != 200: return f"ERRO_FERRAMENTA: RCA {rca_id} não encontrada."
            data = res.json()
            
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
    except Exception as e:
        logger.error(f"[get_historical_rca_summary] rca_id={rca_id}: {e}")
        return f"ERRO_FERRAMENTA: Falha ao obter resumo da RCA {rca_id}."

def get_historical_rca_causes(rca_id: str) -> str:
    """
    Busca apenas a CAUSA RAIZ e os DIAGNÓSTICOS (Ishikawa/5 Porquês) de uma RCA histórica.
    Use quando você já sabe qual é a RCA e quer saber o que causou o problema na época.
    """
    try:
        headers = {"x-internal-key": INTERNAL_AUTH_KEY}
        with httpx.Client(base_url=BACKEND_URL, timeout=5.0, headers=headers) as client:
            res = client.get(f"/api/rcas/{rca_id}")
            if res.status_code != 200: return f"ERRO_FERRAMENTA: RCA {rca_id} não encontrada."
            data = res.json()
            
            causes = data.get("root_causes", [])
            return f"CAUSAS DA RCA {rca_id}:\n{json.dumps(causes, indent=2, ensure_ascii=False)}"
    except Exception as e:
        logger.error(f"[get_historical_rca_causes] rca_id={rca_id}: {e}")
        return f"ERRO_FERRAMENTA: Falha ao obter causas da RCA {rca_id}."

def get_historical_rca_action_plan(rca_id: str) -> str:
    """
    Busca apenas o PLANO DE AÇÃO e AÇÕES DE CONTENÇÃO de uma RCA histórica.
    Use para saber o que foi feito na época para resolver o problema e verificar status.
    """
    try:
        headers = {"x-internal-key": INTERNAL_AUTH_KEY}
        with httpx.Client(base_url=BACKEND_URL, timeout=5.0, headers=headers) as client:
            # Tenta buscar do endpoint de ações primeiro (V2)
            actions_res = client.get(f"/api/actions?rca_id={rca_id}")
            actions_data = []
            if actions_res.status_code == 200:
                actions_data = actions_res.json()

            # Se a API de ações retornou dados, usa eles
            if actions_data and isinstance(actions_data, list) and len(actions_data) > 0:
                return f"PLANO DE AÇÃO DA RCA {rca_id}:\n{json.dumps(actions_data, indent=2, ensure_ascii=False)}"

            # Fallback para o legado
            res = client.get(f"/api/rcas/{rca_id}")
            if res.status_code != 200: return f"ERRO_FERRAMENTA: RCA {rca_id} não encontrada."
            data = res.json()

            plan = {
                "containment_actions": data.get("containment_actions", []),
                "root_cause_actions": [action for rc in data.get("root_causes", []) for action in rc.get("actions", [])],
                "human_reliability": data.get("human_reliability", [])
            }
            return f"PLANO DE AÇÃO DA RCA {rca_id}:\n{json.dumps(plan, indent=2, ensure_ascii=False)}"  
    except Exception as e:
        logger.error(f"[get_historical_rca_action_plan] rca_id={rca_id}: {e}")
        return f"ERRO_FERRAMENTA: Falha ao obter plano de ação da RCA {rca_id}."

def get_historical_rca_triggers(rca_id: str) -> str:
    """
    Busca os GATILHOS (Triggers) que iniciaram esta RCA histórica (ex: perdas financeiras, horas de máquina parada, multas).
    Use para entender o impacto financeiro e operacional que gerou a necessidade desta RCA.
    """
    try:
        headers = {"x-internal-key": INTERNAL_AUTH_KEY}
        with httpx.Client(base_url=BACKEND_URL, timeout=5.0, headers=headers) as client:
            res = client.get(f"/api/triggers/rca/{rca_id}")
            if res.status_code != 200: return f"ERRO_FERRAMENTA: Gatilhos da RCA {rca_id} não encontrados."
            data = res.json()
            return f"GATILHOS DA RCA {rca_id}:\n{json.dumps(data, indent=2, ensure_ascii=False)}"
    except Exception as e:
        logger.error(f"[get_historical_rca_triggers] rca_id={rca_id}: {e}")
        return f"ERRO_FERRAMENTA: Falha ao obter gatilhos da RCA {rca_id}."

def get_deterministic_fmea_tool(asset_id: str):
    """
    Busca modos de falha DETERMINÍSTICOS e ESTRUTURADOS cadastrados para o ID do ativo no banco de dados.
    Use esta ferramenta quando tiver o ID do equipamento para obter dados precisos de RPN, Severidade e Ocorrência.
    
    Args:
        asset_id (str): ID do ativo (equipamento) no sistema.
    """
    logger.debug(f"get_deterministic_fmea_tool chamado para Ativo: {asset_id}")
    
    try:
        headers = {"x-internal-key": INTERNAL_AUTH_KEY}
        with httpx.Client(base_url=BACKEND_URL, timeout=10.0, headers=headers) as client:
            res = client.get(f"/api/fmea/asset/{asset_id}")
            if res.status_code != 200:
                return f"ERRO_FERRAMENTA: Falha ao consultar banco de dados FMEA para o ativo {asset_id}."
            
            fmea_data = res.json()
            if not fmea_data:
                return f"O ativo {asset_id} não possui modos de falha cadastrados no banco de dados estruturado."
            
            return "MODOS DE FALHA ESTRUTURADOS (FMEA DB):\n\n" + json.dumps(fmea_data, indent=2, ensure_ascii=False)
            
    except Exception as e:
        logger.error(f"[get_deterministic_fmea_tool] asset_id={asset_id}: {e}")
        return f"ERRO_FERRAMENTA: Erro técnico ao consultar banco de dados FMEA."

def calculate_reliability_metrics_tool(rca_ids: list[str]):
    """
    Calcula indicadores de Confiabilidade (MTBF e MTTR) baseado em uma lista de IDs de RCAs passadas.
    Use esta ferramenta para quantificar a severidade da recorrência e a eficiência do reparo.
    
    Args:
        rca_ids (list[str]): Lista de IDs das RCAs que foram consideradas recorrências válidas.
    """
    from datetime import datetime
    
    logger.debug(f"calculate_reliability_metrics_tool chamado para {len(rca_ids)} RCAs.")
    
    if not rca_ids or len(rca_ids) < 2:
        return "ERRO_FERRAMENTA: Dados insuficientes para cálculo de métricas. São necessárias pelo menos 2 RCAs históricas validadas."
    
    dates = []
    downtimes = []
    headers = {"x-internal-key": INTERNAL_AUTH_KEY}
    
    try:
        with httpx.Client(base_url=BACKEND_URL, timeout=10.0, headers=headers) as client:
            for rid in rca_ids:
                res = client.get(f"/api/rcas/{rid}")
                if res.status_code == 200:
                    data = res.json()
                    
                    # Datas para MTBF
                    date_str = data.get('failure_date') or data.get('date') or data.get('created_at')
                    if date_str:
                        clean_date = date_str.split('T')[0]
                        try:
                            dt = datetime.strptime(clean_date, "%Y-%m-%d")
                            dates.append(dt)
                        except:
                            pass
                    
                    # Downtime para MTTR
                    dt_min = data.get('downtime_minutes')
                    if dt_min is not None:
                        try:
                            downtimes.append(float(dt_min))
                        except:
                            pass
        
        if len(dates) < 2:
            return "ERRO_FERRAMENTA: Não foi possível extrair datas suficientes para o cálculo de MTBF."
        
        dates.sort()
        intervals = []
        for i in range(1, len(dates)):
            diff = (dates[i] - dates[i-1]).days
            intervals.append(diff)
            
        mtbf = sum(intervals) / len(intervals)
        
        # Cálculo de MTTR (Mean Time To Repair)
        mttr_msg = "Dados de downtime insuficientes para cálculo de MTTR."
        if downtimes:
            mttr = sum(downtimes) / len(downtimes)
            mttr_msg = f"{mttr:.1f} minutos"
        
        result = (
            f"### INDICADORES DE CONFIABILIDADE\n"
            f"- **Amostra:** {len(dates)} falhas analisadas.\n"
            f"- **MTBF (Tempo Médio Entre Falhas):** {mtbf:.1f} dias.\n"
            f"- **MTTR (Tempo Médio para Reparo):** {mttr_msg}.\n"
            f"- **Disponibilidade Estimada:** {(mtbf * 1440 / (mtbf * 1440 + (sum(downtimes)/len(downtimes) if downtimes else 0))) * 100:.2f}% (Baseado em MTBF/MTTR)\n\n"
            f"*Nota: Cálculos baseados em dados históricos validados.*"
        )
        return result
        
    except Exception as e:
        logger.error(f"[calculate_reliability_metrics_tool] rca_ids={rca_ids}: {e}")
        return f"ERRO_FERRAMENTA: Falha técnica ao calcular métricas de confiabilidade."
