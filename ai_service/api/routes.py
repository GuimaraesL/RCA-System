# AI Service - Rotas da API
# Endpoints de saúde e análise de causa raiz assistida por IA.

from fastapi import APIRouter, Header, HTTPException
from fastapi.responses import StreamingResponse
from .models import AnalysisRequest, AnalysisResponse, RecurrenceInfo
from core.knowledge import get_rca_history_knowledge
from core.config import INTERNAL_AUTH_KEY, AGENT_MEMORY_PATH
from agno.utils.log import logger
import json
import asyncio

router = APIRouter()

@router.get("/health")
async def health_check():
    return {"status": "ok"}

@router.get("/analyze/history/{rca_id}")
async def get_chat_history(rca_id: str, x_internal_key: str = Header(None)):
    """
    Recupera o histórico de chat da sessão do RCA diretamente do banco SQLite do agente.
    Isso permite repovoar o frontend se a sidebar for fechada e aberta.
    """
    if x_internal_key != INTERNAL_AUTH_KEY:
        raise HTTPException(status_code=403, detail="Invalid Internal Key")
    
    from agents.chat_agent import get_chat_agent
    agent = get_chat_agent(rca_id)
    
    messages = []
    session_msgs = agent.get_session_messages(rca_id)
    
    if session_msgs:
        for msg in session_msgs:
            if msg.role in ['user', 'assistant']:
                content = msg.content
                # Limpa a injeção invisível de contexto do formulário (se houver)
                if isinstance(content, str) and "[INFO DE SISTEMA INVISÍVEL AO USUÁRIO:" in content:
                    content = content.split("\n\n[INFO DE SISTEMA INVISÍVEL AO USUÁRIO:")[0]
                
                messages.append({
                    "role": msg.role,
                    "content": content,
                })
    
    return {"messages": messages}

