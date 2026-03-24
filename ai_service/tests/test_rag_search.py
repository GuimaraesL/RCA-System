import os
import sys
from typing import List

# Fix encoding for Windows terminal (v3.1 UTF-8)
if sys.stdout.encoding.lower() != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

# Adiciona o diretório raiz ao path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.knowledge import get_rca_history_knowledge, get_rca_symptoms_knowledge, get_rca_causes_knowledge
from services.rag_service import extract_recurrence, _build_validator_summary
from agno.utils.log import logger

# Desabilita logs excessivos para o teste ficar limpo
import logging
logging.getLogger("agno").setLevel(logging.WARNING)

def test_real_search(query: str, limit: int = 5):
    print(f"\n{'='*60}")
    print(f"SIMULAÇÃO DE INPUT LLM (RAG VALIDATOR)")
    print(f"QUERY: '{query}'")
    print(f"{'='*60}")

    knowledge_layers = [
        ("CAMADA 1: HISTÓRICO FULL", get_rca_history_knowledge(), "history"),
        ("CAMADA 2: SINTOMAS", get_rca_symptoms_knowledge(), "symptoms"),
        ("CAMADA 3: CAUSAS", get_rca_causes_knowledge(), "causes")
    ]

    all_summaries = []

    for label, kb, level in knowledge_layers:
        print(f"\n[{label}]")
        try:
            matches = kb.vector_db.search(query=query, limit=limit)
            if not matches:
                print(f"Nenhum resultado encontrado em {label}.")
                continue
                
            for i, m in enumerate(matches, 1):
                # 1. Extrai a RecurrenceInfo (Lógica de Produção v3.0)
                v_score = getattr(m, 'score', 0.0)
                rec = extract_recurrence(m, level_name=level, rank=i, vector_score=v_score)
                
                # 2. Gera o resumo que vai pro prompt da LLM (Lógica de Produção v3.1)
                llm_summary = _build_validator_summary(rec)
                all_summaries.append(llm_summary)
                
                print(f"\n{i}. [TOP {i}] {rec.title} (ID: {rec.rca_id})")
                print(f"   Distância Vetorial (Chroma): {v_score:.4f}")
                print(f"   Score Final (Similarity Boost): {rec.similarity:.4f}")
                print("-" * 20)
                print(f"   [TEXTO ENVIADO PARA LLM]:\n{llm_summary}")
                print("-" * 40)
        except Exception as e:
            print(f"Erro na busca em {label}: {e}")

    # Simulação do Prompt Final
    if all_summaries:
        print(f"\n{'#'*60}")
        print(f"### SIMULAÇÃO DO PROMPT FINAL DE VALIDAÇÃO (SENT PARA AGENTE RAG) ###")
        print(f"{'#'*60}")
        final_prompt = (
            f"PROBLEMA ATUAL (DADOS DA TELA):\n{query}\n\n"
            f"CANDIDATOS ({len(all_summaries)} itens):\n" + "\n---\n".join(all_summaries)
        )
        print(final_prompt)
        print(f"{'#'*60}")

if __name__ == "__main__":
    # Pega query do argumento se houver, senão usa uma padrão
    test_query = " ".join(sys.argv[1:]) if len(sys.argv) > 1 else "vazamento de óleo na mesa de moldes"
    test_real_search(test_query)
