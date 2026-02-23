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
