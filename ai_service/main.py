from contextlib import asynccontextmanager
from fastapi import FastAPI
import uvicorn
import asyncio
import os
from fastapi.middleware.cors import CORSMiddleware
from agno.os import AgentOS

from core.config import KNOWLEDGE_PATH
from core.knowledge import (
    get_rca_history_knowledge, 
    index_historical_rcas, 
    get_fmea_knowledge, 
    index_fmea_documents,
    index_technical_documents
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    import os
    os.environ["AGNO_DEBUG"] = "True"
    print("[INFO] Iniciando RCA AI Service com AGNO_DEBUG=True...")
    # Sincroniza conhecimento em background — Não bloqueia o startup (Fix #169)
    async def run_initial_sync():
        try:
            print("[INFO] Iniciando sincronização RAG em background...")
            await asyncio.to_thread(index_historical_rcas)
            await asyncio.to_thread(index_fmea_documents)
            await asyncio.to_thread(index_technical_documents)
            print("[OK] Sincronização em background concluída.")
        except Exception as e:
            print(f"[ERROR] Falha na sincronização em background: {e}")

    asyncio.create_task(run_initial_sync())
    yield
    print("[STOP] AI Service finalizando.")

# 1. Instanciar Componentes Globais (Para que o Dashboard os veja)
print(f"[KNOWLEDGE] Verificando Knowledge Path: {KNOWLEDGE_PATH}")
if os.path.exists(KNOWLEDGE_PATH):
    print(f"[OK] Diretório de conhecimento encontrado.")
history_kb = get_rca_history_knowledge()
fmea_kb = get_fmea_knowledge()
from core.memory import get_agent_memory
storage = get_agent_memory()

# 2. Instanciar Agentes/Times/Workflows para Visibilidade no Dashboard (Studio)
from agents.fmea_agent import get_fmea_agent
from agents.hfacs_agent import get_hfacs_agent
from agents.media_analyst import get_media_analyst_agent
from agents.main_agent import get_rca_agent

# Instâncias individuais para o AgentOS (Metadata & Monitoring)
fmea_agent = get_fmea_agent()
hfacs_agent = get_hfacs_agent()
media_agent = get_media_analyst_agent()
# O rca_team precisa de uma session_id para ser instanciado, usamos uma dummy para o OS registrar o schema
rca_team = get_rca_agent(session_id="agent-os-registry")

# [ADR-003] Agno 2.x Support: Registrar agents e teams para que as rotas /agents e /teams funcionem.
# O AgentOS mapeia automaticamente as rotas baseado nessas listas.

# 3. Inicializar o AgentOS (Monitoramento do Dashboard)
agent_os = AgentOS(
    name="RCA System OS",
    agents=[fmea_agent, hfacs_agent, media_agent],
    teams=[rca_team],
    knowledge=[history_kb, fmea_kb], 
    db=storage,             
    tracing=True
)

# 4. Obter a aplicação FastAPI e vincular o lifespan
app = agent_os.get_app()
app.router.lifespan_context = lifespan

# 4. Customização Adicional do App
app.title = "RCA AI Service (Agno OS Powered)"
app.version = "1.4.0"

# Rotas V2 modularizadas
from api.v2 import v2_router
app.include_router(v2_router, prefix="/v2")

# Garantir que o CORS permita o dashboard da Agno
# Quando allow_credentials=True, allow_origins NÃO pode ser "*"
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://os.agno.com",
        "https://app.agno.com",
        "http://localhost:3000", # Caso você rode o frontend localmente
        "http://localhost:8000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if __name__ == "__main__":
    # Garante a chave da Agno para conexão com o dashboard
    if not os.getenv("AGNO_API_KEY"):
        print("⚠️ AVISO: AGNO_API_KEY não encontrada. A conexão com os.agno.com pode falhar.")
        
    uvicorn.run(app, host="0.0.0.0", port=8000)
