"""
Proposta: Orquestrador de busca e validação RAG (Retrieval Augmented Generation).
Fluxo: Recebe contexto de falha -> Realiza busca hierárquica (Subgrupo/Equipamento/Área) -> Valida com LLM -> Retorna recorrências candidatas.
"""
from core.config import SOURCE_DB_PATH
from typing import List, Tuple, Dict, Any
from agno.utils.log import logger
from core.knowledge import get_rca_history_knowledge, get_rca_symptoms_knowledge, get_rca_causes_knowledge
from agents.rag_validator import get_rag_validator
from api.models import RecurrenceInfo, SemanticLink
import math
import re
import json

# Limites padrão de busca (Alinhados com o Agente - Issue #169)
DEFAULT_LIMIT_SUBGROUP = 20
DEFAULT_LIMIT_EQUIPMENT = 20
DEFAULT_LIMIT_AREA = 15

# Cache de Taxonomia (Evita IO repetitivo)
_taxonomy_cache = {
    "specialties": {},
    "categories": {},
    "modes": {},
    "areas": {},
    "equipment": {},
    "subgroups": {},
    "last_loaded": 0
}

def _get_taxonomy_label(category: str, item_id: str) -> str:
    """Resolve IDs técnicos para nomes amigáveis usando o banco de origem."""
    if not item_id or item_id == "None": return ""
    
    # Recarrega a cada 1h se necessário
    import time
    now = time.time()
    if now - _taxonomy_cache["last_loaded"] > 3600:
        try:
            import sqlite3
            conn = sqlite3.connect(SOURCE_DB_PATH)
            cursor = conn.cursor()
            
            # Especialidades
            cursor.execute("SELECT id, name FROM taxonomy_specialties")
            _taxonomy_cache["specialties"] = {str(r[0]): r[1] for r in cursor.fetchall()}
            
            # Categorias (Corrigido: taxonomy_failure_categories)
            cursor.execute("SELECT id, name FROM taxonomy_failure_categories")
            _taxonomy_cache["categories"] = {str(r[0]): r[1] for r in cursor.fetchall()}
            
            # Modos de Falha (Corrigido: taxonomy_failure_modes)
            cursor.execute("SELECT id, name FROM taxonomy_failure_modes")
            _taxonomy_cache["modes"] = {str(r[0]): r[1] for r in cursor.fetchall()}

            # Ativos (Áreas, Equipamentos, Subgrupos) - Resolvidos da tabela 'assets'
            cursor.execute("SELECT id, name, type FROM assets")
            rows = cursor.fetchall()
            _taxonomy_cache["areas"] = {str(r[0]): r[1] for r in rows if r[2] == 'area'}
            _taxonomy_cache["equipment"] = {str(r[0]): r[1] for r in rows if r[2] == 'equipment'}
            _taxonomy_cache["subgroups"] = {str(r[0]): r[1] for r in rows if r[2] == 'subgroup'}

            # Tipos de Componente (Adicionado)
            try:
                cursor.execute("SELECT id, name FROM taxonomy_component_types")
                _taxonomy_cache["component_types"] = {str(r[0]): r[1] for r in cursor.fetchall()}
            except: pass
            
            _taxonomy_cache["last_loaded"] = now
            conn.close()
        except Exception as e:
            logger.warning(f"RAG: Falha ao carregar taxonomia: {e}")

    return _taxonomy_cache.get(category, {}).get(item_id, item_id)
