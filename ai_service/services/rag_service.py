"""
Proposta: Centralizar a lógica de busca hierárquica e validação de recorrências usando o VectorDB e o RAGValidator.
Fluxo: Recebe os dados de contexto, executa busca vetorial em três níveis (subgrupo, equipamento, área), e processa os resultados usando um LLM para validar falsos positivos.
"""
import re
import httpx
from typing import List, Tuple, Dict, Any
from agno.utils.log import logger

from core.knowledge import get_rca_history_knowledge
from agents.rag_validator import get_rag_validator
from core.config import BACKEND_URL, INTERNAL_AUTH_KEY
from api.models import RecurrenceInfo

# Limites padrão de busca (Alinhados com o Agente - Issue #150)
DEFAULT_LIMIT_SUBGROUP = 20
DEFAULT_LIMIT_EQUIPMENT = 20
DEFAULT_LIMIT_AREA = 15


def clean_title(content: str) -> str:
    """Extrai o título limpo via Regex ignorando IDs e campos vizinhos."""
    # Novo Formato (RESUMO DO PROBLEMA)
    match = re.search(r'RESUMO DO PROBLEMA:\s*(.*?)(?=\n\n|$|DESCRIÇÃO)', content, flags=re.DOTALL)
    if match:
        return match.group(1).replace('\n', ' ').strip()
    
    # Fallback Legacy
    match_legacy = re.search(r'TÍTULO/O QUE \(What\):\s*(.+?)(?=\s*QUEM \(Who\):|\Z)', content, flags=re.DOTALL)
    if match_legacy:
        return match_legacy.group(1).replace('\n', ' ').strip()
    
    lines = content.split('\n')
    return lines[0][:100] if lines else "Sem título"

def clean_root_causes(content: str) -> str:
    match = re.search(r'CAUSAS RAIZ:\s*(.*?)(?=\n\n|$|AÇÕES DO PLANO:)', content, flags=re.DOTALL)
    if match:
        causes = match.group(1).strip()
        return causes.replace(" | ", "\n")
    return ""

def extract_recurrence(doc: Any, level_name: str, rank: int) -> RecurrenceInfo:
    """Extrai RecurrenceInfo de um documento do VectorDB."""
    content = doc.content
    
    # Pega as chaves reais que salvamos na indexação
    area_val = doc.meta_data.get("area_id", "")
    equip_val = doc.meta_data.get("equipment_id", "")
    subg_val = doc.meta_data.get("subgroup_id", "")

    title = clean_title(doc.content)
    root_causes = clean_root_causes(doc.content)
    
    # Buscar data da falha
    fail_date = doc.meta_data.get("failure_date", "")
    if not fail_date:
        match_dt = re.search(r'DATA DA FALHA:\s*([^\n]+)', doc.content)
        if match_dt:
            fail_date = match_dt.group(1).strip()
    
    # Backup: fetch real-time from server
    if not fail_date:
        rca_i = doc.meta_data.get("rca_id", "unknown")
        if rca_i != "unknown":
            try:
                base_url = BACKEND_URL.rstrip('/')
                headers = {"x-internal-key": INTERNAL_AUTH_KEY}
                # Correção Issue #149: Usa context manager para garantir fechamento e timeout agressivo
                with httpx.Client(timeout=2.0) as client:
                    resp = client.get(f"{base_url}/api/rcas/{rca_i}", headers=headers)
                    if resp.status_code == 200:
                        j_resp = resp.json()
                        if 'failure_date' in j_resp and j_resp['failure_date']:
                            fail_date = j_resp['failure_date']
            except Exception as e:
                logger.warning(f'[fetch_failure_date] rca_id={rca_i}: {e}')

    return RecurrenceInfo(
        rca_id=doc.meta_data.get("rca_id", "unknown"),
        similarity=0.0,
        title=title,
        level=level_name,
        symptoms="N/A", 
        root_causes=root_causes, 
        failure_date=fail_date,
        equipment_name=f"Área: {area_val} > Equip: {equip_val} > Subgrupo: {subg_val}",
        area_name=area_val,
        subgroup_name=subg_val,
        actions="N/A",
        raw_content=content
    )

