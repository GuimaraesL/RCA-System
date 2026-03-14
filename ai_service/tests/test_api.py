import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch
import sys
import os

# Adiciona o diretório ai_service ao path para permitir imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Importa o app após configurar o path
from main import app
from core.config import INTERNAL_AUTH_KEY
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

def test_security_rejection_all_endpoints():
    """Valida se múltiplos endpoints rejeitam chaves inválidas (Timing Attack fix)."""
    endpoints = [
        ("/fmea/files", "GET"),
        ("/extract-fmea", "POST"),
        ("/analyze/history/rca-123", "DELETE"),
        ("/recurrence/rca-123", "GET"),
    ]
    
    for path, method in endpoints:
        if method == "GET":
            response = client.get(path, headers={"x-internal-key": "invalid"})
        elif method == "POST":
            response = client.post(path, json={}, headers={"x-internal-key": "invalid"})
        elif method == "DELETE":
            response = client.delete(path, headers={"x-internal-key": "invalid"})
            
        assert response.status_code == 403, f"Endpoint {path} ({method}) não barrou chave inválida"
        assert response.json()["detail"] == "Invalid Internal Key"

    # Testa também sem o header (deve cair no compare_digest(None or '', ...))
    response = client.get("/fmea/files")
    assert response.status_code == 403
    assert response.json()["detail"] == "Invalid Internal Key"

def test_recurrence_info_model_subgroup_name():
    """Valida se o modelo RecurrenceInfo aceita o campo subgroup_name (Issue #141)."""
    from api.models import RecurrenceInfo
    
    info = RecurrenceInfo(
        rca_id="RCA-123",
        similarity=0.85,
        title="Teste Recorrência",
        level="subgroup",
        subgroup_name="Subgrupo A",
        equipment_name="Equipamento B",
        area_name="Área C"
    )
    
    assert info.subgroup_name == "Subgrupo A"
    assert info.equipment_name == "Equipamento B"
    assert info.area_name == "Área C"
    assert info.rca_id == "RCA-123"

@patch("api.routes.get_rca_history_knowledge")
@patch("agents.main_agent.get_rca_agent")
def test_analyze_rca_success(mock_get_agent, mock_get_kb):
    """Valida o fluxo de análise com sucesso (mockando o time de IA)."""
    
    # Configura mocks
    mock_team = MagicMock()
    
    # Mock do stream SSE (Agno 2.x usa arun como generator)
    async def mock_arun_gen(*args, **kwargs):
        # Simula o objeto RunEvent/RunContentEvent ou similar que o routes.py espera
        class MockEvent:
            def __init__(self, content):
                self.content = content
        
        yield MockEvent("Análise da IA: Causa raiz identificada como fadiga de material.")

    mock_team.arun = mock_arun_gen
    mock_get_agent.return_value = mock_team
    
    mock_kb = MagicMock()
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
