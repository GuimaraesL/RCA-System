import sys
import os

# Adiciona o diretório pai ao PYTHONPATH para importar módulos do ai_service
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from agent.knowledge import index_historical_rcas

if __name__ == "__main__":
    print("🚀 Starting manual RAG indexing...")
    index_historical_rcas()
    print("✅ Indexing complete.")
