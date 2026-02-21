# AI Service - Entrypoint
# Ponto de entrada principal que inicializa o microserviço FastAPI e a ponte MCP.

from contextlib import asynccontextmanager
from fastapi import FastAPI
from mcp import ClientSession
import uvicorn

from mcp_bridge import mcp_bridge
from api.routes import router as api_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🚀 Starting AI Service...")
    try:
        mcp_context = await mcp_bridge.connect()
        async with mcp_context as (read_stream, write_stream):
            async with ClientSession(read_stream, write_stream) as session:
                await session.initialize()
                mcp_bridge.set_session(session)
                print("✅ MCP Bridge ready.")
                yield
    except Exception as e:
        print(f"⚠️ MCP connection failed: {e}")
        yield
    finally:
        print("🛑 AI Service stopping.")

app = FastAPI(
    title="RCA AI Service",
    version="1.1.0",
    lifespan=lifespan
)

app.include_router(api_router)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
