# AI Service - Modelos de Dados
# Define as estruturas de requisição e resposta para os endpoints da API de IA.

from pydantic import BaseModel
from typing import Optional, List

class RecurrenceInfo(BaseModel):
    rca_id: str
    similarity: float
    title: str
    level: str # 'subgroup', 'equipment', 'area'
    root_causes: Optional[str] = None
    actions: Optional[str] = None

class MediaItem(BaseModel):
    type: str # 'image', 'video'
    url: str
    filename: str

class AnalysisRequest(BaseModel):
    rca_id: str
    context: Optional[str] = None
    area_id: Optional[str] = None
    equipment_id: Optional[str] = None
    subgroup_id: Optional[str] = None
    user_prompt: Optional[str] = None
    ui_language: Optional[str] = "Português-BR"
    attachments: Optional[List[MediaItem]] = None

class AnalysisResponse(BaseModel):
    rca_id: str
    ai_insight: str
    status: str
    recurrences: List[RecurrenceInfo] = []

class FmeaItem(BaseModel):
    failure_mode: str
    potential_effects: Optional[str] = None
    severity: int
    potential_causes: Optional[str] = None
    occurrence: int
    current_controls: Optional[str] = None
    detection: int
    recommended_actions: Optional[str] = None

class FmeaExtractionRequest(BaseModel):
    text: str
    ui_language: Optional[str] = "Português-BR"

class FmeaExtractionResponse(BaseModel):
    modes: List[FmeaItem]

