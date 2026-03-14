import os
import sys
import pytest

# Adiciona o diretório ai_service ao path para importação
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from core.tools import get_asset_fmea_tool
from core.knowledge import sync_technical_knowledge, get_technical_knowledge

def test_sync_and_index_technical_knowledge():
    """
    Testa se a função de sincronização consegue varrer os diretórios
    e se a base de conhecimento reporta ter documentos (simulando a indexação).
    """
    # Garante que os diretórios existam
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    fmea_path = os.path.join(base_dir, "data", "fmea")
    knowledge_path = os.path.join(base_dir, "data", "knowledge")
    
    os.makedirs(fmea_path, exist_ok=True)
    os.makedirs(knowledge_path, exist_ok=True)
    
    # Cria um arquivo de teste rápido em markdown se não existir nada
    test_file_path = os.path.join(fmea_path, "test_manual.md")
    with open(test_file_path, "w", encoding="utf-8") as f:
        f.write("# Manual de Teste\nEste é um documento de teste sobre rolamentos e vibração de alta frequência.")
        
    try:
        # Executa a sincronização (deve indexar o arquivo acima)
        sync_technical_knowledge()
        
        # Como o db vetorial já existe no projeto real (ChromaDb), vamos fazer uma busca 
        # direta pela string que acabamos de colocar
        result = get_asset_fmea_tool("vibração de alta frequência em rolamentos")
        
        # O resultado não pode ser a mensagem padrão de erro/vazio
        assert "Nenhuma informação técnica específica encontrada" not in result
        assert "Manual de Teste" in result or "test_manual.md" in result
        
    finally:
        # Limpa o arquivo de teste para não sujar o ambiente real
        if os.path.exists(test_file_path):
            os.remove(test_file_path)

def test_fmea_tool_access():
    """
    Testa se a ferramenta de busca do agente RAG (get_asset_fmea_tool) 
    consegue se conectar e retornar formato esperado.
    """
    # Realiza uma query genérica
    result = get_asset_fmea_tool("Engrenagem quebrando")
    
    # Deve retornar uma string (seja resultado ou fallback)
    assert isinstance(result, str)
    assert len(result) > 0
