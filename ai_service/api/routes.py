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

        # 1. Se os IDs estão faltando mas o RCA já existe, buscar no backend
        if not all([area_id, equipment_id, subgroup_id]) and request.rca_id and not str(request.rca_id).startswith("TEST"):
            try:
                print(f"DEBUG: Buscando metadados do ativo para RCA {request.rca_id} no backend...")
                rca_url = f"{BACKEND_URL}/api/rcas/{request.rca_id}"
                backend_resp = httpx.get(rca_url, timeout=5.0)
                if backend_resp.status_code == 200:
                    rca_data = backend_resp.json()
                    if isinstance(rca_data, dict) and 'data' in rca_data:
                        rca_data = rca_data['data']
                    
                    # Atualiza os IDs se eles vierem do backend
                    area_id = area_id or rca_data.get('area_id')
                    equipment_id = equipment_id or rca_data.get('equipment_id')
                    subgroup_id = subgroup_id or rca_data.get('subgroup_id')
                    asset_info = rca_data.get('asset', asset_info)
                    print(f"DEBUG: Metadados recuperados: Area={area_id}, Equip={equipment_id}, Sub={subgroup_id}")
            except Exception as backend_e:
                print(f"WARNING: Falha ao recuperar metadados do backend: {backend_e}")

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
        # Inicializa o Time orquestrado
        team = create_rca_detectives_team(str(request.rca_id))
        
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
            # Ordena por nível (subgroup > equipment > area)
        
        # 3. Preparar o prompt enriquecido
        prompt = ""
        
        # Se for a primeira inicialização ou apenas o contexto do formulário (Botão Analisar ou click automático da IA)
        if not request.user_prompt or not str(request.user_prompt).strip():
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
        # Se for um turno de conversa originado pelo campo de digitação do Chat Sidebar
        else:
            prompt = request.user_prompt    
        
        logger.info(f"🔍 DEBUG: Prompt Final para o Time: '{prompt[:100]}...' (Tamanho: {len(prompt)})")

        # 4. Gerador de Streaming para SSE compatível com Agno 2.x e o Frontend
        async def stream_output():
            logger.debug(f"📡 DEBUG: Iniciando stream ASYNC para RCA {request.rca_id}")
            # Alertas de recorrência imediatos via metadata
            if recurrences:
                yield f"data: {json.dumps({'type': 'metadata', 'recurrences': [r.dict() for r in recurrences]})}\n\n"
            
            try:
                # Execução do stream do Time de forma assíncrona
                logger.info(f"🤝 DEBUG: Chamando team.arun com session_id={request.rca_id}")
                async for event in team.arun(prompt, stream=True, session_id=str(request.rca_id)):
                    # O Agno 2.x envia RunContentEvent ou strings
                    content = ""
                    if hasattr(event, "content"):
                        content = event.content
                    elif isinstance(event, str):
                        content = event
                    
                    if content:
                        yield f"data: {json.dumps({'type': 'content', 'delta': content})}\n\n"
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
