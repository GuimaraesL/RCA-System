import asyncio
import sys
from pathlib import Path

# Adiciona o diretório raiz ao sys.path para importar core
sys.path.append(str(Path(__file__).parent.parent))

from core.config import VECTOR_DB_PATH
from core.knowledge import embedder, Knowledge, ChromaDb, TextReader, FixedSizeChunking

async def test_definitive_no_chunking():
    log_path = Path("rag_final_proof.txt")
    print(f"Iniciando Prova Definitiva de Integridade. Resultados em {log_path}")
    
    unique_test_id = "test-atomic-rca-final-v2"
    
    # 1. Instanciamos uma base de conhecimento LIMPA para o teste
    # Usamos uma collection nova "test_integrity_check"
    test_knowledge = Knowledge(
        vector_db=ChromaDb(
            collection="test_integrity_check",
            path=VECTOR_DB_PATH,
            persistent_client=True,
            embedder=embedder
        ),
        readers=[
            TextReader(chunking_strategy=FixedSizeChunking(chunk_size=50000))
        ],
        name="Test Integrity"
    )
    
    # 2. Gera Conteúdo de 2000 chars (definitivamente maior que o chunk padrão de 500-1000)
    content = f"ID_PROVA_REAL: {unique_test_id}\n\n"
    content += "DADOS TÉCNICOS: " + ("ABCDE" * 400) # 2000 chars
    
    print(f"Original Length: {len(content)}")

    # 3. Indexa
    print("Inserindo na coleção de teste...")
    test_knowledge.add_content(
        text_content=content,
        name=unique_test_id,
        metadata={"rca_id": unique_test_id},
        upsert=True
    )

    # 4. Recupera e Valida
    print("\n--- BUSCANDO NA COLEÇÃO DE TESTE ---")
    results = test_knowledge.vector_db.search(query=unique_test_id, limit=1)
    
    with open(log_path, "w", encoding="utf-8") as f:
        f.write("PROVA FINAL DE INTEGRIDADE RAG\n")
        f.write("=" * 30 + "\n")
        if results:
            doc = results[0]
            f.write(f"Original Length: {len(content)}\n")
            f.write(f"Stored Length:   {len(doc.content)}\n")
            
            diff = abs(len(doc.content) - len(content))
            if diff <= 2:
                f.write("\n[VITORIA] INTEGRIDADE 100% CONFIRMADA. Sem fatiamento.\n")
                f.write(f"RETRIEVED CONTENT MATCHES ID: {unique_test_id in doc.content}\n")
            else:
                f.write(f"\n[ERRO] O Agno ainda está fatiando! Diferença de {diff} caracteres.\n")
                f.write(f"TRECHO NO BANCO (primeiros 100): {doc.content[:100]}\n")
        else:
            f.write("Erro: Documento não encontrado na coleção de teste.\n")

if __name__ == "__main__":
    asyncio.run(test_definitive_no_chunking())