def clean_title(content: str) -> str:
    """Extrai o título limpo via Regex ignorando IDs e campos vizinhos."""
    # Novo formato Multi-Vector (rca_symptoms_v2) - Sugestão @issue
    # Lookahead para qualquer marcador conhecido ou padrão de início de campo (PALAVRA:)
    # Adicionamos limite de 180 chars para o título para evitar vazamentos se marcadores faltarem
    title_regex = r'TÍTULO:\s*(.{1,180}?)(?=\s*\n|PROBLEMA|SINTOMA|CAUSA|ANÁLISE|ID_RCA|[A-Z]{3,}:|$)'
    match = re.search(title_regex, content, flags=re.MULTILINE | re.IGNORECASE)
    
    if match:
        title = match.group(1).strip()
        # Limpeza agressiva: split no primeiro marcador de metadados que encontrar
        markers = ["PROBLEMA", "SINTOMA", "CAUSA", "ANÁLISE", "ID_RCA", "COMPONENTE:"]
        for m in markers:
            if m.upper() in title.upper():
                title = re.split(re.escape(m), title, flags=re.IGNORECASE)[0].strip()
        # Remove ":" residuais no final se houver
        title = title.rstrip(":")
        return title.strip()
    
    # Formato RAG unificado legado
    match = re.search(r'RESUMO DO PROBLEMA:\s*(.*?)(?=\n\n|$|DESCRIÇÃO)', content, flags=re.DOTALL)
    if match:
        return match.group(1).replace('\n', ' ').strip()
    
    # Fallback Legacy
    match_legacy = re.search(r'TÍTULO/O QUE \(What\):\s*(.+?)(?=\s*QUEM \(Who\):|\Z)', content, flags=re.DOTALL)
    if match_legacy:
        return match_legacy.group(1).replace('\n', ' ').strip()
    
    # Fallback final: Pela primeira linha que não seja metadata técnica
    lines = [l for l in content.split('\n') if l.strip()]
    for line in lines:
        if not any(k in line.upper() for k in ["ID_RCA:", "CAUSAS RAIZ:", "ANÁLISE:", "TÍTULO:"]):
            return line[:100].strip()
            
    return lines[0][:100] if lines else "Sem título"

def clean_root_causes(content: str) -> str:
    """Extrai as causas raiz limpas, suportando formatos legado e novo v2.4."""
    # Busca o bloco após CAUSAS RAIZ ou INVESTIGAÇÃO TÉCNICA
    match = re.search(r'(?:CAUSAS RAIZ|INVESTIGAÇÃO TÉCNICA):\s*(.*?)(?=\s*\nANÁLISE:|\n\n|$)', content, flags=re.DOTALL | re.IGNORECASE)
    
    if match:
        raw_text = match.group(1).strip()
        # Limpeza de JSONs residuais (Ações, Lições, etc)
        raw_text = re.sub(r'(?:CONTAINMENT_ACTIONS|LESSONS_LEARNED):\s*\{.*?\}', '', raw_text, flags=re.DOTALL)
        # Limpeza de cabeçalhos vazios
        raw_text = raw_text.replace("5 PORQUÊS:  ->", "").replace("5 PORQUÊS:", "")
        raw_text = raw_text.replace("ISHIKAWA:", "").replace("CAUSAS RAIZ:", "")
        raw_text = raw_text.replace("INVESTIGAÇÃO TÉCNICA:", "")
        raw_text = raw_text.replace("ANÁLISE:", "")
        
        # Formata como lista se houver múltiplos |
        if "|" in raw_text:
            lines = [l.strip() for l in raw_text.split("|") if l.strip()]
            return "\n".join(lines)
        return raw_text.strip()
    return ""

