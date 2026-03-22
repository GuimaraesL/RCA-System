import sys
import os
import json

# Adiciona o diretório ai_service ao path para importar os módulos internos
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.rag_service import search_hierarchical
from agno.utils.log import logger

def query_content_split(symptom_text: str, cause_text: str):
    """Realiza a busca simulando sintoma e causa separados."""
    print(f"\n--- REALIZANDO BUSCA RAG V2.6 REFINADA ---")
    print(f"SINTOMA: '{symptom_text}' | CAUSA: '{cause_text}'")
    
    # Simula os parâmetros do RAG (Filtros vazios para teste)
    res = search_hierarchical(
        current_rca_id="test_id",
        symptom_query=symptom_text,
        cause_query=cause_text,
        subgroup_id=None,
        equipment_id=None,
        area_id=None,
        specialty_id=None,
        failure_category_id=None,
        component_type=None
    )
    
    sub, equip, area = res
    all_candidates = sub + equip + area
    
    print(f"Total de candidatos encontrados: {len(all_candidates)}", flush=True)
    for i, c in enumerate(all_candidates[:12]):
        print(f"{'-' * 50}", flush=True)
        print(f"CANDIDATO {i+1}:", flush=True)
        print(f"  ID: {c.rca_id}", flush=True)
        print(f"  TÍTULO: {c.title}", flush=True)
        print(f"  SIMILARITY: {c.similarity:.2f}", flush=True)
        print(f"  CAUSAS: {c.root_causes}", flush=True)
        print(f"  DATA: {c.failure_date or 'N/A'}", flush=True)
        print(f"  LOCAL: {c.area_name} > {c.equipment_name} > {c.subgroup_name}", flush=True)
        
        tech_status = f"Spec: {c.specialty_name or ''} | Cat: {c.failure_category_name or ''} | Mode: {c.failure_mode_name or ''}"
        print(f"  TÉCNICO: {tech_status}", flush=True)
        print(f"  COMPONENTE: {c.component_type or ''}", flush=True)

def query_content(query_text: str):
    print(f"\n--- REALIZANDO BUSCA RAG V2.3 PARA: '{query_text}' ---\n")
    
    # Simulação de busca global (sem IDs de localização)
    subgroup_matches, equipment_matches, area_matches = search_hierarchical(
        query_text=query_text,
        subgroup_id=None,
        equipment_id=None,
        area_id=None,
        current_rca_id=None
    )
    
    all_results = subgroup_matches + equipment_matches + area_matches
    
    if not all_results:
        print("Nenhum candidato encontrado.")
        return

    print(f"Total de candidatos encontrados: {len(all_results)}")
    print("-" * 50)
    
    for i, r in enumerate(all_results, 0): # Changed start index to 0 for i+1 to work correctly
        print(f"CANDIDATO {i+1}:")
        print(f"  ID: {r.rca_id}")
        print(f"  NÍVEL: {r.level}")
        print(f"  TÍTULO: {r.title}")
        print(f"  DATA: {r.failure_date or 'N/A'}")
        print(f"  LOCAL: {r.area_name} > {r.equipment_name} > {r.subgroup_name}")
        
        tech_status = f"Spec: {r.specialty_name or ''} | Cat: {r.failure_category_name or ''} | Mode: {r.failure_mode_name or ''}"
        print(f"  TÉCNICO: {tech_status}")
        print(f"  COMPONENTE: {r.component_type or ''}")
        print(f"  SIMILARITY: {r.similarity:.2f}")
        
        causes = r.root_causes if (r.root_causes and r.root_causes.strip()) else "⚠️ Não preenchido"
        print(f"  CAUSAS:\n    {causes.replace('\n', '\n    ')}")
        
        print(f"  CONTEÚDO BRUTO (Amostra 300 chars):")
        print(f"  {r.raw_content[:300]}...")
        print("-" * 50)

if __name__ == "__main__":
    # Suporte a sintoma e causa separados: python script.py "sintoma" "causa"
    s_query = sys.argv[1] if len(sys.argv) > 1 else "Drive bloqueado"
    c_query = sys.argv[2] if len(sys.argv) > 2 else "Sujeira + Periodicidade do Plano de Manutenção"
    
    # Se passar apenas um argumento, usa nos dois campos
    if len(sys.argv) == 2:
        c_query = s_query

    print(f"INFO: Sintoma='{s_query}' | Causa='{c_query}'")
    query_content_split(s_query, c_query)
