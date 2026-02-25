# AI Service - Modelos de Dados
# Define as estruturas de requisição e resposta para os endpoints da API de IA.

from pydantic import BaseModel
from typing import Optional, List

class RecurrenceInfo(BaseModel):
    rca_id: str
    similarity: float
    title: str
    level: str # 'subgroup', 'equipment', 'area'

class AnalysisRequest(BaseModel):
    rca_id: str
    context: Optional[str] = None
    area_id: Optional[str] = None
    equipment_id: Optional[str] = None
    subgroup_id: Optional[str] = None
    user_prompt: Optional[str] = None

class AnalysisResponse(BaseModel):
    rca_id: str
    ai_insight: str
    status: str
    recurrences: List[RecurrenceInfo] = []
