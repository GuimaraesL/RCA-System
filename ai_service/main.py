# AI Service - Entrypoint
# Ponto de entrada principal que inicializa o microserviço FastAPI e a Base de Conhecimento.

from contextlib import asynccontextmanager
from fastapi import FastAPI
import uvicorn
import asyncio
from fastapi.middleware.cors import CORSMiddleware

from agent.knowledge import get_rca_knowledge_base, index_historical_rcas
from api.routes import router as api_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Starting AI Service...")
    
    # Carregar Base de Conhecimento (RAG)
    try:
        knowledge_base = get_rca_knowledge_base()
        
        # Load static knowledge from data/knowledge
        knowledge_base.add_content(path="data/knowledge")
        print("Static Knowledge Base loaded.")
        
        # Indexar Histórico de RCAs (Dinâmico) em background
        # Usamos to_thread para não bloquear o loop de eventos da FastAPI
        asyncio.create_task(asyncio.to_thread(index_historical_rcas))
        print("Background indexing task started.")
    except Exception as ke:
        print(f"Knowledge Base load failed: {ke}")

    yield
    print("AI Service stopping.")

app = FastAPI(
    title="RCA AI Service",
    version="1.2.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["Content-Type", "x-internal-key", "Authorization"],
)

app.include_router(api_router)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