def search_hierarchical(
    query_text: str, 
    subgroup_id: str, 
    equipment_id: str, 
    area_id: str, 
    current_rca_id: str = None,
    limit_subgroup: int = DEFAULT_LIMIT_SUBGROUP,
    limit_equipment: int = DEFAULT_LIMIT_EQUIPMENT,
    limit_area: int = DEFAULT_LIMIT_AREA
) -> Tuple[List[RecurrenceInfo], List[RecurrenceInfo], List[RecurrenceInfo]]:
    """Busca hierárquica por nível."""
    knowledge_base = get_rca_history_knowledge()
    seen_ids = set()
    subgroup_matches = []
    equipment_matches = []
    area_matches = []

    if not query_text:
        return subgroup_matches, equipment_matches, area_matches

    logger.debug(f"RAG: Buscando recorrências para consulta de {len(query_text)} caracteres.")

    # Nível 1: Mesmo Subgrupo
    if subgroup_id and equipment_id and area_id:
        filters = {
            "$and": [
                {"subgroup_id": str(subgroup_id)},
                {"equipment_id": str(equipment_id)},
                {"area_id": str(area_id)}
            ]
        }
        results = knowledge_base.vector_db.search(query=query_text, limit=limit_subgroup, filters=filters)
        if results:
            for rank, doc in enumerate(results):
                rid = doc.meta_data.get("rca_id", "unknown")
                if rid not in seen_ids and rid != current_rca_id:
                    subgroup_matches.append(extract_recurrence(doc, "subgroup", rank))
                    seen_ids.add(rid)

    # Nível 2: Mesmo Equipamento
    if equipment_id and area_id:
        filters = {
            "$and": [
                {"equipment_id": str(equipment_id)},
                {"area_id": str(area_id)}
            ]
        }
        results = knowledge_base.vector_db.search(query=query_text, limit=limit_equipment, filters=filters)
        if results:
            for rank, doc in enumerate(results):
                rid = doc.meta_data.get("rca_id", "unknown")
                doc_subg_id = str(doc.meta_data.get("subgroup_id", ""))
                if rid not in seen_ids and rid != current_rca_id and doc_subg_id != str(subgroup_id):
                    equipment_matches.append(extract_recurrence(doc, "equipment", rank))
                    seen_ids.add(rid)

    # Nível 3: Equipamentos Diferentes (Mesma Área)
    if area_id:
        results = knowledge_base.vector_db.search(query=query_text, limit=limit_area, filters={"area_id": str(area_id)})
        if results:
            for rank, doc in enumerate(results):
                rid = doc.meta_data.get("rca_id", "unknown")
                doc_equip_id = str(doc.meta_data.get("equipment_id", ""))
                if rid not in seen_ids and rid != current_rca_id and doc_equip_id != str(equipment_id):
                    area_matches.append(extract_recurrence(doc, "area", rank))
                    seen_ids.add(rid)

    return subgroup_matches, equipment_matches, area_matches

def validate_recurrences(query_text: str, all_candidates: List[RecurrenceInfo]) -> Tuple[Dict[str, str], Dict[str, str], str]:
    """Passa os candidatos pelo RAGValidator."""
    if not all_candidates:
        return {}, {}, ""
        
    validator = get_rag_validator()
    
    candidate_texts = []
    for r in all_candidates:
        meta = f"ID_RCA: {r.rca_id} | CATEGORIA: {r.level} | Equipamento: {r.equipment_name}"
        candidate_texts.append(f"{meta}\nCONTEÚDO:\n{r.raw_content}\n---")

    validation_prompt = (
        f"PROBLEMA ATUAL (DADOS DA TELA):\n{query_text}\n\n"
        f"CANDIDATOS DO RAG:\n" + "\n".join(candidate_texts)
    )
    
    validation_response = validator.run(validation_prompt)
    val_text = validation_response.content

    valid_ids = {}
    discarded_ids = {}
    
    valid_section = re.search(r"RECORRÊNCIAS VALIDADAS:(.*?)(?=FALSOS POSITIVOS DESCARTADOS:|$)", val_text, re.S)
    if valid_section:
        for line in valid_section.group(1).strip().split('\n'):
            match = re.search(r"ID:\s*([a-f0-9-]+)\s*\|\s*Motivo Técnico:\s*(.*)", line)
            if match:
                valid_ids[match.group(1).strip()] = match.group(2).strip()

    discarded_section = re.search(r"FALSOS POSITIVOS DESCARTADOS:(.*)", val_text, re.S)
    if discarded_section:
        for line in discarded_section.group(1).strip().split('\n'):
            match = re.search(r"ID:\s*([a-f0-9-]+)\s*\|\s*Motivo do Descarte:\s*(.*)", line)
            if match:
                discarded_ids[match.group(1).strip()] = match.group(2).strip()

    return valid_ids, discarded_ids, val_text
