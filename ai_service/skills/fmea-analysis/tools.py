from core.tools import get_asset_fmea_tool, get_deterministic_fmea_tool

def search_fmea_knowledge(query: str):
    """
    Busca semântica na biblioteca de FMEA (manuais e diretrizes).
    """
    return get_asset_fmea_tool(query)

def get_structured_fmea(asset_id: str):
    """
    Busca dados estruturados de FMEA para um ativo específico.
    """
    return get_deterministic_fmea_tool(asset_id)
