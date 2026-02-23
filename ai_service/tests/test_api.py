import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch
import sys
import os

# Adiciona o diretório ai_service ao path para permitir imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Importa o app após configurar o path
from main import app
from config import INTERNAL_AUTH_KEY
import json

client = TestClient(app)

def test_health_check():
    """Valida se o endpoint de health check está respondendo corretamente."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    # Aceita tanto o formato original quanto o formato do Agno OS
    assert data["status"] in ["alive", "ok"]

def test_analyze_rca_invalid_key():
    """Valida se a API rejeita requisições sem a chave interna correta."""
    response = client.post(
        "/analyze",
        json={"rca_id": "test-123"},
        headers={"x-internal-key": "wrong-key"}
    )
    assert response.status_code == 403
    assert response.json()["detail"] == "Invalid Internal Key"

@patch("api.routes.get_rca_knowledge_base")
@patch("api.routes.create_rca_detectives_team")
def test_analyze_rca_success(mock_create_team, mock_get_kb):
    """Valida o fluxo de análise com sucesso (mockando o time de IA)."""
    
    # Configura mocks
    mock_team = MagicMock()
    # No Agno, o retorno de run (ou arun) é um objeto/generator
    # Vamos mockar o retorno de run
    mock_chunk = MagicMock()
    mock_chunk.content = "Análise da IA: Causa raiz identificada como fadiga de material."
    
    mock_team.run.return_value = [mock_chunk]
    mock_create_team.return_value = mock_team
    
    mock_kb = MagicMock()
    # Mock do Vector DB para não encontrar recorrências neste teste simples
    mock_kb.vector_db.search.return_value = []
    mock_get_kb.return_value = mock_kb

    # Executa requisição
    response = client.post(
        "/analyze",
        json={
            "rca_id": "RCA-2026-001",
            "context": '{"title": "Falha na bomba", "description": "Vazamento no selo mecânico"}',
            "area_id": "area-1"
        },
        headers={"x-internal-key": INTERNAL_AUTH_KEY}
    )

    # Verificações
    assert response.status_code == 200
    
    # Valida o stream SSE
    found_content = False
    for line in response.iter_lines():
        if line.startswith("data: "):
            data_str = line[6:]
            if data_str == "[DONE]":
                break
            data = json.loads(data_str)
            if data["type"] == "content":
                assert "fadiga de material" in data["delta"]
                found_content = True
    
    assert found_content, "Não encontrou o conteúdo esperado no stream"
