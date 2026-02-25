import httpx
from config import BACKEND_URL

def get_rca_context_tool(rca_id: str):
    """Busca contexto histórico de uma RCA específica no backend."""
    try:
        url = f"{BACKEND_URL}/api/rcas/{rca_id}"
        with httpx.Client() as client:
            resp = client.get(url, timeout=5.0)
            if resp.status_code == 200:
                data = resp.json()
                rca = data.get('data', data)
                return (
                    f"CONTEXTO RCA {rca_id}: "
                    f"Título: {rca.get('what')}, "
                    f"Descrição: {rca.get('description')}, "
                    f"Ativo: {rca.get('asset')}"
                )
            return f"Nota: RCA {rca_id} não encontrada no backend."
    except Exception as e:
        return f"Erro ao buscar contexto da RCA: {str(e)}"

def get_asset_fmea_tool(equipment_id: str):
    """Busca modos de falha mapeados para este equipamento no FMEA do sistema."""
    # Retornamos vazio ou mensagem de erro para forçar o agente a não alucinar, 
    # já que o banco de FMEA ainda não está populado.
    return f"Nota: Não foram encontrados registros de FMEA para o Ativo ID {equipment_id} no Banco de Dados."

def search_technical_taxonomy_tool(query: str):
    """Busca termos técnicos na taxonomia do sistema."""
    try:
        # Simulação
        return f"RESULTADOS TAXONOMIA para '{query}': Componente Hidráulico, Válvula Direcional."
    except Exception as e:
        return f"Erro na taxonomia: {str(e)}"

def search_historical_rcas_tool(query: str, equipment_id: str = None, area_id: str = None):
    """
    Busca RCAs históricas (Análises de Falha antigas) no banco vetorial usando busca por similaridade.
    Use sempre esta ferramenta quando o usuário pedir para verificar recorrências ou falhas similares recentes.
    Você pode passar o equipment_id ou area_id para restringir a busca, se os souber.
    """
    from agent.knowledge import get_rca_history_knowledge
    knowledge_base = get_rca_history_knowledge()
    
    filters = {}
    if equipment_id:
        filters["equipment_id"] = str(equipment_id)
    elif area_id:
        filters["area_id"] = str(area_id)
        
    try:
        # Usamos o vector_db diretamente para ter mais controle dos metadados
        results = knowledge_base.vector_db.search(query=query, limit=5, filters=filters if filters else None)
        if not results:
            return f"Nenhuma RCA histórica foi encontrada no RAG para a busca: '{query}'"
            
        formatted_results = []
        for doc in results:
            rid = doc.meta_data.get("rca_id", "Desconhecido")
            asset = doc.meta_data.get("asset", "Desconhecido")
            
            # Formatar as primeiras linhas para resumo sem poluir demais o prompt
            lines = doc.content.split("\n")
            preview = "\n".join(lines[:6]) # Pega as primeiras 6 linhas com Título, Data, Descrição e Causa
            
            formatted_results.append(
                f"--- RCA ID: {rid} ---\n"
                f"Ativo: {asset}\n"
                f"Conteúdo Indexado:\n{preview}..."
            )
            
        return "RCAS HISTÓRICAS ENCONTRADAS:\n\n" + "\n\n".join(formatted_results)
    except Exception as e:
        return f"Erro ao realizar a busca RAG: {str(e)}"
