# AI Service - Rotas da API
# Endpoints de saúde e análise de causa raiz assistida por IA.

from fastapi import APIRouter, Header, HTTPException
from fastapi.responses import StreamingResponse
from .models import AnalysisRequest, AnalysisResponse, RecurrenceInfo
from rca_team import create_rca_detectives_team
from agent.knowledge import get_rca_history_knowledge
from config import INTERNAL_AUTH_KEY, AGENT_MEMORY_PATH
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
    
    from agent.chat_agent import get_chat_agent
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
        from config import BACKEND_URL, AGENT_MEMORY_PATH
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

        from agent.knowledge import get_rca_history_knowledge
        knowledge_base = get_rca_history_knowledge()
        
        # 3. Busca Hierárquica de Recorrências (Acumulativa)
        recurrences = []
        levels = [
            ("subgroup", subgroup_id),
            ("equipment", equipment_id),
            ("area", area_id)
        ]

        if query_text and not request.user_prompt:
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

        from agent.chat_agent import get_chat_agent
        
        # Inicializa a Orquestração escolhida dependendo do "Modo" (Análise Inicial vs Chat)
        ui_lang = request.ui_language or "Português-BR"
        
        # Modo Chat: Se há user_prompt, aciona apenas o Agente focado em chat rápido
        if request.user_prompt and str(request.user_prompt).strip():
            logger.info("📡 DEBUG: Modo Chat Ativado (Super Agent)")
            from agent.super_agent import get_super_agent
            ai_engine = get_super_agent(str(request.rca_id), language=ui_lang)
            prompt = request.user_prompt
            # Contextualiza a etapa 
            if request.context:
                prompt += f"\n\n[INFO DE SISTEMA INVISÍVEL AO USUÁRIO: O formulário atual possui os seguintes dados preenchidos: {request.context}]"
        
        # Modo Análise Inicial: Sem prompt, aciona o Time de Especialistas completo
        else:
            logger.info("📡 DEBUG: Modo Análise Inicial Ativado (Super Agent)")
            # Substituindo temporariamente create_rca_detectives_team pelo Super Agente Unificado
            from agent.super_agent import get_super_agent
            ai_engine = get_super_agent(str(request.rca_id), language=ui_lang)
            
            prompt = f"Iniciando Copiloto para a RCA ID: {request.rca_id}.\n\nNOME DO ATIVO ATUAL: {asset_info}"
            if request.context:
                prompt += f"\n\nCONTEXTO DO FORMULÁRIO:\n{request.context}"
            if recurrences:
                recurr_items = []
                for r in recurrences:
                    item = f"- [RCA {r.rca_id[:8]}...](#/rca/{r.rca_id}): {r.title} (Nível: {r.level})"
                    if r.root_causes and r.root_causes != "N/A":
                        item += f"\n  - Causa Raiz: {r.root_causes}"
                    if r.actions and r.actions != "N/A":
                        item += f"\n  - Ações anteriores: {r.actions}"
                    recurr_items.append(item)
                
                recurr_str = "\n".join(recurr_items)
                prompt += f"\n\nContexto histórico encontrado. Use os fatos abaixo para sugerir causas no Ishikawa:\n{recurr_str}"
        
        logger.info(f"🔍 DEBUG: Prompt Final: '{prompt[:100]}...' (Tamanho: {len(prompt)})")

        # 4. Gerador de Streaming para SSE compatível com Agno 2.x e o Frontend
        async def stream_output():
            logger.debug(f"📡 DEBUG: Iniciando stream ASYNC para RCA {request.rca_id}")
            # Alertas de recorrência imediatos via metadata (apenas na análise inicial)
            if recurrences and not request.user_prompt:
                yield f"data: {json.dumps({'type': 'metadata', 'recurrences': [r.dict() for r in recurrences]})}\n\n"
            
            try:
                # Execução do stream async
                async for event in ai_engine.arun(prompt, stream=True, session_id=str(request.rca_id)):
                    content = ""
                    if hasattr(event, "content"):
                        content = event.content
                    elif isinstance(event, str):
                        content = event
                    
                    if content:
                        content_str = str(content)
                        # Intercepta as ferramentas para emitir como "Métricas de Pensamento" (SSE 'reasoning')
                        if content_str.startswith("search_historical_rcas_tool"):
                            yield f"data: {json.dumps({'type': 'reasoning', 'text': 'Consultando o histórico de falhas e arquivos mortos...'})}\n\n"
                            continue
                        elif content_str.startswith("get_asset_fmea_tool"):
                            yield f"data: {json.dumps({'type': 'reasoning', 'text': 'Analisando banco de FMEA do ativo...'})}\n\n"
                            continue
                        elif "completed in" in content_str and ("tool" in content_str or "Tool" in content_str):
                            # Filtro genérico para descartar outputs sujos das tools sem gerar conteúdo
                            continue
                        elif content_str.startswith("get_rca_context_tool"):
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
