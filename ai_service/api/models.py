# AI Service - Modelos de Dados
# Define as estruturas de requisição e resposta para os endpoints da API de IA.

from pydantic import BaseModel
from typing import Optional

class AnalysisRequest(BaseModel):
    rca_id: str
    context: Optional[str] = None

class AnalysisResponse(BaseModel):
    rca_id: str
    ai_insight: str
    status: str
