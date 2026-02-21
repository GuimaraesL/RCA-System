# AI Service - MCP Bridge
# Gerencia o ciclo de vida e a comunicação JSON-RPC via SSE com o servidor MCP do backend.

from typing import Optional
from mcp import ClientSession
from mcp.client.sse import sse_client
from config import MCP_SERVER_URL

class McpBridge:
    session: Optional[ClientSession] = None
    _client_context = None

    @classmethod
    async def connect(cls):
        print(f"🔌 Connecting to MCP Server: {MCP_SERVER_URL}")
        cls._client_context = sse_client(url=MCP_SERVER_URL)
        return cls._client_context

    @classmethod
    def set_session(cls, session: ClientSession):
        cls.session = session

    @classmethod
    async def call_tool(cls, name: str, arguments: dict):
        if not cls.session:
            raise RuntimeError("MCP Session not initialized")
        return await cls.session.call_tool(name, arguments)

mcp_bridge = McpBridge()
