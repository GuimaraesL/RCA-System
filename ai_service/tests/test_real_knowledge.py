import os
import sys
import json

# Adiciona o diretório ai_service ao path para importação
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import pytest
from core.tools import get_asset_fmea_tool
from core.knowledge import get_fmea_knowledge
from agents.fmea_agent import get_fmea_agent

def test_real_rag_access_to_fmea_manual():
    """
    TESTE REAL: Verifica se a busca semântica (RAG) consegue extrair 
    informações do arquivo 'fmea_redutores.md' indexado no ChromaDB.
    """
    # Termo técnico EXTREMAMENTE específico presente no manual de redutores
    query = "Quebra de dente de engrenagem por fadiga e desalinhamento"
    
    # Chama a ferramenta REAL (sem mocks)
    print(f"\n[TEST] Realizando busca RAG real para: '{query}'...")
    result = get_asset_fmea_tool(query)
    
    # Validações baseadas no conteúdo real do arquivo ai_service/data/fmea/fmea_redutores.md
    print(f"[DEBUG] Resultado retornado:\n{result[:500]}...")
    
    # Se falhar por 429 (Resource Exhausted), o teste deve falhar indicando que a cota da API Key acabou.
    if "429" in result or "RESOURCE_EXHAUSTED" in result:
        pytest.fail(f"FALHA DE ACESSO REAL: A cota da sua API Key do Google (Gemini) foi atingida. Isso impede a geração de embeddings para a busca. Erro: {result}")

    # Se a busca funcionar, os dados do manual devem estar presentes
    assert "CONHECIMENTO FMEA ENCONTRADO" in result
    assert "fmea_redutores.md" in result
    assert "Inspeção por endoscopia" in result or "travamento abrupto" in result
    assert "Quebra de Dente" in result

def test_agent_real_knowledge_configuration():
    """
    TESTE DE CONFIGURAÇÃO REAL: Verifica se o Agente está apontando 
    apenas para a biblioteca técnica (FMEA) no conhecimento direto,
    forçando o histórico de RCAs a ser consultado via ferramenta especializada.
    """
    agent = get_fmea_agent()
    
    # Verifica se a base de conhecimento técnica está instanciada
    knowledge_bases = agent.knowledge
    assert len(knowledge_bases) >= 1, "O agente deveria ter a base de FMEA vinculada."
    
    # Verifica os nomes das coleções reais configuradas
    collections = []
    for kb in knowledge_bases:
        if hasattr(kb.vector_db, 'collection_name'):
            collections.append(kb.vector_db.collection_name)
    
    print(f"[DEBUG] Coleções configuradas no Agente: {collections}")
    
    # Apenas technical_knowledge_v1 deve estar no conhecimento direto
    assert "technical_knowledge_v1" in collections, "A biblioteca técnica unificada (FMEA/Manuais) não está vinculada ao agente."
    
    # Verifica se a ferramenta de busca de histórico está presente
    tool_names = [t.__name__ for t in agent.tools]
    assert "search_historical_rcas_tool" in tool_names, "A ferramenta especializada de busca de RCAs deve estar presente."
