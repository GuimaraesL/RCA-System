# AI Service - Configurações Globais
# Gerencia variáveis de ambiente e configurações de ambiente para o microserviço de IA.

import os
from dotenv import load_dotenv

load_dotenv()

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
BACKEND_URL = os.getenv("BACKEND_URL")
INTERNAL_AUTH_KEY = os.getenv("INTERNAL_AUTH_KEY")
NODE_ENV = os.getenv("NODE_ENV", "development")
AGNO_API_KEY = os.getenv("AGNO_API_KEY")

# Caminhos de dados (Centralizados na raiz)
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VECTOR_DB_PATH = os.path.join(PROJECT_ROOT, "data", "vector_db")
KNOWLEDGE_DB_PATH = os.path.join(PROJECT_ROOT, "data", "rca_knowledge.db")

if not GOOGLE_API_KEY:
    print("WARNING: GOOGLE_API_KEY not configured in .env")
if not BACKEND_URL:
    print("WARNING: BACKEND_URL not configured in .env")
