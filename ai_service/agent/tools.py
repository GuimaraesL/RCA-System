# AI Service - Ferramentas do Agente
# Define as capacidades que o Agente Detective pode invocar via chamadas HTTP ao Backend.

import httpx
import os
from typing import Optional
from config import INTERNAL_AUTH_KEY, BACKEND_URL

# Cabeçalhos de Autenticação Interna
AUTH_HEADERS = {
    "x-internal-key": INTERNAL_AUTH_KEY,
    "Content-Type": "application/json"
}

async def get_rca_context_tool(id: str) -> str:
    """Busca o contexto completo de uma RCA específica no backend principal."""
    print(f"DEBUG: Tool get_rca_context_tool(id={id})")
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                f"{BACKEND_URL}/rcas/{id}", 
                headers=AUTH_HEADERS, 
                timeout=5.0
            )
            if response.status_code == 200:
                data = response.json()
                return f"CONTEXTO RCA {id}:\n{data}"
            return f"Erro ao buscar RCA: Status {response.status_code}"
        except Exception as e:
            return f"Falha na comunicação com backend: {str(e)}"

async def get_asset_fmea_tool(asset_id: str) -> str:
    """Busca os modos de falha (FMEA) de um ativo no backend."""
    print(f"DEBUG: Tool get_asset_fmea_tool(asset_id={asset_id})")
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                f"{BACKEND_URL}/assets/{asset_id}/fmea", 
                headers=AUTH_HEADERS, 
                timeout=5.0
            )
            if response.status_code == 200:
                return f"FMEA ATIVO {asset_id}:\n{response.text}"
            return "Nenhum FMEA encontrado para este ativo."
        except Exception as e:
            return f"Erro ao buscar FMEA: {str(e)}"

async def search_technical_taxonomy_tool(query: str) -> str:
    """Busca ativos e taxonomias técnicas no catálogo do sistema."""
    print(f"DEBUG: Tool search_technical_taxonomy_tool(query={query})")
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                f"{BACKEND_URL}/taxonomy/search", 
                params={"q": query}, 
                headers=AUTH_HEADERS, 
                timeout=5.0
            )
            if response.status_code == 200:
                return f"RESULTADOS TAXONOMIA:\n{response.text}"
            return "Nenhum resultado técnico encontrado."
        except Exception as e:
            return f"Erro na busca técnica: {str(e)}"

# Lista de ferramentas que o Agente Agno pode usar
AGENT_TOOLS = [get_rca_context_tool, get_asset_fmea_tool, search_technical_taxonomy_tool]
