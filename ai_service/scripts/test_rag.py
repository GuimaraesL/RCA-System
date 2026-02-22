import sys
import os

# Adiciona o diretório pai ao PYTHONPATH para importar módulos do ai_service
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from agent.knowledge import get_rca_knowledge_base
from agno.knowledge.document import Document

def test_rag_retrieval():
    print("🧪 Testing RAG Retrieval...")
    
    kb = get_rca_knowledge_base()
    
    # 1. Adicionar documento de teste
    test_doc = Document(
        content="A falha na bomba de vácuo X-200 foi causada por desgaste prematuro do rolamento devido à falta de lubrificação.",
        meta_data={"source": "test_script", "id": "TEST-001"}
    )
    
    try:
        # kb.load_documents([test_doc], upsert=True)
        kb.add_content(
            text_content=test_doc.content,
            metadata=test_doc.meta_data,
            name="TEST-001",
            upsert=True
        )
        print("✅ Test document added.")
    except Exception as e:
        print(f"❌ Failed to add document: {e}")
        return

    # 2. Consultar
    query = "Por que a bomba X-200 falhou?"
    print(f"🔍 Querying: '{query}'")
    
    try:
        # A API do Agno pode variar, knowledge_base.search() ou similar.
        # Vamos usar o vector_db diretamente para garantir
        results = kb.vector_db.search(query, limit=1)
        
        if results and len(results) > 0:
            print(f"✅ Found {len(results)} result(s).")
            print(f"   Top result: {results[0].content}")
            
            if "desgaste prematuro" in results[0].content:
                print("✅ Content match confirmed!")
            else:
                print("⚠️ Content mismatch.")
        else:
            print("❌ No results found.")
            
    except Exception as e:
        print(f"❌ Search failed: {e}")

if __name__ == "__main__":
    test_rag_retrieval()
