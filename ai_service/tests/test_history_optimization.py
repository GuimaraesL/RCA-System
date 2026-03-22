import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch
import json
import os

# Import do app para testes
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from main import app

client = TestClient(app)

# Configurações para o teste
INTERNAL_AUTH_KEY = os.environ.get("INTERNAL_AUTH_KEY", "dev-key-change-it")

@pytest.fixture
def mock_messages():
    return [
        {"role": "user", "content": "Teste de usuário"},
        {"role": "assistant", "content": "Resposta da IA <suggestions>[\"Dica 1\"]</suggestions>"},
        {"role": "system", "content": "Prompt de missão: faça isso."}
    ]

@patch("core.memory.get_agent_memory")
@patch("agents.main_agent.get_rca_agent")
def test_get_chat_history_optimized_v3(mock_get_agent, mock_get_memory, mock_messages):
    """
    Verifica se o endpoint de histórico utiliza o Storage do Agno sem instanciar o agente pesado.
    """
    # 1. Configura os Mocks do Storage e Session
    mock_storage = MagicMock()
    mock_session = MagicMock()
    mock_run = MagicMock()
    
    # Simula objetos Message do Agno (com atributos .role e .content)
    class MockMessage:
        def __init__(self, role, content):
            self.role = role
            self.content = content
            
    mock_run.messages = [MockMessage(m["role"], m["content"]) for m in mock_messages]
    mock_session.runs = [mock_run]
    
    mock_storage.get_session.side_effect = lambda sid, session_type: mock_session if session_type == 'team' else None
    mock_get_memory.return_value = mock_storage

    # 2. Executa a requisição
    rca_id = "test-rca-123"
    response = client.get(
        f"/v2/analyze/history/{rca_id}",
        headers={"x-internal-key": INTERNAL_AUTH_KEY}
    )

    # 3. Verificações de Status e Estrutura
    assert response.status_code == 200
    data = response.json()
    assert "messages" in data
    assert isinstance(data["messages"], list)
    
    # 4. Verifica se as mensagens foram processadas (filtros aplicados)
    messages = data["messages"]
    # O filtro deve remover a mensagem de sistema (system)
    assert len(messages) == 2
    
    roles = [m["role"] for m in messages]
    assert "user" in roles
    assert "assistant" in roles
    assert "system" not in roles
    
    contents = [m["content"] for m in messages]
    assert any("Teste de usuário" in c for c in contents)
    assert not any("<suggestions>" in c for c in contents)
    
    # 5. O PONTO CRÍTICO: get_rca_agent NÃO deve ter sido chamado
    assert not mock_get_agent.called, "ERRO: O agente pesado foi instanciado desnecessariamente!"
    
    # Verifica se usou o storage
    assert mock_storage.get_session.called

@patch("core.memory.get_agent_memory")
@patch("agents.main_agent.get_rca_agent")
def test_get_chat_history_agent_fallback(mock_get_agent, mock_get_memory, mock_messages):
    """
    Verifica se o endpoint tenta 'agent' se 'team' falhar.
    """
    mock_storage = MagicMock()
    mock_session = MagicMock()
    mock_run = MagicMock()
    
    class MockMessage:
        def __init__(self, role, content):
            self.role = role
            self.content = content
            
    mock_run.messages = [MockMessage(m["role"], m["content"]) for m in mock_messages]
    mock_session.runs = [mock_run]
    
    # Falha no team, funciona no agent
    def side_effect(sid, session_type):
        if session_type == 'team': return None
        if session_type == 'agent': return mock_session
        return None
        
    mock_storage.get_session.side_effect = side_effect
    mock_get_memory.return_value = mock_storage

    response = client.get(
        "/v2/analyze/history/test-fallback",
        headers={"x-internal-key": INTERNAL_AUTH_KEY}
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data["messages"]) > 0
    assert mock_storage.get_session.call_count >= 2
    assert not mock_get_agent.called
