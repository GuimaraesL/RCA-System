from contextlib import asynccontextmanager
from fastapi import FastAPI
import uvicorn
import asyncio
import os
from fastapi.middleware.cors import CORSMiddleware
from agno.os import AgentOS

from core.config import KNOWLEDGE_PATH
from core.knowledge import get_rca_history_knowledge, get_methodology_knowledge, index_historical_rcas
from api.routes import router as api_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    import os
    os.environ["AGNO_DEBUG"] = "True"
    print("🚀 Iniciando RCA AI Service com AGNO_DEBUG=True...")
    # Sincroniza RCAs históricas logo no startup
    try:
        index_historical_rcas()
        print("✅ Sincronização de RCAs concluída.")
    except Exception as e:
        print(f"⚠️ Falha na sincronização inicial: {e}")
    # Reload trigger comment
    yield
    print("🛑 AI Service finalizando.")

# 1. Instanciar Componentes Globais (Para que o Dashboard os veja)
print(f"📂 Verificando Knowledge Path: {KNOWLEDGE_PATH}")
if os.path.exists(KNOWLEDGE_PATH):
    print(f"✅ Diretório de conhecimento encontrado.")
else:
    print(f"⚠️ AVISO: Diretório {KNOWLEDGE_PATH} NÃO encontrado.")

history_kb = get_rca_history_knowledge()
methodology_kb = get_methodology_knowledge()
methodology_kb.add_content(path=KNOWLEDGE_PATH)

# Usamos a memória padrão para o AgentOS monitorar
from core.memory import get_agent_memory
storage = get_agent_memory("rca_system_storage")

# 2. Instanciar Agentes/Times para Visibilidade no Dashboard (Studio)
from agents.super_agent import get_super_agent
from agents.chat_agent import get_chat_agent

# Preview do Time de Análise (Team) e do Chat Agent (Agent individual)
rca_team_preview = get_super_agent("preview_super")
chat_agent_preview = get_chat_agent("preview_chat")

# 3. Inicializar o AgentOS
agent_os = AgentOS(
    name="RCA System OS",
    agents=[chat_agent_preview],
    teams=[rca_team_preview],
    knowledge=[history_kb, methodology_kb], 
    db=storage,             
    tracing=True
)

# 4. Obter a aplicação FastAPI e vincular o lifespan
app = agent_os.get_app()
app.router.lifespan_context = lifespan

# 4. Customização Adicional do App
app.title = "RCA AI Service (Agno OS Powered)"
app.version = "1.4.0"

# Adicionar as rotas customizadas existentes para manter compatibilidade com o frontend atual
app.include_router(api_router)

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