def build_symptom_query(context_json: Any) -> str:
    """Extrai sintomas do contexto (JSON ou Dict) para busca cirúrgica."""
    if not context_json: return ""
    import json
    try:
        data = context_json
        if isinstance(context_json, str):
            # Limpeza básica em caso de escapes extras
            sanitized = context_json.strip()
            if sanitized.startswith('"') and sanitized.endswith('"'):
                sanitized = sanitized[1:-1].replace('\\"', '"')
            data = json.loads(sanitized)
            
        if not isinstance(data, dict): return str(context_json)[:2000]
            
        # Busca case-insensitive pelos campos de sintomas/problema
        def get_val(keys):
            for k in keys:
                for d_key in data.keys():
                    if d_key.lower() == k.lower():
                        return data[d_key]

        parts = [
            str(get_val(["what", "O Que", "titulo", "title", "resumo"])),
            str(get_val(["problem_description", "Descrição", "problema", "description", "objetivo"])),
            str(get_val(["symptoms", "sintomas", "incident", "evento"]))
        ]
        res = " ".join([p for p in parts if p]).strip()
        final_q = res if (res and len(res) > 5) else str(context_json)[:2000]
        logger.info(f"RAG: Context Keys: {list(data.keys())} | Result Query: {final_q[:300]}...")
        return final_q
    except Exception as e:
        logger.warning(f"RAG: Falha ao buildar symptom_query: {e}")
        return str(context_json)[:2000]

def build_cause_query(context_json: Any) -> str:
    """Extrai causas do contexto (JSON ou Dict) para busca cirúrgica."""
    if not context_json: return ""
    import json
    try:
        data = context_json
        if isinstance(context_json, str):
            data = json.loads(context_json)
            
        if not isinstance(data, dict): return str(context_json)[:2000]
            
        # Campos reais observados no frontend/testes (Issue #169)
        parts = [
            str(data.get("current_causes", "")),
            str(data.get("root_causes", "")),
            str(data.get("cause", "")),
            str(data.get("analysis_details", "")),
            str(data.get("technical_analysis", ""))
        ]
        res = " ".join([p for p in parts if p]).strip()
        return res if res else str(context_json)[:2000]
    except Exception as e:
        logger.warning(f"RAG: Falha ao buildar cause_query: {e}")
        return str(context_json)[:2000]

def extract_recurrence(doc: Any, level_name: str, rank: int, vector_score: float = 0.0) -> RecurrenceInfo:
    """Extrai RecurrenceInfo de um documento do VectorDB com Score Vetorial."""
    content = doc.content
    
    # Metadata resolution
    area_val = doc.meta_data.get("area_id", "")
    equip_val = doc.meta_data.get("equipment_id", "")
    subg_val = doc.meta_data.get("subgroup_id", "")
    spec_id = doc.meta_data.get("specialty_id", "")
    cat_id = doc.meta_data.get("failure_category_id", "")
    mode_id = doc.meta_data.get("failure_mode_id", "")

    # Mapeamento de nomes amigáveis (Metadados Enriquecidos v2.1)
    area_name = doc.meta_data.get("area_name") or _get_taxonomy_label("areas", area_val)
    equip_name = doc.meta_data.get("equipment_name") or _get_taxonomy_label("equipment", equip_val)
    subg_name = doc.meta_data.get("subgroup_name") or _get_taxonomy_label("subgroups", subg_val)
    
    spec_name = _get_taxonomy_label("specialties", spec_id)
    cat_name = _get_taxonomy_label("categories", cat_id)
    mode_name = _get_taxonomy_label("modes", mode_id)
    
    title = clean_title(doc.content)
    root_causes = clean_root_causes(doc.content)
    
    # Extração de Descrição Detalhada (Novo campo sincronizado com v7.0)
    prob_desc = ""
    match_prob = re.search(r'DESCRIÇÃO DETALHADA:\s*(.*?)(?=\s*\n[A-Z]{3,}:|\n\n|$)', content, flags=re.DOTALL | re.IGNORECASE)
    if match_prob:
        prob_desc = match_prob.group(1).strip()
    
    # Extração robusta de data (Metadata Priority)
    f_date = doc.meta_data.get("failure_date") or ""
    if not f_date:
        match_dt = re.search(r'(?:DATA DA FALHA|FAILURE_DATE):\s*([^\n]+)', content, flags=re.IGNORECASE)
        if match_dt:
            f_date = match_dt.group(1).strip()
    
    # Similaridade Base: 1.0 - Distância (Normalizado v2.5)
    # Agno/Chroma pode retornar distances em lista no meta_data
    dists = doc.meta_data.get("distances")
    v_dist = 0.0
    if isinstance(dists, list) and dists: v_dist = dists[0]
    elif isinstance(dists, float): v_dist = dists
    elif vector_score > 0: v_dist = vector_score
    
    # Recalibragem v2.7: Sharpening (Aumento de contraste)
    # Usa potência para 'achatar' resultados bons e dar salto apenas para os excelentes
    # (1.0 - v_dist) ** 1.8 * 2.0 garante contraste maior entre topo e ruído
    base_similarity = max(0.0, (1.0 - v_dist) ** 1.8 * 2.1) if v_dist > 0 else 0.85
    base_similarity = min(base_similarity, 1.0) # Cap at 1.0 before boosts
    
    return RecurrenceInfo(
        rca_id=doc.meta_data.get("rca_id", "unknown"),
        similarity=base_similarity,
        title=title,
        level=level_name,
        symptoms="N/A", 
        root_causes=root_causes, 
        failure_date=f_date,
        equipment_name=equip_name,
        area_name=area_name,
        subgroup_name=subg_name,
        actions="N/A",
        problem_description=prob_desc,
        raw_content=content,
        # IDs técnicos
        specialty_id=spec_id,
        specialty_name=spec_name,
        failure_category_id=cat_id,
        failure_category_name=cat_name,
        failure_mode_id=mode_id,
        failure_mode_name=mode_name,
        component_type=_get_taxonomy_label("component_types", doc.meta_data.get("component_type"))
    )

