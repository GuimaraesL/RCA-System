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

# Caminhos de dados (Centralizados para evitar Lock no OneDrive)
LOCAL_DATA_DIR = os.path.join(os.environ.get("LOCALAPPDATA", os.path.expanduser("~")), "RCA-System")
os.makedirs(LOCAL_DATA_DIR, exist_ok=True)

VECTOR_DB_PATH = os.path.join(LOCAL_DATA_DIR, "vector_db")
KNOWLEDGE_DB_PATH = os.path.join(LOCAL_DATA_DIR, "rca_knowledge.db")
AGENT_MEMORY_PATH = os.path.join(LOCAL_DATA_DIR, "agent_memory.db")
KNOWLEDGE_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "knowledge")

if not GOOGLE_API_KEY:
    print("WARNING: GOOGLE_API_KEY not configured in .env")
if not BACKEND_URL:
    print("WARNING: BACKEND_URL not configured in .env")
