import asyncio
import sys
from pathlib import Path

# Adiciona o diretório raiz ao sys.path para importar core
sys.path.append(str(Path(__file__).parent.parent))

from core.config import VECTOR_DB_PATH
from core.knowledge import rca_history_knowledge, embedder, Knowledge, ChromaDb
from agno.knowledge.reader.text_reader import TextReader
from agno.knowledge.chunking.fixed import FixedSizeChunking

async def test_proven_no_chunking():
    print("Iniciando Verificação de Integridade (No-Chunking Test)...")
    
    target_rca_id = "d794bf6f-2a3b-4672-adb1-478d61298bc7"
    
    # 1. Busca dados reais
    import httpx
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"http://localhost:3001/api/rcas/{target_rca_id}")
        rca_data = resp.json()

    # 2. Gera Conteúdo (Mesma lógica do core)
    content = f"TESTE DE INTEGRIDADE PARA RCA {target_rca_id}\n\n"
    content += "DESCRIÇÃO MUITO LONGA PARA TESTAR CORTE: " + ("X" * 1000) # 1000 chars
    
    # 3. Indexa usando a estratégia gigante
    giant_reader = TextReader(chunking_strategy=FixedSizeChunking(chunk_size=50000))
    
    print("Inserindo com Giant Reader (Sobrescrevendo se existir)...")
    rca_history_knowledge.insert(
        text=content,
        name=target_rca_id,
        metadata={"rca_id": target_rca_id},
        reader=giant_reader,
        skip_if_exists=False
    )

    # 4. Recupera e Valida
    print("\n--- RESULTADO NO CHROMADB ---")
    results = rca_history_knowledge.vector_db.search(query=target_rca_id, limit=1)
    
    if results:
        doc = results[0]
        print(f"Original Length: {len(content)}")
        print(f"Stored Length:   {len(doc.content)}")
        
        if len(doc.content) == len(content):
            print("\n[VITORIA] O conteúdo está 100% íntegro. Sem cortes.")
        else:
            print(f"\n[ERRO] O conteúdo foi cortado! Faltam {len(content) - len(doc.content)} caracteres.")
    else:
        print("Erro: Documento não encontrado após inserção.")

if __name__ == "__main__":
    asyncio.run(test_proven_no_chunking())
