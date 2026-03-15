# AI Service - Constantes Globais

# Palavras-chave técnicas exatas que representam ferramentas do Agno.
# Usadas para suprimir narração de chamadas brutas (ex: "Running search_historical_rcas_tool").
TECHNICAL_KEYWORDS = [
    "search_historical_rcas_tool", "get_asset_fmea_tool", 
    "get_deterministic_fmea_tool", "calculate_reliability_metrics_tool",
    "get_full_rca_detail_tool", "get_historical_rca_summary",
    "get_historical_rca_causes", "get_historical_rca_action_plan",
    "get_historical_rca_triggers", "get_skill_reference",
    "get_current_screen_context", "duckduckgo", "DuckDuckGo",
    "FMEA_Technical_Specialist", "Media_Failure_Analyst", "Human_Factors_Investigator"
]

# Padrões de narração de pensamento da IA que podem ser suprimidos se a mensagem for curta ou for apenas narração.
# Se a mensagem contiver conteúdo técnico útil além disso, ela deve ser mantida.
THOUGHT_PATTERNS = [
    "As skills disponíveis são", "não foi encontrada", "Vou usar os arquivos",
    "identificada é que o roteiro", "posso gerar os artefatos",
    "Transferring to", "Running tool"
]
