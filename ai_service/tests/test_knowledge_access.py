import os
import sys
from unittest.mock import MagicMock, patch

# Adiciona o diretório ai_service ao path para importação
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import pytest
from core.tools import get_asset_fmea_tool
from core.knowledge import sync_technical_knowledge
from agents.fmea_agent import get_fmea_agent

def test_sync_logic_identifies_files():
    """
    Testa se a lógica de sincronização identifica os arquivos nos diretórios corretos.
    Usamos mocks para evitar chamadas de API reais (evitar 429).
    """
    # Garante que os diretórios existam
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    fmea_path = os.path.join(base_dir, "data", "fmea")
    os.makedirs(fmea_path, exist_ok=True)
    
    # Cria um arquivo de teste rápido em markdown
    test_file_path = os.path.join(fmea_path, "test_manual_logic.md")
    with open(test_file_path, "w", encoding="utf-8") as f:
        f.write("# Manual de Teste\nConteúdo de teste para o RAG.")
        
    try:
        # Mock do knowledge base e do ChromaDb para não disparar embeddings reais
        with patch('core.knowledge.technical_knowledge') as mock_tk:
            # Configura o mock do SQLite para não falhar
            with patch('sqlite3.connect') as mock_sql:
                mock_conn = MagicMock()
                mock_sql.return_value = mock_conn
                
                # Executa a sincronização técnica
                sync_technical_knowledge()
                
                # Verifica se o add_content foi chamado (indicando que o arquivo foi encontrado e processado)
                assert mock_tk.add_content.called
                
    finally:
        # Limpa o arquivo de teste
        if os.path.exists(test_file_path):
            os.remove(test_file_path)

def test_agent_tool_and_knowledge_integration():
    """
    Simula uma consulta por causa raiz e valida se a ferramenta RAG está
    conectada ao conhecimento técnico mockado.
    """
    mock_doc = MagicMock()
    mock_doc.content = "CAUSA IDENTIFICADA: Desalinhamento severo no acoplamento do redutor tipo X."
    mock_doc.meta_data = {"filename": "manual_redutor_teste.md"}
    
    # Patch na base de conhecimento retornada pela factory
    with patch('core.tools.get_fmea_knowledge') as mock_factory:
        mock_kb = MagicMock()
        mock_factory.return_value = mock_kb
        # Simula o retorno da busca semântica no banco vetorial
        mock_kb.vector_db.search.return_value = [mock_doc]
        
        # Chama a ferramenta que o Agente usaria
        result = get_asset_fmea_tool("vibração excessiva redutor")
        
        # Valida se o agente recebeu a informação da biblioteca técnica
        assert "CONHECIMENTO FMEA ENCONTRADO" in result
        assert "Desalinhamento severo" in result
        assert "manual_redutor_teste.md" in result

def test_fmea_agent_configuration():
    """
    Verifica se o agente especialista em FMEA está instanciado com as 
    ferramentas e bases de conhecimento exigidas na arquitetura.
    """
    agent = get_fmea_agent()
    
    # Verifica ferramentas
    tool_names = [t.__name__ for t in agent.tools]
    assert "get_asset_fmea_tool" in tool_names
    assert "get_deterministic_fmea_tool" in tool_names
    
    # Verifica se as bases de conhecimento (FMEA) estão vinculadas
    assert agent.knowledge is not None
    assert len(agent.knowledge) >= 1
    
    # O agente deve estar com o RAG ativo (search_knowledge)
    assert agent.search_knowledge is True
