# AI Service - Rotas da API
# Endpoints de saúde e análise de causa raiz assistida por IA.

from fastapi import APIRouter, Header, HTTPException
from .models import AnalysisRequest, AnalysisResponse, RecurrenceInfo
from agent.detective import get_rca_detective_agent
from agent.knowledge import get_rca_knowledge_base
from config import INTERNAL_AUTH_KEY
import json

router = APIRouter()

@router.get("/health")
async def health_check():
    return {
        "status": "alive"
    }

@router.post("/analyze", response_model=AnalysisResponse)
async def analyze_rca(request: AnalysisRequest, x_internal_key: str = Header(None)):
    if x_internal_key != INTERNAL_AUTH_KEY:
        raise HTTPException(status_code=403, detail="Invalid Internal Key")
    
    try:
        knowledge_base = get_rca_knowledge_base()
        agent = get_rca_detective_agent()
        
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
        
        # 2. Busca Hierárquica de Recorrências
        recurrences = []
        levels = [
            ("subgroup", request.subgroup_id),
            ("equipment", request.equipment_id),
            ("area", request.area_id)
        ]

        if query_text:
            for level_name, level_id in levels:
                if not level_id: continue
                
                # Formata filtro para o ChromaDB
                search_filter = {f"{level_name}_id": str(level_id)}
                
                # Busca direto no VectorDB do Knowledge Base
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
                    break # Encontrou no nível atual, não precisa subir
        
        # 3. Preparar o prompt enriquecido para o Agente
        prompt = f"Realize uma análise profunda da RCA com ID: {request.rca_id}."
        prompt += f"\n\nNOME DO ATIVO ATUAL: {asset_info}"
        
        if request.context:
            prompt += f"\n\nCONTEXTO DO FORMULÁRIO (PRIORITÁRIO):\n{request.context}"
        
        if recurrences:
            recurr_str = "\n".join([f"- RCA {r.rca_id}: {r.title} (Nível: {r.level})" for r in recurrences])
            prompt += f"\n\n⚠️ RECORRÊNCIAS ENCONTRADAS:\n{recurr_str}\n\nPor favor, avalie se estas falhas anteriores possuem a mesma causa raiz."

        # Executar análise do Agente (Async)
        response = await agent.arun(prompt)

        return AnalysisResponse(
            rca_id=request.rca_id,
            ai_insight=response.content,
            status="completed",
            recurrences=recurrences
        )
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))
