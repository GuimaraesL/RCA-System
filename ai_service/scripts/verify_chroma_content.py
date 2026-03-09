import asyncio
import sys
from pathlib import Path

# Adiciona o diretório raiz ao sys.path para importar core
sys.path.append(str(Path(__file__).parent.parent))

from core.config import VECTOR_DB_PATH
from core.knowledge import rca_history_knowledge, embedder, Knowledge, ChromaDb
from agno.knowledge.document import Document

async def test_real_embedding_retrieval():
    print("Iniciando Teste de Fogo Real (VectorDB Retrieval)...")
    
    # Selecionamos um ID específico para garantir consistência
    target_rca_id = "d794bf6f-2a3b-4672-adb1-478d61298bc7"
    
    # Limpamos apenas este ID do VectorDB para garantir que vamos ler o novo
    try:
        rca_history_knowledge.vector_db.delete(where={"rca_id": target_rca_id})
        print(f"Limpo registro anterior de {target_rca_id}")
    except:
        pass

    # Forçamos a indexação (ou simulamos a inserção real via agno)
    # Pegamos os dados via API local primeiro
    import httpx
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"http://localhost:3001/api/rcas/{target_rca_id}")
        rca_data = resp.json()

    # Mimic da lógica do knowledge.py (copiada exatamente)
    rca_id = str(rca_data.get('id'))
    area_id = rca_data.get('area_id')
    equip_id = rca_data.get('equipment_id')
    subg_id = rca_data.get('subgroup_id')
    asset_dict = rca_data.get('asset', {})
    area_name = asset_dict.get('area_name') if isinstance(asset_dict, dict) else None
    equip_name = asset_dict.get('equipment_name') if isinstance(asset_dict, dict) else None
    subg_name = asset_dict.get('subgroup_name') if isinstance(asset_dict, dict) else None
    comp_type = rca_data.get('component_type')
    
    area_label = area_name or area_id
    equip_label = equip_name or equip_id
    subg_label = subg_name or subg_id

    location_parts = []
    if area_label: location_parts.append(f"na área {area_label}")
    if equip_label: location_parts.append(f"afetando o equipamento {equip_label}")
    if subg_label: location_parts.append(f"com impacto focado no subgrupo {subg_label}")
    if comp_type: location_parts.append(f"no componente {comp_type}")

    content_parts = []
    if location_parts:
        content_parts.append(f"LOCALIZAÇÃO DO ATIVO: O incidente ocorreu {', '.join(location_parts)}.")
        
    what_desc = rca_data.get('what')
    if what_desc: content_parts.append(f"RESUMO DO PROBLEMA: {what_desc}")
    
    problem_desc = rca_data.get('problem_description', rca_data.get('description'))
    if problem_desc: content_parts.append(f"DESCRIÇÃO TÉCNICA (SINTOMAS): {problem_desc}")
    
    causes = [c.get('cause', '') for c in rca_data.get('root_causes', [])]
    if causes: content_parts.append(f"CAUSAS RAIZ: " + " | ".join(causes))

    content = "\n\n".join(content_parts).strip()

    test_knowledge = Knowledge(
        vector_db=ChromaDb(
            collection="rca_history_v1",
            path=VECTOR_DB_PATH,
            persistent_client=True,
            embedder=embedder
        ),
        name="Test Search"
    )

    print(f"Indexando no ChromaDB via UPSERT DIRETO (Bypass Agno Chunking)...")
    doc = Document(
        name=rca_id,
        content=content,
        meta_data={
            "rca_id": rca_id,
            "area_id": str(area_id or ""),
            "equipment_id": str(equip_id or ""),
            "subgroup_id": str(subg_id or "")
        }
    )
    
    # Chamamos o upsert diretamente no vector_db da instância de teste
    test_knowledge.vector_db.upsert(documents=[doc])

    # AGORA O TESTE DE VERDADE: Busca o que ACABOU de ser gravado no ChromaDB
    # Usamos a instância de teste para a busca
    print("\n--- BUSCANDO CONTEÚDO REAL DO VECTOR DB ---")
    results = test_knowledge.vector_db.search(query="olhal do cilindro", limit=1)
    
    if results:
        doc = results[0]
        print(f"ID Recuperado: {doc.meta_data.get('rca_id')}")
        print(f"Meta Area: {doc.meta_data.get('area_id')}")
        # Verifica se houve corte (chunking)
        print(f"\n[DEBUG] Comparação de tamanhos:")
        print(f"  - Texto Gerado: {len(content)} caracteres")
        print(f"  - Texto no VectorDB: {len(doc.content)} caracteres")
        
        if len(doc.content) == len(content):
            print("\n[SUCESSO] O conteúdo está ÍNTEGRO no ChromaDB.")
        else:
            print("\n[FALHA] O CONTEÚDO FOI CORTADO!")
            print("\nTRECHO FALTANTE (se houver):")
            print("-" * 30)
            if len(content) > len(doc.content):
                print(content[len(doc.content):])
            print("-" * 30)
    else:
        print("Nenhum resultado encontrado no VectorDB.")

if __name__ == "__main__":
    asyncio.run(test_real_embedding_retrieval())
