# AI Service - Rotas da API
# Endpoints de saúde e análise de causa raiz assistida por IA.

from fastapi import APIRouter, Header, HTTPException
from fastapi.responses import StreamingResponse
from .models import AnalysisRequest, AnalysisResponse, RecurrenceInfo
from rca_team import create_rca_detectives_team
from agent.knowledge import get_rca_knowledge_base
from config import INTERNAL_AUTH_KEY, AGENT_MEMORY_PATH
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
        os.makedirs(os.path.dirname(AGENT_MEMORY_PATH), exist_ok=True)

        knowledge_base = get_rca_knowledge_base()
        # Inicializa o Time simplificado com o novo rca_team.py
        team = create_rca_detectives_team(str(request.rca_id))
        
        # 1. Determinar o texto de busca para similaridade e extrair info do ativo
        query_text = ""
        asset_info = "Ativo não identificado explicitamente"
        if request.context:
            try:
                ctx = json.loads(request.context)
                query_text = f"{ctx.get('title', '')} {ctx.get('description', '')}"
                asset_info = ctx.get('asset_display', asset_info)
            except:
                query_text = request.context
        
        # 2. Busca Hierárquica de Recorrências (Para injetar no prompt inicial)
        recurrences = []
        levels = [
            ("subgroup", request.subgroup_id),
            ("equipment", request.equipment_id),
            ("area", request.area_id)
        ]

        if query_text:
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
                        recurrences.append(RecurrenceInfo(
                            rca_id=doc.meta_data.get("rca_id", "unknown"),
                            similarity=1.0,
                            title=doc.content.split("\n")[0].replace("TÍTULO DA FALHA: ", ""),
                            level=level_name
                        ))
                    break
        
        # 3. Preparar o prompt enriquecido
        prompt = f"Realize uma análise profunda da RCA com ID: {request.rca_id}."
        prompt += f"\n\nNOME DO ATIVO ATUAL: {asset_info}"
        
        if request.context:
            prompt += f"\n\nCONTEXTO DO FORMULÁRIO (PRIORITÁRIO):\n{request.context}"
        
        if recurrences:
            recurr_str = "\n".join([f"- RCA {r.rca_id}: {r.title} (Nível: {r.level})" for r in recurrences])
            prompt += f"\n\n⚠️ RECORRÊNCIAS ENCONTRADAS:\n{recurr_str}\n\nPor favor, avalie se estas falhas anteriores possuem a mesma causa raiz."

        # 4. Gerador de Streaming para SSE compatível com Agno 2.x e o Frontend
        def stream_output():
            print(f"DEBUG: Iniciando stream SYNC para RCA {request.rca_id}")
            # Alertas de recorrência imediatos via metadata
            if recurrences:
                yield f"data: {json.dumps({'type': 'metadata', 'recurrences': [r.dict() for r in recurrences]})}\n\n"
            
            try:
                # Execução do stream do Time (modo síncrono validado via test_sync.py)
                for chunk in team.run(prompt, stream=True, session_id=str(request.rca_id)):
                    if chunk and chunk.content:
                        # print(f"DEBUG: Enviando chunk ({len(chunk.content)} chars)")
                        yield f"data: {json.dumps({'type': 'content', 'delta': chunk.content})}\n\n"
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
