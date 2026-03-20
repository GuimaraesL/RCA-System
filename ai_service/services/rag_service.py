"""
Proposta: Centralizar a lógica de busca hierárquica e validação de recorrências usando o VectorDB e o RAGValidator.
Fluxo: Recebe os dados de contexto, executa busca vetorial em três níveis (subgrupo, equipamento, área), e processa os resultados usando um LLM para validar falsos positivos.
"""
import re
from typing import List, Tuple, Dict, Any
from agno.utils.log import logger

from core.knowledge import get_rca_history_knowledge
from agents.rag_validator import get_rag_validator
from api.models import RecurrenceInfo, SemanticLink
import math

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

def normalize_cause(s: str) -> str:
    """Normaliza texto para comparação determinística (igual ao frontend)."""
    return re.sub(r'[^a-z0-9]', '', s.lower()).strip()

def calculate_semantic_links(candidates: List[RecurrenceInfo], threshold: float = 0.88) -> List[SemanticLink]:
    """
    Calcula interconexões híbridas entre os candidatos do RAG.
    Prioriza matches de texto exato em causas raiz e complementa com embeddings de alta confiança.
    """
    if not candidates or len(candidates) < 2:
        return []
    
    links = []
    seen_links = set() # (id1, id2) ordenado para evitar duplicatas

    # 1. Match Determinístico por Causa Raíz (Regra de Ouro)
    for i in range(len(candidates)):
        for j in range(i + 1, len(candidates)):
            c1, c2 = candidates[i], candidates[j]
            causes1 = {normalize_cause(c) for c in (c1.root_causes or "").split("\n") if c.strip()}
            causes2 = {normalize_cause(c) for c in (c2.root_causes or "").split("\n") if c.strip()}
            
            if causes1 and causes2 and causes1.intersection(causes2):
                pair = tuple(sorted([c1.rca_id, c2.rca_id]))
                if pair not in seen_links:
                    links.append(SemanticLink(
                        source=c1.rca_id,
                        target=c2.rca_id,
                        score=1.0 # Peso máximo para match direto
                    ))
                    seen_links.add(pair)

    # 2. Match Semântico por Embeddings (Complemento)
    knowledge_base = get_rca_history_knowledge()
    embedder = getattr(knowledge_base.vector_db, "embedder", None)
    if not embedder:
        logger.warning("[calculate_semantic_links] Embedder não encontrado. Retornando apenas links de texto.")
        return links

    # Prepara os textos apenas para quem já não está linkado ou para reforçar
    # (Para performance, poderíamos pular quem já tem link, mas vamos calcular tudo para ter o score real)
    texts = []
    for c in candidates:
        txt = c.raw_content if (c.raw_content and len(c.raw_content) > 50) else c.title
        texts.append(txt[:5000])
    
    embeddings = []
    logger.debug(f"[calculate_semantic_links] Gerando embeddings para {len(texts)} itens...")
    
    for i, text in enumerate(texts):
        try:
            emb = embedder.get_embedding(text)
            embeddings.append(emb)
        except Exception as e:
            logger.warning(f"[calculate_semantic_links] Falha no embedding {i}: {e}")
            embeddings.append(None)
            
    def dot_product(v1, v2): return sum(x*y for x, y in zip(v1, v2))
    def magnitude(v): return math.sqrt(sum(x*x for x in v))
    def cosine_similarity(v1, v2):
        m1, m2 = magnitude(v1), magnitude(v2)
        return dot_product(v1, v2) / (m1 * m2) if (m1 > 0 and m2 > 0) else 0.0

    for i in range(len(candidates)):
        for j in range(i + 1, len(candidates)):
            v1, v2 = embeddings[i], embeddings[j]
            if v1 and v2:
                score = cosine_similarity(v1, v2)
                if score >= threshold:
                    pair = tuple(sorted([candidates[i].rca_id, candidates[j].rca_id]))
                    if pair not in seen_links:
                        links.append(SemanticLink(
                            source=candidates[i].rca_id,
                            target=candidates[j].rca_id,
                            score=round(score, 4)
                        ))
                        seen_links.add(pair)
    
    logger.info(f"[calculate_semantic_links] {len(links)} conexões híbridas encontradas (Threshold {threshold}).")
    return links

def validate_recurrences(query_text: str, all_candidates: List[RecurrenceInfo], language: str = "Português-BR") -> Tuple[Dict[str, str], Dict[str, str], str]:
    """Passa os candidatos pelo RAGValidator."""
    if not all_candidates:
        return {}, {}, ""
        
    validator = get_rag_validator(language=language)
    
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
