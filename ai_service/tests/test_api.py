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

client = TestClient(app)

def test_health_check():
    """Valida se o endpoint de health check está respondendo corretamente."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "alive"}

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
@patch("api.routes.get_rca_detective_agent")
def test_analyze_rca_success(mock_get_agent, mock_get_kb):
    """Valida o fluxo de análise com sucesso (mockando o agente de IA)."""
    
    # Configura mocks
    mock_agent = MagicMock()
    # No Agno, o retorno de arun é um objeto que tem o atributo content
    mock_response = MagicMock()
    mock_response.content = "Análise da IA: Causa raiz identificada como fadiga de material."
    
    # Como arun é async, precisamos mockar o retorno como um objeto que pode ser 'awaited'
    # O TestClient do FastAPI lida com o loop de eventos se o endpoint for async
    async def async_response(*args, **kwargs):
        return mock_response
    
    mock_agent.arun.side_effect = async_response
    mock_get_agent.return_value = mock_agent
    
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
    data = response.json()
    assert data["rca_id"] == "RCA-2026-001"
    assert "fadiga de material" in data["ai_insight"]
    assert data["status"] == "completed"
    assert data["recurrences"] == []
