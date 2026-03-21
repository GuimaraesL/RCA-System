"""
Teste: test_agent_caching.py

Proposta: Validar o comportamento de instanciação do Agente RCA.
Ações: 
  - Garantir que uma nova instância de Team é criada por chamada (segurança de estado).
  - Validar se a limpeza de histórico chama a invalidação do cache.
Execução: Backend Pytest / Unit Tests
Fluxo: Mock de _create_rca_agent -> Chamada get_rca_agent -> Verificação de chamadas.
"""

import pytest
from unittest.mock import patch, MagicMock
import sys
import os

# Ajusta path para importar do ai_service
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from agents.main_agent import get_rca_agent, clear_rca_agent_cache

def test_rca_agent_instantiation():
    """Garante que o agente é recriado a cada chamada para evitar poluição de estado."""
    clear_rca_agent_cache()
    
    with patch("agents.main_agent._create_rca_agent") as mock_create:
        mock_create.return_value = MagicMock(name="RCA_Team")
        
        # 1. Chamada: deve criar
        get_rca_agent("s1")
        assert mock_create.call_count == 1
        
        # 2. Segunda chamada: deve criar NOVO (sem cache de objeto completo)
        get_rca_agent("s1")
        assert mock_create.call_count == 2

@patch("agents.main_agent.clear_rca_agent_cache")
def test_history_delete_calls_clear(mock_clear):
    """Verifica gatilho de limpeza."""
    from fastapi.testclient import TestClient
    from main import app
    from core.config import INTERNAL_AUTH_KEY

    client = TestClient(app)
    # Mock do resto do delete para evitar tocar no DB real
    with patch("core.memory.get_agent_memory"), \
         patch("core.knowledge.get_recurrence_analysis") as mock_get_rec:
        
        mock_get_rec.return_value = None # Simula que não há análise prévia
        
        client.delete(
            "/v2/analyze/history/test",
            headers={"x-internal-key": INTERNAL_AUTH_KEY}
        )
        assert mock_clear.called

if __name__ == "__main__":
    test_rca_agent_instantiation()
    print("test_rca_agent_instantiation: PASSED")
    test_history_delete_calls_clear()
    print("test_history_delete_calls_clear: PASSED")