def _build_metadata_filters(
    base_filters: list,
    specialty_id: str = None,
    failure_category_id: str = None,
    component_type: str = None
) -> dict:
    """Compoe filtros de metadados opcionais sobre a base hierarquica."""
    combined = list(base_filters)
    if specialty_id:
        combined.append({"specialty_id": str(specialty_id)})
    if failure_category_id:
        combined.append({"failure_category_id": str(failure_category_id)})
    if component_type:
        combined.append({"component_type": str(component_type)})
    if not combined:
        return None
    if len(combined) == 1:
        return combined[0]
    return {"$and": combined}

def search_hierarchical(
    query_text: str = None, 
    subgroup_id: str = None, 
    equipment_id: str = None, 
    area_id: str = None, 
    current_rca_id: str = None,
    limit_subgroup: int = DEFAULT_LIMIT_SUBGROUP,
    limit_equipment: int = DEFAULT_LIMIT_EQUIPMENT,
    limit_area: int = DEFAULT_LIMIT_AREA,
    specialty_id: str = None,
    failure_category_id: str = None,
    component_type: str = None,
    context_json: str = None,
    symptom_query: str = None,  # Override opcional v2.7
    cause_query: str = None     # Override opcional v2.7
) -> Tuple[List[RecurrenceInfo], List[RecurrenceInfo], List[RecurrenceInfo]]:
    """Busca hierárquica usando Two-Pass Search (Sintomas + Causas) com Ranking Fusion."""
    symptoms_kb = get_rca_symptoms_knowledge()
    causes_kb = get_rca_causes_knowledge()
    
    seen_ids = set()
    subgroup_matches = []
    equipment_matches = []
    area_matches = []

    # Queries cirúrgicas extraídas do contexto JSON ou enviadas via override
    symptom_q = symptom_query or (build_symptom_query(context_json) if context_json else query_text)
    cause_q = cause_query or (build_cause_query(context_json) if context_json else query_text)
    
    if not (symptom_q or cause_q):
        return subgroup_matches, equipment_matches, area_matches
    logger.info(f"RAG: Surgical Queries -> Symptom: {symptom_q[:300]} | Cause: {cause_q[:300]}")
    
    def run_search(base_filters, limit, base_names_filters=None):
        # merged: rca_id -> (doc, score)
        merged: Dict[str, Tuple[Any, float]] = {}
        filters = _build_metadata_filters(base_filters, specialty_id, failure_category_id, component_type)
        
        for q_idx, (q_name, q, kb) in enumerate([("Sintomas", symptom_q, symptoms_kb), ("Causas", cause_q, causes_kb)]):
            q_str = str(q).strip()
            if not q_str: continue
            
            try:
                logger.info(f"RAG: Stage {q_idx} ({q_name}) Query: '{q_str[:300]}' Filters: {filters}")
                q_matches = kb.vector_db.search(query=q_str, limit=limit, filters=filters)
                
                # Fallback 1: Tentar pelos NOMES (Legacy Awareness)
                if not q_matches and base_names_filters:
                    alt_filters = _build_metadata_filters(base_names_filters, specialty_id, failure_category_id, component_type)
                    logger.info(f"RAG: Fallback Names -> {alt_filters}")
                    q_matches = kb.vector_db.search(query=q_str, limit=limit, filters=alt_filters)

                # Fallback 2: Sem filtros técnicos (Especialidade, etc)
                if not q_matches and (specialty_id or failure_category_id or component_type):
                    fallback_filters = {"$and": base_filters} if len(base_filters) > 1 else (base_filters[0] if base_filters else None)
                    logger.info(f"RAG: Fallback Context -> {fallback_filters}")
                    q_matches = kb.vector_db.search(query=q_str, limit=limit, filters=fallback_filters)

                # Fallback 3: Busca Global (Ultimate Safety)
                if not q_matches:
                    logger.info(f"RAG: Fallback Global")
                    q_matches = kb.vector_db.search(query=q_str, limit=limit) # Sem filtros

                if q_matches:
                    for doc in q_matches:
                        rid = doc.meta_data.get("rca_id", "unknown")
                        if rid in merged:
                            old_doc, old_boost = merged[rid]
                            merged[rid] = (old_doc, old_boost + 0.20)
                        else:
                            merged[rid] = (doc, 0.0)
            except Exception as e:
                logger.error(f"RAG CRITICAL: Search Failed at {q_name}. Error: {e} | Query: '{q_str}' | Filters: {filters}")
                continue
                        
        return [m[0] for m in merged.values()], merged

    logger.debug(f"RAG: Buscando recorrencias (Surgical Query) para RCA {current_rca_id}.")

    # Preparar filtros de nomes (Legacy Support)
    # Extraídos do TaxonomyResolver
    a_name = _get_taxonomy_label("areas", area_id) if area_id else ""
    e_name = _get_taxonomy_label("equipment", equipment_id) if equipment_id else ""
    s_name = _get_taxonomy_label("subgroups", subgroup_id) if subgroup_id else ""


    # Nivel 1: Mesmo Subgrupo
    if subgroup_id and equipment_id and area_id:
        base = [{"subgroup_id": str(subgroup_id)}, {"equipment_id": str(equipment_id)}, {"area_id": str(area_id)}]
        base_names = [{"subgroup_name": str(s_name)}, {"equipment_name": str(e_name)}, {"area_name": str(a_name)}]
        results, merged_info = run_search(base, limit_subgroup, base_names)
        if results:
            for rank, doc in enumerate(results):
                rid = doc.meta_data.get("rca_id", "unknown")
                if rid not in seen_ids and rid != current_rca_id:
                    v_score = doc.score if hasattr(doc, 'score') else 0.0
                    rec = extract_recurrence(doc, "subgroup", rank, vector_score=v_score)
                    dual_boost = merged_info.get(rid, (None, 0.0))[1]
                    rec.similarity += _calc_metadata_boost(doc, specialty_id, failure_category_id, component_type) + dual_boost
                    subgroup_matches.append(rec)
                    seen_ids.add(rid)

    # Nivel 2: Mesmo Equipamento
    if equipment_id and area_id:
        base = [{"equipment_id": str(equipment_id)}, {"area_id": str(area_id)}]
        base_names = [{"equipment_name": str(e_name)}, {"area_name": str(a_name)}]
        results, merged_info = run_search(base, limit_equipment, base_names)
        if results:
            for rank, doc in enumerate(results):
                rid = doc.meta_data.get("rca_id", "unknown")
                doc_subg_id = str(doc.meta_data.get("subgroup_id", ""))
                if rid not in seen_ids and rid != current_rca_id and doc_subg_id != str(subgroup_id):
                    v_score = doc.score if hasattr(doc, 'score') else 0.0
                    rec = extract_recurrence(doc, "equipment", rank, vector_score=v_score)
                    dual_boost = merged_info.get(rid, (None, 0.0))[1]
                    rec.similarity += _calc_metadata_boost(doc, specialty_id, failure_category_id, component_type) + dual_boost
                    equipment_matches.append(rec)
                    seen_ids.add(rid)

    # Nivel 3: Mesma Area
    if area_id:
        base = [{"area_id": str(area_id)}]
        base_names = [{"area_name": str(a_name)}]
        results, merged_info = run_search(base, limit_area, base_names)
        if results:
            for rank, doc in enumerate(results):
                rid = doc.meta_data.get("rca_id", "unknown")
                doc_equip_id = str(doc.meta_data.get("equipment_id", ""))
                if rid not in seen_ids and rid != current_rca_id and doc_equip_id != str(equipment_id):
                    v_score = doc.score if hasattr(doc, 'score') else 0.0
                    rec = extract_recurrence(doc, "area", rank, vector_score=v_score)
                    dual_boost = merged_info.get(rid, (None, 0.0))[1]
                    rec.similarity += _calc_metadata_boost(doc, specialty_id, failure_category_id, component_type) + dual_boost
                    area_matches.append(rec)
                    seen_ids.add(rid)

    # Nivel 4: Busca Global (Fallack Final se não houver IDs ou se tudo falhou)
    if not subgroup_matches and not equipment_matches and not area_matches:
        results, merged_info = run_search([], 10) # Busca global total (limit 10)
        if results:
            for rank, doc in enumerate(results):
                rid = doc.meta_data.get("rca_id", "unknown")
                if rid not in seen_ids and rid != current_rca_id:
                    v_score = doc.score if hasattr(doc, 'score') else 0.0
                    rec = extract_recurrence(doc, "global", rank, vector_score=v_score)
                    dual_boost = merged_info.get(rid, (None, 0.0))[1]
                    rec.similarity += _calc_metadata_boost(doc, specialty_id, failure_category_id, component_type) + dual_boost
                    area_matches.append(rec) # Reportamos como Area matches por compatibilidade
                    seen_ids.add(rid)

    return subgroup_matches, equipment_matches, area_matches


