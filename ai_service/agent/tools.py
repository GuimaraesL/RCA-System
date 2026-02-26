import httpx
from config import BACKEND_URL

def get_asset_fmea_tool(equipment_id: str):
    """
    Busca modos de falha mapeados para este equipamento no FMEA do sistema.
    Use esta ferramenta quando precisar de base técnica sobre falhas conhecidas de um ativo.
    """
    # Retornamos mensagem informativa para evitar alucinação enquanto o FMEA não é populado.
    return f"Nota: Não foram encontrados registros de FMEA para o Ativo ID {equipment_id} no Banco de Dados. Sugira causas baseadas na sua experiência geral."

def search_historical_rcas_tool(query: str, subgroup_id: str = None, equipment_id: str = None, area_id: str = None, search_scope: str = "auto"):
    """
    Busca RCAs históricas no banco vetorial (conhecimento coletivo) com suporte a hierarquia de ativos.
    Retorna o conteúdo COMPLETO das RCAs encontradas.

    Args:
        query (str): Termo de busca (ex: 'vazamento de óleo', 'falha rolamento').
        subgroup_id (str, optional): ID do subgrupo para busca restrita.
        equipment_id (str, optional): ID do equipamento para busca restrita.
        area_id (str, optional): ID da área para busca restrita.
        search_scope (str): 'auto' (segue hierarquia Subgrupo > Equipamento > Área), 
                          'subgroup', 'equipment' ou 'area' para busca fixa em um nível.
    """
    from agent.knowledge import get_rca_history_knowledge
    knowledge_base = get_rca_history_knowledge()
    
    # Define a ordem de fallback se o escopo for 'auto'
    hierarchy_configs = [
        ("subgroup", subgroup_id),
        ("equipment", equipment_id),
        ("area", area_id)
    ]
    
    results = []
    level_found = "Geral"
    
    try:
        if search_scope == "auto":
            # Tenta do mais específico para o mais abrangente
            for level_name, level_id in hierarchy_configs:
                if level_id:
                    filters = {f"{level_name}_id": str(level_id)}
                    res = knowledge_base.vector_db.search(query=query, limit=5, filters=filters)
                    if res:
                        results = res
                        level_found = level_name
                        break
            
            # Se ainda não houver resultados e nenhum ID foi passado, faz busca global
            if not results:
                results = knowledge_base.vector_db.search(query=query, limit=5)
        else:
            # Busca em escopo específico solicitado pelo agente
            target_id = None
            if search_scope == "subgroup": target_id = subgroup_id
            elif search_scope == "equipment": target_id = equipment_id
            elif search_scope == "area": target_id = area_id
            
            filters = {f"{search_scope}_id": str(target_id)} if target_id else None
            results = knowledge_base.vector_db.search(query=query, limit=5, filters=filters)
            level_found = search_scope

        if not results:
            return f"Nenhuma RCA histórica foi encontrada no RAG para a busca: '{query}' dentro do escopo '{search_scope}'."
            
        formatted_results = []
        for doc in results:
            rid = doc.meta_data.get("rca_id", "Desconhecido")
            # Retorna o conteúdo COMPLETO da RCA formatada no knowledge.py
            formatted_results.append(
                f"--- RCA ID: {rid} (Similaridade encontrada no nível: {level_found.upper()}) ---\n"
                f"{doc.content.strip()}"
            )
            
        return "RCAS HISTÓRICAS ENCONTRADAS (DADOS COMPLETOS):\n\n" + "\n\n".join(formatted_results)
    except Exception as e:
        return f"Erro ao realizar a busca RAG: {str(e)}"
