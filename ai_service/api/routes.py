# AI Service - Rotas da API
# Endpoints de saúde e análise de causa raiz assistida por IA.

from fastapi import APIRouter, Header, HTTPException
from .models import AnalysisRequest, AnalysisResponse
from agent.detective import get_rca_detective_agent
from mcp_bridge import mcp_bridge
from config import INTERNAL_AUTH_KEY

router = APIRouter()

@router.get("/health")
async def health_check():
    return {
        "status": "alive", 
        "mcp_bridge": "connected" if mcp_bridge.session else "disconnected"
    }

@router.post("/analyze", response_model=AnalysisResponse)
async def analyze_rca(request: AnalysisRequest, x_internal_key: str = Header(None)):
    if x_internal_key != INTERNAL_AUTH_KEY:
        raise HTTPException(status_code=403, detail="Invalid Internal Key")
    
    if not mcp_bridge.session:
        raise HTTPException(status_code=503, detail="MCP Bridge unavailable")

    try:
        agent = get_rca_detective_agent()
        prompt = f"Realize uma análise profunda da RCA com ID: {request.rca_id}."
        if request.context:
            prompt += f"\nContexto usuário: {request.context}"

        response = await agent.arun(prompt)

        return AnalysisResponse(
            rca_id=request.rca_id,
            ai_insight=response.content,
            status="completed"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