def _calc_metadata_boost(doc: Any, specialty_id: str = None, failure_category_id: str = None, component_type: str = None) -> float:
    """Calcula um score de boost baseado na correspondencia de metadados (0.0 a 1.0)."""
    boost = 0.0
    checks = 0
    if specialty_id:
        checks += 1
        if str(doc.meta_data.get("specialty_id", "")) == str(specialty_id):
            boost += 0.35
    if failure_category_id:
        checks += 1
        if str(doc.meta_data.get("failure_category_id", "")) == str(failure_category_id):
            boost += 0.35
    if component_type:
        checks += 1
        if str(doc.meta_data.get("component_type", "")) == str(component_type):
            boost += 0.30
    return round(boost, 2) if checks > 0 else 0.0

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
    seen_links = set() 

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
                        score=1.0 
                    ))
                    seen_links.add(pair)

    knowledge_base = get_rca_history_knowledge()
    embedder = getattr(knowledge_base.vector_db, "embedder", None)
    if not embedder:
        return links

    texts = []
    for c in candidates:
        txt = c.raw_content if (c.raw_content and len(c.raw_content) > 50) else c.title
        texts.append(txt[:5000])
    
    embeddings = []
    for i, text in enumerate(texts):
        try:
            emb = embedder.get_embedding(text)
            embeddings.append(emb)
        except:
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
    
    return links

