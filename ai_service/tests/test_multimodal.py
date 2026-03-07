import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch, AsyncMock
import sys
import os
import json

# Adiciona o diretório ai_service ao path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app
from core.config import INTERNAL_AUTH_KEY

client = TestClient(app)

@patch("api.routes.get_rca_history_knowledge")
@patch("agents.main_agent.get_rca_agent")
@patch("httpx.AsyncClient.get", new_callable=AsyncMock)
def test_analyze_rca_multimodal(mock_http_get, mock_get_agent, mock_get_kb):
    """
    Testa se o endpoint /analyze processa corretamente anexos de imagem e vídeo
    e os repassa para o agente de IA.
    """
    # 1. Mock do download de mídia
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.content = b"fake-media-content"
    mock_http_get.return_value = mock_resp

    # 2. Mock do Agente e seu stream
    mock_agent = MagicMock()
    
    # Capturador de argumentos para verificar se as imagens/vídeos foram passados
    captured_kwargs = {}

    async def mock_arun_gen(*args, **kwargs):
        nonlocal captured_kwargs
        # Captura os kwargs passados para arun
        for k, v in kwargs.items():
            captured_kwargs[k] = v
        
        class MockEvent:
            def __init__(self, content):
                self.content = content
        
        yield MockEvent("Análise multimodal concluída.")

    mock_agent.arun = mock_arun_gen
    mock_get_agent.return_value = mock_agent
    
    # 3. Mock do Knowledge Base
    mock_kb = MagicMock()
    mock_kb.vector_db.search.return_value = []
    mock_get_kb.return_value = mock_kb

    # 4. Executa a requisição com anexos
    payload = {
        "rca_id": "RCA-MULTI-001",
        "context": '{"title": "Falha Visual", "description": "Ver imagem"}',
        "attachments": [
            {"type": "image", "url": "/api/media/rca1/img.jpg", "filename": "img.jpg"},
            {"type": "video", "url": "/api/media/rca1/vid.mp4", "filename": "vid.mp4"}
        ]
    }
    
    response = client.post(
        "/analyze",
        json=payload,
        headers={"x-internal-key": INTERNAL_AUTH_KEY}
    )

    # 5. Verificações
    assert response.status_code == 200
    
    # Verifica se o download foi chamado para ambos os arquivos
    assert mock_http_get.call_count == 2
    
    # Verifica se o agente recebeu as mídias
    assert "images" in captured_kwargs
    assert "videos" in captured_kwargs
    assert len(captured_kwargs["images"]) == 1
    assert len(captured_kwargs["videos"]) == 1
    assert captured_kwargs["images"][0].content == b"fake-media-content"
    
    # Valida se o stream contém a confirmação (usamos substring sem acentos para evitar erro de encoding no teste)
    assert "multimodal" in response.text
