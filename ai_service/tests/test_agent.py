import pytest
from unittest.mock import MagicMock, patch
import sys
import os

# Adiciona o diretório ai_service ao path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from agent.teams.lead_detective import get_detective_agent

@patch("agent.teams.lead_detective.Gemini")
@patch("agent.teams.lead_detective.Agent")
@patch("agent.teams.lead_detective.get_rca_history_knowledge")
def test_get_detective_agent(mock_get_kb, mock_agent_class, mock_gemini):
    """Valida se a factory do agente instancia o Agno Agent com as configurações corretas."""
    
    mock_kb = MagicMock()
    mock_get_kb.return_value = mock_kb
    
    agent = get_detective_agent()
    
    # Verifica se o Agent foi instanciado com os componentes esperados
    mock_agent_class.assert_called_once()
    args, kwargs = mock_agent_class.call_args
    
    assert kwargs["knowledge"] == mock_kb
    assert len(kwargs["tools"]) > 0
    assert "Investigador" in kwargs["role"] or "Lead Investigator" in kwargs["role"]
