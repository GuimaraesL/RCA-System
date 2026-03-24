import os
import sys
import sqlite3
import random
import httpx

# Adiciona o diretório raiz do ai_service ao path para suportar execuções de qualquer lugar
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.knowledge import build_embedding_contents, _get_flattened_investigations, _get_asset_hierarchy, _get_taxonomy_names
from core.config import SOURCE_DB_PATH, BACKEND_URL

def test_triple_embeddings(n=10):
    """
    Simula e imprime as 3 camadas de embedding (History, Symptoms, Causes) 
    conforme estruturadas no Agno Knowledge Base.
    """
    print(f"--- SIMULAÇÃO DE 3 CAMADAS DE EMBEDDING (COMPARTILHADA) ---")
    print(f"Banco: {SOURCE_DB_PATH}")
    print(f"Backend: {BACKEND_URL}\n")
    
    # 1. Busca dados via API para ter o objeto RCA completo
    try:
        response = httpx.get(f"{BACKEND_URL}/api/rcas", timeout=15.0)
        rcas = response.json()
        if isinstance(rcas, dict) and 'data' in rcas: rcas = rcas['data']
    except Exception as e:
        print(f"Erro de conexão com API: {e}")
        return

    conn = sqlite3.connect(SOURCE_DB_PATH)
    cursor = conn.cursor()
    
    try:
        sample = random.sample(rcas, min(n, len(rcas)))
        
        for i, rca in enumerate(sample, 1):
            rca_id = rca.get('id')
            print(f"\n{'='*60}")
            print(f"[{i}/{n}] RCA ID: {rca_id}")
            print(f"{'='*60}")

            # 1. Extração dos componentes brutos (Igual ao Knowledge.py)
            investigation_text = _get_flattened_investigations(rca_id, cursor)
            
            # 2. Taxonomia (USANDO FUNÇÃO REAL DO KNOWLEDGE.PY PARA REFLETIR 100% A LÓGICA)
            tax = _get_taxonomy_names(rca_id, cursor)

            # 3. Hierarquia (Usando o Helper Real)
            hierarchy = _get_asset_hierarchy(rca_id, cursor)

            # 4. Geração dos Textos Reais (IMPORTADO DO KNOWLEDGE.PY)
            contents = build_embedding_contents(rca_id, rca, investigation_text, tax, hierarchy)

            print("\n>>> [CAMADA 1: HISTÓRICO COMPLETO] (EXATO)")
            print(contents["full"])
            print("\n>>> [CAMADA 2: SINTOMAS] (EXATO)")
            print(contents["symptoms"])
            print("\n>>> [CAMADA 3: CAUSAS RAIZ] (EXATO)")
            print(contents["causes"])
            print("\n" + "-"*60)
            
    except Exception as e:
        print(f"Erro no teste: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    test_triple_embeddings(10)
