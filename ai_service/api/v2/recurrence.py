"""
Proposta: Gerenciar a busca e persistência de recorrências de RCAs.
Fluxo: Realiza busca hierárquica (RAG) e validação técnica via LLM, salvando os resultados.
Utiliza a ferramenta get_current_screen_context para alinhar a query com a visão do agente.
"""
from fastapi import APIRouter, Header, HTTPException
import secrets
import json
from datetime import datetime
from agno.utils.log import logger
from agno.run import RunContext

from core.config import INTERNAL_AUTH_KEY
from core.knowledge import get_recurrence_analysis, save_recurrence_analysis
from api.models import AnalysisRequest
from services.rag_service import search_hierarchical, validate_recurrences
from core.tools import get_current_screen_context
from api.v2.analysis import normalize_language

router = APIRouter()

@router.get("/{rca_id}")
async def get_recurrence_endpoint(rca_id: str, x_internal_key: str = Header(None)):
    """Busca a última análise de recorrência salva para uma RCA."""
    if not secrets.compare_digest(x_internal_key or '', INTERNAL_AUTH_KEY):
        raise HTTPException(status_code=403, detail="Invalid Internal Key")
    
    result = get_recurrence_analysis(rca_id)
    if not result:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return result

@router.post("")
async def analyze_recurrence_on_demand(request: AnalysisRequest, x_internal_key: str = Header(None)):
    """
    Realiza a busca e validação de recorrências sob demanda (RAG de 2 Estágios).
    Utiliza a própria ferramenta de contexto para gerar a query de busca.
    """
    if not secrets.compare_digest(x_internal_key or '', INTERNAL_AUTH_KEY):
        raise HTTPException(status_code=403, detail="Invalid Internal Key")

    return await _run_recurrence_analysis(request)

async def _run_recurrence_analysis(request: AnalysisRequest):
    """Lógica de negócio interna para análise de recorrência (sem validação de chave)."""
    # 1. Extração de Dados Básicos
    area_id = request.area_id
    equipment_id = request.equipment_id
    subgroup_id = request.subgroup_id
    asset_info = "Ativo não identificado explicitamente"

    if request.context:
        try:
            ctx = json.loads(request.context)
            area_id = area_id or ctx.get('area_id')
            equipment_id = equipment_id or ctx.get('equipment_id')
            subgroup_id = subgroup_id or ctx.get('subgroup_id')
            asset_info = ctx.get('asset_display', asset_info)
        except Exception as e:
            logger.warning(f"[_run_recurrence_analysis] Falha ao parsear contexto JSON: {e}")

    # 2. Geração da Query Alinhada com o Chat (Referência Oficial)
    query_text = f"[DADOS ATUAIS DA TELA]:\nAtivo: {asset_info}\n{request.context}"

    if not query_text:
        raise HTTPException(status_code=400, detail="Não foi possível gerar o contexto de busca.")

    # 3. Busca Hierárquica (RAG Estágio 1)
    # Usa os limites padrão agora atualizados para (15, 15, 20) na assinatura
    subgroup_matches, equipment_matches, area_matches = search_hierarchical(
        query_text=query_text,
        subgroup_id=subgroup_id,
        equipment_id=equipment_id,
        area_id=area_id,
        current_rca_id=str(request.rca_id)
    )

    all_candidates = subgroup_matches + equipment_matches + area_matches
    if not all_candidates:
        return {
            "subgroup_matches": [],
            "equipment_matches": [],
            "area_matches": [],
            "discarded_matches": []
        }

    # 4. Validação Técnica (RAG Estágio 2)
    ui_lang = normalize_language(request.ui_language)
    valid_ids, discarded_ids, _ = validate_recurrences(query_text, all_candidates, language=ui_lang)

    def enrich_and_filter(matches):
        enriched = []
        for m in matches:
            if m.rca_id in valid_ids:
                d = m.model_dump()
                d["validation_reason"] = valid_ids[m.rca_id]
                enriched.append(d)
        return enriched

    discarded_list = []
    for m in all_candidates:
        if m.rca_id in discarded_ids:
            d = m.model_dump()
            d["discard_reason"] = discarded_ids[m.rca_id]
            discarded_list.append(d)

    # 4.5. Interconexão Semântica (Neural Mesh)
    # Selecionamos apenas os candidatos validados para criar a malha neural (opcional: ou todos?)
    # Decisão: Usar apenas os candidatos validados para manter a malha limpa e relevante.
    valid_candidates = []
    for m in all_candidates:
        if m.rca_id in valid_ids:
            valid_candidates.append(m)
    
    semantic_mesh = []
    if len(valid_candidates) >= 2:
        try:
            from services.rag_service import calculate_semantic_links
            semantic_mesh = calculate_semantic_links(valid_candidates)
        except Exception as e:
            logger.error(f"Erro ao calcular malha semântica: {e}")

    analysis_result = {
        "subgroup_matches": enrich_and_filter(subgroup_matches),
        "equipment_matches": enrich_and_filter(equipment_matches),
        "area_matches": enrich_and_filter(area_matches),
        "discarded_matches": discarded_list,
        "semantic_links": [link.model_dump() for link in semantic_mesh]
    }
    
    # 5. Persistência
    try:
        save_recurrence_analysis(str(request.rca_id), analysis_result)
        analysis_result["last_analyzed_at"] = datetime.now().isoformat()
    except Exception as e:
        logger.error(f"Erro ao salvar analise de recorrencia na V2: {e}")

    return analysis_result
