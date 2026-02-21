# AI Service - Ferramentas do Agente
# Implementa os wrappers que permitem ao Agente Agno invocar ferramentas remotas via MCP.

from mcp_bridge import mcp_bridge

async def get_rca_context_tool(id: str) -> str:
    """Busca o contexto completo de uma RCA específica."""
    result = await mcp_bridge.call_tool("get_rca_context", arguments={"id": id})
    return result.content[0].text if result.content else "Nenhum dado encontrado."

async def get_asset_fmea_tool(asset_id: str) -> str:
    """Busca os modos de falha (FMEA) de um ativo."""
    result = await mcp_bridge.call_tool("get_asset_fmea", arguments={"asset_id": asset_id})
    return result.content[0].text if result.content else "Nenhum FMEA encontrado."

async def search_technical_taxonomy_tool(query: str) -> str:
    """Busca ativos e taxonomias técnicas."""
    result = await mcp_bridge.call_tool("search_technical_taxonomy", arguments={"query": query})
    return result.content[0].text if result.content else "Nenhum ativo encontrado."

AGENT_TOOLS = [get_rca_context_tool, get_asset_fmea_tool, search_technical_taxonomy_tool]