@router.post("/analyze")
async def analyze_rca(request: AnalysisRequest, x_internal_key: str = Header(None)):
    """
    Realiza a análise da RCA usando o time de multi-agentes.
    Retorna um StreamingResponse (SSE) para uma UX fluida.
    """
    if x_internal_key != INTERNAL_AUTH_KEY:
        raise HTTPException(status_code=403, detail="Invalid Internal Key")
    
    try:
        # Garante que o diretório de storage existe
        import os
        import httpx
        from core.config import BACKEND_URL, AGENT_MEMORY_PATH
        os.makedirs(os.path.dirname(AGENT_MEMORY_PATH), exist_ok=True)

        # --- NOVA LÓGICA DE CAPTURA DE ATIVO ---
        area_id = request.area_id
        equipment_id = request.equipment_id
        subgroup_id = request.subgroup_id
        asset_info = "Ativo não identificado explicitamente"

        # 1. (DESATIVADO PARA TESTE DE DUPLICIDADE) Se os IDs estão faltando mas o RCA já existe, buscar no backend
        # if not all([area_id, equipment_id, subgroup_id]) and request.rca_id and not str(request.rca_id).startswith("TEST"):
        #     try:
        #         print(f"DEBUG: Buscando metadados do ativo para RCA {request.rca_id} no backend...")
        #         rca_url = f"{BACKEND_URL}/api/rcas/{request.rca_id}"
        #         backend_resp = httpx.get(rca_url, timeout=5.0)
        #         if backend_resp.status_code == 200:
        #             rca_data = backend_resp.json()
        #             if isinstance(rca_data, dict) and 'data' in rca_data:
        #                 rca_data = rca_data['data']
        #             
        #             # Atualiza os IDs se eles vierem do backend
        #             area_id = area_id or rca_data.get('area_id')
        #             equipment_id = equipment_id or rca_data.get('equipment_id')
        #             subgroup_id = subgroup_id or rca_data.get('subgroup_id')
        #             asset_info = rca_data.get('asset', asset_info)
        #             print(f"DEBUG: Metadados recuperados: Area={area_id}, Equip={equipment_id}, Sub={subgroup_id}")
        #     except Exception as backend_e:
        #         print(f"WARNING: Falha ao recuperar metadados do backend: {backend_e}")

        # 2. Se for uma análise nova (não salva ainda), capturar do contexto
        query_text = ""
        if request.context:
            try:
                ctx = json.loads(request.context)
                query_text = f"{ctx.get('title', '')} {ctx.get('description', '')}"
                # Prioriza o asset_display do contexto se os IDs ainda forem nulos (novo RCA)
                if asset_info == "Ativo não identificado explicitamente":
                    asset_info = ctx.get('asset_display', asset_info)
                
                # Captura IDs do contexto se vierem da interface (Novo RCA)
                area_id = area_id or ctx.get('area_id')
                equipment_id = equipment_id or ctx.get('equipment_id')
                subgroup_id = subgroup_id or ctx.get('subgroup_id')
            except:
                query_text = request.context

        from core.knowledge import get_rca_history_knowledge
        knowledge_base = get_rca_history_knowledge()
        
        # 3. Busca Hierárquica de Recorrências (Acumulativa)
        recurrences = []
        levels = [
            ("subgroup", subgroup_id),
            ("equipment", equipment_id),
            ("area", area_id)
        ]

        if query_text:
            seen_ids = set()
            for level_name, level_id in levels:
                if not level_id: continue
                search_filter = {f"{level_name}_id": str(level_id)}
                results = knowledge_base.vector_db.search(
                    query=query_text,
                    limit=3,
                    filters=search_filter
                )
                if results:
                    for doc in results:
                        rid = doc.meta_data.get("rca_id", "unknown")
                        if rid not in seen_ids and rid != request.rca_id:
                            # Extrair causas e ações do conteúdo formatado no documento
                            content_lines = doc.content.split("\n")
                            causes = "N/A"
                            actions = "N/A"
                            for line in content_lines:
                                if line.startswith("CAUSAS RAIZ:"): causes = line.replace("CAUSAS RAIZ: ", "")
                                if line.startswith("AÇÕES TOMADAS:"): actions = line.replace("AÇÕES TOMADAS: ", "")

                            recurrences.append(RecurrenceInfo(
                                rca_id=rid,
                                similarity=1.0,
                                title=content_lines[0].replace("TÍTULO DA FALHA: ", ""),
                                level=level_name,
                                root_causes=causes,
                                actions=actions
                            ))
                            seen_ids.add(rid)

        # Fase 3: Workflow Formal (Análise) ou Team (Chat)
        ui_lang = request.ui_language or "Português-BR"
        
        # Decide o motor de IA: Workflow para Análise Inicial, Team para Chat
        is_initial_analysis = not (request.user_prompt and str(request.user_prompt).strip())
        
        if is_initial_analysis:
            from workflows.rca import get_rca_workflow
            ai_engine = get_rca_workflow(str(request.rca_id), language=ui_lang)
        else:
            from agents.super_agent import get_super_agent
            ai_engine = get_super_agent(str(request.rca_id), language=ui_lang)

        # 1. Constrói o Contexto Global (Formulário + Recorrências)
        context_block = ""
        if request.context:
            context_block += f"\n[DADOS ATUAIS DA TELA - use para contexto, não mencione que os recebeu]:\nAtivo: {asset_info}\n{request.context}\n"
        
        if recurrences:
            recurr_items = []
            for r in recurrences:
                item = f"- [RCA {r.rca_id[:8]}...](#/rca/{r.rca_id}): {r.title} (Nível: {r.level})"
                if r.root_causes and r.root_causes != "N/A":
                    item += f"\n  - Causa Raiz: {r.root_causes}"
                if r.actions and r.actions != "N/A":
                    item += f"\n  - Ações anteriores: {r.actions}"
                recurr_items.append(item)
            context_block += f"\n[HISTÓRICO ENCONTRADO - Considere recorrência se houver dados similares]:\n" + "\n".join(recurr_items) + "\n"

        # 2. Monta o prompt final (Chat ou Análise Inicial)
        if not is_initial_analysis:
            logger.info("📡 ROTA: Mensagem de chat recebida -> Team Mode.")
            prompt = f"{context_block}\n---\nMensagem do usuário: {request.user_prompt}"
        else:
            logger.info("📡 ROTA: Análise inicial automática -> Workflow Formal.")
            prompt = f"{context_block}\n---\nRealize a análise completa de causa raiz para a RCA ID: {request.rca_id} baseando-se nos dados acima."

        logger.info(f"🔍 ROTA: Motor={type(ai_engine).__name__}, Prompt ({len(prompt)} chars)")

        # 4. Gerador de Streaming para SSE compatível com Agno 2.x e o Frontend
        async def stream_output():
            logger.debug(f"📡 DEBUG: Iniciando stream ASYNC para RCA {request.rca_id}")
            # Alertas de recorrência imediatos via metadata (apenas na análise inicial)
            if recurrences and not request.user_prompt:
                yield f"data: {json.dumps({'type': 'metadata', 'recurrences': [r.dict() for r in recurrences]})}\n\n"
            
            try:
                logger.info(f"📡 DEBUG: Chamando motor de IA para prompt de {len(prompt)} chars")
                
                if is_initial_analysis:
                    # Workflow.run(stream=True) retorna Iterator síncrono.
                    # Usamos asyncio.Queue para emitir eventos em tempo real.
                    import queue as sync_queue
                    event_queue = asyncio.Queue()
                    
                    def _run_workflow():
                        try:
                            for event in ai_engine.run(input=prompt, stream=True):
                                asyncio.run_coroutine_threadsafe(event_queue.put(event), loop)
                            asyncio.run_coroutine_threadsafe(event_queue.put(None), loop)  # Sinal de fim
                        except Exception as ex:
                            asyncio.run_coroutine_threadsafe(event_queue.put(ex), loop)
                    
                    loop = asyncio.get_event_loop()
                    loop.run_in_executor(None, _run_workflow)
                    
                    while True:
                        event = await event_queue.get()
                        if event is None:
                            break
                        if isinstance(event, Exception):
                            raise event
                        
                        logger.debug(f"📡 DEBUG: Evento Workflow: {type(event)}")
                        
                        event_type = type(event).__name__
                        if event_type in ("WorkflowCompletedEvent", "WorkflowAgentCompletedEvent", "RunCompletedEvent", "StepCompletedEvent", "WorkflowStartedEvent", "StepStartedEvent"):
                            continue
                        
                        content = ""
                        if hasattr(event, "content") and event.content:
                            content = event.content
                        elif isinstance(event, str):
                            content = event
                        
                        if content:
                            content_str = str(content)
                            # Filtros de tool noise
                            if any(content_str.startswith(t) for t in ["search_historical_rcas_tool", "get_asset_fmea_tool", "get_full_rca_detail_tool", "get_rca_context_tool"]):
                                yield f"data: {json.dumps({'type': 'reasoning', 'text': 'Consultando bases de conhecimento...'})}\n\n"
                                continue
                            if "completed in" in content_str and ("tool" in content_str or "Tool" in content_str):
                                continue
                            if content_str.startswith("Transferring") or content_str.startswith("Running"):
                                yield f"data: {json.dumps({'type': 'reasoning', 'text': 'Executando próximo passo do pipeline...'})}\n\n"
                                continue
                            
                            yield f"data: {json.dumps({'type': 'content', 'delta': content_str})}\n\n"
                else:
                    # Team.arun(stream=True) retorna AsyncIterator nativo
                    async for event in ai_engine.arun(prompt, stream=True, session_id=str(request.rca_id)):
                        logger.debug(f"📡 DEBUG: Evento Team: {type(event)}")
                        
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
                            if content_str.startswith("search_historical_rcas_tool"):
                                yield f"data: {json.dumps({'type': 'reasoning', 'text': 'Consultando o histórico de falhas e arquivos mortos...'})}\n\n"
                                continue
                            elif content_str.startswith("get_asset_fmea_tool"):
                                yield f"data: {json.dumps({'type': 'reasoning', 'text': 'Analisando banco de FMEA do ativo...'})}\n\n"
                                continue
                            elif content_str.startswith("get_full_rca_detail_tool"):
                                yield f"data: {json.dumps({'type': 'reasoning', 'text': 'Acessando conteúdo integral e triggers da RCA selecionada...'})}\n\n"
                                continue
                            elif "completed in" in content_str and ("tool" in content_str or "Tool" in content_str):
                                continue
                            elif content_str.startswith("get_rca_context_tool"):
                                continue
                            elif content_str.startswith("Transferring") or content_str.startswith("Running"):
                                yield f"data: {json.dumps({'type': 'reasoning', 'text': 'Coordenando especialistas...'})}\n\n"
                                continue
                            
                            yield f"data: {json.dumps({'type': 'content', 'delta': content_str})}\n\n"
            except Exception as stream_e:
                print(f"ERROR no streaming: {stream_e}")
                yield f"data: {json.dumps({'type': 'error', 'text': str(stream_e)})}\n\n"
            
            print("DEBUG: Stream finalizado.")
            yield "data: [DONE]\n\n"

        return StreamingResponse(stream_output(), media_type="text/event-stream")

    except Exception as e:
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))
