# AI Service - Configurações Globais
# Gerencia variáveis de ambiente e configurações de ambiente para o microserviço de IA.

import os
from dotenv import load_dotenv

load_dotenv()

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
MCP_SERVER_URL = os.getenv("MCP_SERVER_URL", "http://localhost:3001/api/mcp/sse")
INTERNAL_AUTH_KEY = os.getenv("INTERNAL_AUTH_KEY", "dev-key-change-it")
NODE_ENV = os.getenv("NODE_ENV", "development")

if not GOOGLE_API_KEY:
    print("GOOGLE_API_KEY not configured.")
