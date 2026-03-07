# Documentação: Knowledge e Ferramentas (Tools) do AI Service

O `ai_service` faz uso de três pilares de extensão de capacidades (`Knowledge` e `Tools`) dentro do ecossistema do Agno para transformar o LLM bruto (Gemini) num **Copiloto Especialista em RCA**.

---

## 1. Conhecimento (Knowledge Base - Documental)
Localização: `ai_service/core/knowledge.py`

O Agente Unificado (`RCA_Unified_Copilot`) não confia apenas no conhecimento nativo da IA, mas sim em bases de dados locais injetadas.

### Methodology Knowledge (`get_methodology_knowledge`)
*   **Propósito:** Fornecer as "regras do jogo". Como a empresa quer que um "5 Porquês" ou um "Plano de Ação" seja preenchido, diretrizes de manutenção e padrões de taxonomia.
*   **Vetorização:** Lê os arquivos Markdown (`.md`) da pasta de metodologias (geralmente documentações e guias operacionais locais em `ai_service/data/knowledge/`).
*   **Uso:** Quando o agente tem dúvidas sobre os formatos metodológicos aceitos (e não sobre a falha em si).

---

## 2. Ferramentas (Tools)
Localização: `ai_service/core/tools.py`

Ferramentas são funções Python (Functions as a Tool) acionadas ativamente e autonomamente pelo LLM durante o raciocínio. O modelo pausa a geração de texto, pede para o Backend executar uma Tool, e recebe o resultado antes de continuar.

### Ferramentas de Busca Histórica (Acessam o VectorDB / RAG)
*   **`search_historical_rcas_tool(query: str, area_id, equipment_id, subgroup_id)`**
    Faz a busca semântica em falhas anteriores. Possui filtros inteligentes para priorizar o Subgrupo, depois o Equipamento, depois a Área. (Ver arquivo `rag_pipeline.md` para detalhes).
*   **`get_historical_rca_summary(rca_id: str)`**
    Traz o resumo consolidado de uma falha específica já registrada, focado no contexto do problema.
*   **`get_historical_rca_causes(rca_id: str)`**
    Traz estritamente as "Causas Raízes" e "Porquês" da falha solicitada.
*   **`get_historical_rca_action_plan(rca_id: str)`**
    Lista o plano de ação (O quê, Quem, Quando) aplicado na época, acessando tanto os dados legados quanto a nova tabela de ações da V2.
*   **`get_historical_rca_triggers(rca_id: str)`**
    Traz os modos de falha/engatilhadores (FMEA associado ou sintomas iniciais) do histórico.

### Ferramentas de Domínio Específico
*   **`get_asset_fmea_tool(asset_id: str, symptom: str)`**
    Simula (ou consulta de um banco real) o FMEA (Failure Mode and Effects Analysis) de um ativo. Permite ao Agente confrontar o relato do usuário com os modos de falha matematicamente esperados em manuais de fabricantes.

### Ferramentas Externas
*   **`DuckDuckGoTools()`**
    Ferramenta nativa do framework Agno. Quando o problema técnico for uma peça obscura ou conceito fora do escopo do RAG/FMEA local, o Agente pode pesquisar na web em tempo real (ex: "Qual a folga padrão para rolamentos SKF-6204?").
