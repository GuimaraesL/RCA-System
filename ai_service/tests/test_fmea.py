import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch
import sys
import os
import json

# Adiciona o diretório ai_service ao path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app
from core.config import INTERNAL_AUTH_KEY

client = TestClient(app)

@patch("agno.agent.Agent.run")
def test_extract_fmea_success(mock_agent_run):
    """
    Testa se o endpoint de extração de FMEA processa o texto e retorna o JSON estruturado corretamente.
    """
    # Mock da resposta da IA
    mock_response = MagicMock()
    mock_response.content = """
    ```json
    [
      {
        "failure_mode": "Desgaste de Rolamento",
        "potential_effects": "Vibração excessiva e parada",
        "severity": 8,
        "potential_causes": "Falta de lubrificação",
        "occurrence": 4,
        "current_controls": "Análise de vibração mensal",
        "detection": 3,
        "recommended_actions": "Aumentar frequência de lubrificação"
      }
    ]
    ```
    """
    mock_agent_run.return_value = mock_response

    payload = {
        "text": "O rolamento costuma desgastar por falta de graxa, causando vibração.",
        "ui_language": "Português-BR"
    }
    
    headers = {"X-Internal-Key": INTERNAL_AUTH_KEY}
    
    response = client.post("/v2/fmea/extract-fmea", json=payload, headers=headers)
    
    assert response.status_code == 200
    data = response.json()
    assert "modes" in data
    assert len(data["modes"]) == 1
    assert data["modes"][0]["failure_mode"] == "Desgaste de Rolamento"
    assert data["modes"][0]["severity"] == 8

def test_extract_fmea_invalid_auth():
    """
    Testa se o endpoint bloqueia acesso sem a chave interna correta.
    """
    payload = {"text": "teste"}
    response = client.post("/v2/fmea/extract-fmea", json=payload, headers={"X-Internal-Key": "errada"})
    assert response.status_code == 403

@patch("agno.agent.Agent.run")
def test_extract_fmea_ai_format_error(mock_agent_run):
    """
    Testa o comportamento quando a IA retorna um JSON inválido.
    """
    mock_response = MagicMock()
    mock_response.content = "Desculpe, não consegui formatar os dados."
    mock_agent_run.return_value = mock_response

    payload = {"text": "texto qualquer"}
    headers = {"X-Internal-Key": INTERNAL_AUTH_KEY}
    
    response = client.post("/v2/fmea/extract-fmea", json=payload, headers=headers)
    
    assert response.status_code == 500
    assert "IA gerou um formato de dados inválido" in response.json()["detail"]
