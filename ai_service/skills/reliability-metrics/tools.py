from core.tools import calculate_reliability_metrics_tool

def analyze_asset_reliability(rca_ids: list[str]):
    """
    Calcula indicadores de MTBF e MTTR para um ativo baseado em falhas passadas.
    """
    return calculate_reliability_metrics_tool(rca_ids)