def _build_validator_summary(r: RecurrenceInfo) -> str:
    """Resumo cirúrgico para o validator — IDs resolvidos para Label (Issue #169)."""
    # Resolução de labels para o LLM
    mode_label = _get_taxonomy_label("modes", r.failure_mode_id)
    spec_label = _get_taxonomy_label("specialties", r.specialty_id)
    cat_label = _get_taxonomy_label("categories", r.failure_category_id)
    
    parts = [
        f"ID_RCA: {r.rca_id}",
        f"NÍVEL: {r.level}",
        f"TÍTULO: {r.title}",
        f"DATA: {r.failure_date or 'N/A'}",
        f"LOCAL: {r.area_name} > {r.equipment_name} > {r.subgroup_name}",
        f"CAUSAS: {r.root_causes if (r.root_causes and r.root_causes.strip()) else '[Não preenchido] — avaliar apenas por sintoma'}",
    ]
    if r.component_type:
        parts.append(f"COMPONENTE: {r.component_type}") # Componente já é string na UI
    if mode_label:
        parts.append(f"MODO DE FALHA: {mode_label}")
    if spec_label:
        parts.append(f"ESPECIALIDADE: {spec_label}")
    if r.problem_description:
        parts.append(f"DESCRIÇÃO DETALHADA: {r.problem_description}")
    if cat_label:
        parts.append(f"CATEGORIA: {cat_label}")
    
    parts.append(f"SCORE_BOOST: {r.similarity:.2f}")
    return "\n".join(parts)

