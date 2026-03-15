"""
Proposta: Endpoint principal do motor de análise RCA (Copiloto) na V2.
Fluxo: Recebe o contexto de falha -> Realiza busca de recorrência (inline como na v1) -> Processa entrada multimodal -> Executa agente (main_agent) -> Retorna stream SSE.
"""
import os
import json
import secrets
import httpx
import re
from fastapi import APIRouter, Header, HTTPException
from fastapi.responses import StreamingResponse
from agno.utils.log import logger
from agno.media import Image, Video
from datetime import datetime

from core.config import INTERNAL_AUTH_KEY, AGENT_MEMORY_PATH, BACKEND_URL
from core.knowledge import save_recurrence_analysis
from api.models import AnalysisRequest, RecurrenceInfo
from services.rag_service import search_hierarchical, validate_recurrences

router = APIRouter()

@router.post("")
async def analyze_rca(request: AnalysisRequest, x_internal_key: str = Header(None)):
    if not secrets.compare_digest(x_internal_key or '', INTERNAL_AUTH_KEY):
        raise HTTPException(status_code=403, detail="Invalid Internal Key")

    try:
        os.makedirs(os.path.dirname(AGENT_MEMORY_PATH), exist_ok=True)

        area_id = request.area_id
        equipment_id = request.equipment_id
        subgroup_id = request.subgroup_id
        asset_info = "Ativo não identificado explicitamente"

        # 2. Se for uma análise nova (não salva ainda), capturar do contexto
        query_text = ""
        if request.context:
            try:
                ctx = json.loads(request.context)
                # Prioriza o asset_display do contexto se os IDs ainda forem nulos (novo RCA)
                if asset_info == "Ativo não identificado explicitamente":
                    asset_info = ctx.get('asset_display', asset_info)

                # Captura IDs do contexto se vierem da interface (Novo RCA)
                area_id = area_id or ctx.get('area_id')
                equipment_id = equipment_id or ctx.get('equipment_id')
                subgroup_id = subgroup_id or ctx.get('subgroup_id')
            except Exception as e:
                logger.warning(f"[analyze_rca] Falha ao parsear contexto JSON: {e}")
            
            # Alinhamento de Query: Usar o formato estruturado oficial
            query_text = f"[DADOS ATUAIS DA TELA]:\nAtivo: {asset_info}\n{request.context}"

        # Se for apenas para buscar os metadados (persistência de estado do banner) e pular o Agent
        if request.metadata_only:
            from .recurrence import _run_recurrence_analysis
            return await _run_recurrence_analysis(request)

        # 3. Busca Hierárquica de Recorrências usando o RAG Service centralizado (Apenas para o Agente)
        subgroup_matches, equipment_matches, area_matches = [], [], []
        if query_text:
            subgroup_matches, equipment_matches, area_matches = search_hierarchical(
                query_text=query_text,
                subgroup_id=subgroup_id,
                equipment_id=equipment_id,
                area_id=area_id,
                current_rca_id=str(request.rca_id)
            )

        # Lógica de análise completa (streaming)
        recurrences = subgroup_matches + equipment_matches + area_matches
        ui_lang = request.ui_language or "Português-BR"
        is_initial_analysis = not (request.user_prompt and str(request.user_prompt).strip())

        images = []
        videos = []
        if request.attachments and is_initial_analysis:
            async with httpx.AsyncClient() as client:
                for att in request.attachments:
                    media_url = att.url
                    if media_url.startswith('/'):
                        base = BACKEND_URL.rstrip('/')
                        media_url = f"{base}{media_url}"
                    try:
                        resp = await client.get(media_url, headers={"x-internal-key": INTERNAL_AUTH_KEY}, timeout=30.0)
                        if resp.status_code == 200:
                            if att.type == 'image':
                                images.append(Image(content=resp.content))
                            elif att.type == 'video':
                                videos.append(Video(content=resp.content))
                    except Exception as media_err:
                        logger.error(f"Falha ao baixar midia {media_url}: {media_err}")

        context_block = ""
        if request.context:
            context_block += f"Ativo: {asset_info}\n{request.context}"

        if (images or videos) and is_initial_analysis:
            context_block += f"\n[EVIDÊNCIAS VISUAIS]: Existem {len(images)} imagens e {len(videos)} vídeos anexados para sua análise técnica.\n"

        from agents.main_agent import get_rca_agent
        ai_engine = get_rca_agent(str(request.rca_id), language=ui_lang)

        prompt = ""
        if not is_initial_analysis:
            prompt = request.user_prompt
        else:
            prompt = f"### MISSÃO: Realizar análise completa de causa raiz para a RCA ID: {request.rca_id}.\n"
            prompt += "PASSO 1: Use obrigatoriamente `get_current_screen_context` para identificar o ATIVO e o PROBLEMA.\n"
            prompt += "PASSO 2: Use `search_historical_rcas_tool` para buscar e validar recorrências no histórico.\n"
            prompt += "PASSO 3: Gere a Causa Raiz, Ishikawa (OBRIGATORIAMENTE em sintaxe Mermaid) e 5 Porquês.\n"
        
        async def stream_output():
            logger.debug(f"📡 DEBUG: Iniciando stream ASYNC para RCA {request.rca_id}")
            # Alertas de recorrência imediatos via metadata (apenas na análise inicial)
            if recurrences and not request.user_prompt:
                yield f"data: {json.dumps({'type': 'metadata', 'subgroup_matches': [r.model_dump() for r in subgroup_matches], 'equipment_matches': [r.model_dump() for r in equipment_matches], 'area_matches': [r.model_dump() for r in area_matches]})}\n\n"

            full_response_content = ""
            is_inside_suggestions = False
            try:
                logger.info(f"📡 DEBUG: Chamando motor de IA para prompt de {len(prompt)} chars")

                async for event in ai_engine.arun(
                    prompt, 
                    stream=True, 
                    stream_intermediate_steps=True, 
                    images=images or None, 
                    videos=videos or None,
                    session_state={"screen_context": context_block}
                ):
                    event_type = type(event).__name__
                    if event_type in ("WorkflowCompletedEvent", "WorkflowAgentCompletedEvent", "RunCompletedEvent"):
                        continue

                    content = ""
                    if hasattr(event, "content") and event.content:
                        content = event.content
                    elif isinstance(event, str):
                        content = event

                    if content:
                        content_str = str(content)
                        full_response_content += content_str

                        # --- SANITIZAÇÃO DE MERMAID ---
                        if "graph LR" in content_str or "subgraph" in content_str:
                            content_str = content_str.replace("\\n", "\n").replace("\\\"", "\"")

                        # --- SUPRESSÃO TÉCNICA (ANTI-LEAK) ---
                        technical_keywords = [
                            "search_historical_rcas_tool", "get_asset_fmea_tool", 
                            "get_deterministic_fmea_tool", "calculate_reliability_metrics_tool",
                            "get_full_rca_detail_tool", "get_historical_rca_summary",
                            "get_historical_rca_causes", "get_historical_rca_action_plan",
                            "get_historical_rca_triggers", "get_skill_reference",
                            "get_current_screen_context", "duckduckgo", "DuckDuckGo",
                            "FMEA_Technical_Specialist", "Media_Failure_Analyst", "Human_Factors_Investigator"
                        ]
                        
                        # Padrões de narração de pensamento da IA que devem ser suprimidos
                        thought_patterns = [
                            "Agora, vou buscar", "Agora que temos", "Vou tentar obter", 
                            "As skills disponíveis são", "não foi encontrada", "Vou usar os arquivos",
                            "Com base nos dados da tela", "foram encontradas as seguintes",
                            "identificada é que o roteiro", "posso gerar os artefatos"
                        ]

                        # Se contiver keyword técnica, suprime e envia reasoning amigável
                        if any(kw in content_str for kw in technical_keywords):
                            if "search_historical_rcas_tool" in content_str:
                                yield f"data: {json.dumps({'type': 'reasoning', 'text': 'Consultando o histórico de falhas...'})}\n\n"
                            elif "get_asset_fmea_tool" in content_str or "get_deterministic_fmea_tool" in content_str:
                                yield f"data: {json.dumps({'type': 'reasoning', 'text': 'Analisando biblioteca técnica FMEA...'})}\n\n"
                            elif "FMEA_Technical_Specialist" in content_str:
                                yield f"data: {json.dumps({'type': 'reasoning', 'text': 'Consultando Especialista em FMEA...'})}\n\n"
                            elif "Media_Failure_Analyst" in content_str:
                                yield f"data: {json.dumps({'type': 'reasoning', 'text': 'Analisando evidências visuais...'})}\n\n"
                            elif "calculate_reliability_metrics_tool" in content_str:
                                yield f"data: {json.dumps({'type': 'reasoning', 'text': 'Calculando indicadores de confiabilidade...'})}\n\n"
                            continue

                        # Se contiver padrões de pensamento/narração, suprime o chunk
                        if any(pattern.lower() in content_str.lower() for pattern in thought_patterns):
                            logger.debug(f"🧠 PENSAMENTO SUPRIMIDO: {content_str[:50]}...")
                            continue

                        if "completed in" in content_str and ("tool" in content_str or "Tool" in content_str):
                            continue
                        if content_str.startswith("Transferring") or content_str.startswith("Running"):
                            continue
                        if content_str.strip() in ["IO", "Analisando...", "Consultando...", "Analizando..."]:
                            continue

                        # --- LÓGICA DE SUPRESSÃO DE SUGESTÕES ---
                        if not is_inside_suggestions:
                            if "<suggestions>" in content_str:
                                is_inside_suggestions = True
                                parts = content_str.split("<suggestions>")
                                if parts[0]:
                                    yield f"data: {json.dumps({'type': 'content', 'delta': parts[0]})}\n\n"
                            else:
                                if "<suggestions" in full_response_content and "<suggestions>" not in full_response_content:
                                    pass 
                                elif "<suggestions>" in full_response_content:
                                    is_inside_suggestions = True
                                else:
                                    yield f"data: {json.dumps({'type': 'content', 'delta': content_str})}\n\n"
                        else:
                            if "</suggestions>" in content_str:
                                is_inside_suggestions = False
                                parts = content_str.split("</suggestions>")
                                if len(parts) > 1 and parts[1]:
                                    yield f"data: {json.dumps({'type': 'content', 'delta': parts[1]})}\n\n"

                # Extração Final de Sugestões
                suggestions_match = re.search(r'<suggestions>(.*?)</suggestions>', full_response_content, re.DOTALL)
                if suggestions_match:
                    suggestions_text = suggestions_match.group(1).strip()
                    suggestions_list = [s.strip() for s in suggestions_text.split('|') if s.strip()]
                    if suggestions_list:
                        yield f"data: {json.dumps({'type': 'suggestions', 'suggestions': suggestions_list})}\n\n"

            except Exception as stream_e:
                logger.error(f"ERROR no streaming V2: {stream_e}")
                yield f"data: {json.dumps({'type': 'error', 'text': str(stream_e)})}\n\n"

            yield "data: [DONE]\n\n"

        return StreamingResponse(stream_output(), media_type="text/event-stream")

    except Exception as e:
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))
