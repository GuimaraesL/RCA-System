# Proposta: Servidor FastAPI para orquestração da IA (RCA Detective).
# Fluxo: Recebe requisições do sistema principal, interage com o Agno para processamento RAG e retorna insights técnicos.

from fastapi import FastAPI, HTTPException, Header
from pydantic import BaseModel
from typing import Optional, List
import os

app = FastAPI(title="RCA System AI Service")

# Verificação de Chave Interna (Security Layer)
INTERNAL_AUTH_KEY = os.getenv("INTERNAL_AUTH_KEY", "dev-key-change-it")

class AnalysisRequest(BaseModel):
    rca_id: str
    context: Optional[str] = None

@app.get("/health")
async def health_check():
    return {"status": "alive", "service": "rca-ai-agno"}

@app.post("/analyze")
async def analyze_rca(request: AnalysisRequest, x_internal_key: str = Header(None)):
    if x_internal_key != INTERNAL_AUTH_KEY:
        raise HTTPException(status_code=403, detail="Forbidden: Invalid Internal Key")
    
    # Placeholder para integração futura com Agno Framework
    return {
        "rca_id": request.rca_id,
        "ai_insight": "Serviço de IA inicializado com sucesso. Aguardando conexão com banco via MCP.",
        "status": "ready"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