def validate_recurrences(query_text: str, all_candidates: List[RecurrenceInfo], language: str = "Português-BR") -> Tuple[Dict[str, str], Dict[str, str], str]:
    """Passa os candidatos resumidos pelo RAGValidator com saída JSON robusta."""
    if not all_candidates:
        return {}, {}, ""
        
    validator = get_rag_validator(language=language)
    
    # Resumos estruturados economizam ~99% dos tokens de contexto (Issue #169 feedback)
    candidate_summaries = [_build_validator_summary(r) for r in all_candidates]

    validation_prompt = (
        f"PROBLEMA ATUAL (DADOS DA TELA):\n{query_text}\n\n"
        f"CANDIDATOS ({len(all_candidates)} itens):\n" + "\n---\n".join(candidate_summaries)
    )
    
    try:
        validation_response = validator.run(validation_prompt)
        raw = validation_response.content.strip()

        # Limpeza de possíveis blocos de código markdown impostos pelo modelo
        clean_json = re.sub(r'^```(?:json)?\s*', '', raw, flags=re.MULTILINE)
        clean_json = re.sub(r'\s*```$', '', clean_json, flags=re.MULTILINE)

        import json
        data = json.loads(clean_json)

        valid_ids = {
            item["id"]: f"[{item['classificacao']}] {item['motivo']}"
            for item in data.get("validados", [])
            if item.get("id") and item.get("motivo")
        }
        discarded_ids = {
            item["id"]: item["motivo"]
            for item in data.get("descartados", [])
            if item.get("id") and item.get("motivo")
        }

        return valid_ids, discarded_ids, raw

    except (json.JSONDecodeError, KeyError, Exception) as e:
        logger.error(f"[validate_recurrences] Falha no parser JSON do validator: {e} | Resposta: {raw[:200]}")
        # Fallback seguro: Em caso de falha no parser, não perdemos as recorrências
        fallback_valid = {r.rca_id: "[SEMELHANTE] Validação automática (falha no parser do agente)" for r in all_candidates}
        return fallback_valid, {}, f"Erro no parser: {str(e)}"
