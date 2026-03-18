# AI Service - Modelos de Dados
# Define as estruturas de requisição e resposta para os endpoints da API de IA.

from pydantic import BaseModel
from typing import Optional, List

class RecurrenceInfo(BaseModel):
    rca_id: str
    similarity: float
    title: str
    level: str # 'subgroup', 'equipment', 'area'
    symptoms: Optional[str] = None
    root_causes: Optional[str] = None
    actions: Optional[str] = None
    equipment_name: Optional[str] = None
    subgroup_name: Optional[str] = None
    area_name: Optional[str] = None
    raw_content: Optional[str] = None
    failure_date: Optional[str] = None

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
    stream: Optional[bool] = False
    metadata_only: Optional[bool] = False
    attachments: Optional[List[MediaItem]] = None

class SemanticLink(BaseModel):
    source: str
    target: str
    score: float

class AnalysisResponse(BaseModel):
    rca_id: str
    ai_insight: Optional[str] = None
    status: Optional[str] = None
    recurrences: List[RecurrenceInfo] = []
    semantic_links: List[SemanticLink] = []


