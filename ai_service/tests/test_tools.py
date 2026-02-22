import pytest
from unittest.mock import AsyncMock, patch, MagicMock
import sys
import os
import asyncio

# Adiciona o diretório ai_service ao path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from agent.tools import get_rca_context_tool, get_asset_fmea_tool, search_technical_taxonomy_tool

def run_async(coro):
    """Helper para rodar coroutines sem pytest-asyncio."""
    return asyncio.run(coro)

@patch("httpx.AsyncClient.get")
def test_get_rca_context_tool_success(mock_get):
    """Valida se a ferramenta busca o contexto da RCA com sucesso."""
    rca_id = "RCA-1"
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"id": rca_id, "what": "Falha de teste"}
    mock_get.return_value = mock_response
    
    result = run_async(get_rca_context_tool(rca_id))
    assert f"CONTEXTO RCA {rca_id}" in result
    assert "Falha de teste" in result

@patch("httpx.AsyncClient.get")
def test_get_rca_context_tool_failure(mock_get):
    """Valida o comportamento da ferramenta em caso de erro no backend."""
    rca_id = "RCA-ERROR"
    mock_response = MagicMock()
    mock_response.status_code = 404
    mock_get.return_value = mock_response
    
    result = run_async(get_rca_context_tool(rca_id))
    assert "Erro ao buscar RCA: Status 404" in result

@patch("httpx.AsyncClient.get")
def test_get_asset_fmea_tool_success(mock_get):
    """Valida se a ferramenta busca o FMEA do ativo com sucesso."""
    asset_id = "ASSET-1"
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.text = "Modo de falha: Desgaste"
    mock_get.return_value = mock_response
    
    result = run_async(get_asset_fmea_tool(asset_id))
    assert f"FMEA ATIVO {asset_id}" in result
    assert "Desgaste" in result

@patch("httpx.AsyncClient.get")
def test_search_technical_taxonomy_tool_success(mock_get):
    """Valida se a ferramenta busca na taxonomia com sucesso."""
    query = "motor"
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.text = "Motor de Indução, Motor DC"
    mock_get.return_value = mock_response
    
    result = run_async(search_technical_taxonomy_tool(query))
    assert "RESULTADOS TAXONOMIA" in result
    assert "Motor de Indução" in result
