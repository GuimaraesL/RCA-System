# AI Service - Entrypoint
# Ponto de entrada principal que inicializa o microserviço FastAPI e a Base de Conhecimento.

from contextlib import asynccontextmanager
from fastapi import FastAPI
import uvicorn
import asyncio
from fastapi.middleware.cors import CORSMiddleware
from agno.os import AgentOS

from config import KNOWLEDGE_PATH
from agent.knowledge import get_rca_knowledge_base, index_historical_rcas
from rca_team import create_rca_detectives_team
from api.routes import router as api_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Starting AI Service...")
    
    # Carregar Base de Conhecimento (RAG)
    try:
        knowledge_base = get_rca_knowledge_base()
        
        knowledge_base.add_content(path=KNOWLEDGE_PATH)
        print(f"Static Knowledge Base loaded from {KNOWLEDGE_PATH}")
        
        # Indexar Histórico de RCAs (Dinâmico) em background
        # asyncio.create_task(asyncio.to_thread(index_historical_rcas))
        # print("Background indexing task started.")
    except Exception as ke:
        print(f"Knowledge Base load failed: {ke}")

    yield
    print("AI Service stopping.")

app = FastAPI(
    title="RCA AI Service",
    version="1.3.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)

# Suporte opcional a Agno OS aqui...

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
