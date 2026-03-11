# Documentação: Knowledge e Ferramentas (Tools) do AI Service

O ai_service faz uso de dois pilares de extensão de capacidades (Knowledge e Tools) dentro do ecossistema do Agno para transformar o LLM bruto (Gemini) num Copiloto Especialista em RCA.

---

## 1. Conhecimento (Knowledge Base - RAG)
Localização: `ai_service/core/knowledge.py`

Diferente da IA genérica, o Copiloto RCA utiliza três bases de dados locais vetorizadas para fundamentar suas respostas.

### RCA History (`rca_history_knowledge`)
*   **Propósito:** Memória coletiva das falhas da empresa.
*   **Conteúdo:** Mais de 2.800 RCAs concluídas, indexadas por área, equipamento e subgrupo.
*   **Uso:** Identificação de recorrências e lições aprendidas de casos reais.

### FMEA Library (`fmea_knowledge`)
*   **Propósito:** Biblioteca de Modos de Falha e Efeitos.
*   **Conteúdo:** Manuais técnicos internos e diretrizes de manutenção em formato **Markdown (.md)**.
*   **Uso:** Consultar a "teoria" esperada para cada tipo de falha mecânica ou elétrica.

### Technical Documentation (`technical_docs_knowledge`) - **NOVO**
*   **Propósito:** Indexação de manuais complexos e laudos externos.
*   **Conteúdo:** Manuais de fabricantes, laudos periciais e normas técnicas em formato **PDF**.
*   **Uso:** Fornecer suporte documental pericial em diagnósticos de alta complexidade.

---

## 2. Ferramentas (Tools)
Localização: `ai_service/core/tools.py`

As ferramentas permitem que o Agente realize ações ativas, como cálculos matemáticos ou consultas a bancos de dados SQL.

### Ferramentas de Confiabilidade (Determinísticas)
*   `calculate_reliability_metrics_tool(rca_ids)`:
    Calcula indicadores estatísticos baseados no histórico:
    - **MTBF:** Tempo Médio Entre Falhas.
    - **MTTR:** Tempo Médio para Reparo.
    - **Disponibilidade:** % estimada baseada em MTBF/MTTR.

### Ferramentas de FMEA
*   `get_deterministic_fmea_tool(asset_id)`: **NOVO**
    Consulta o banco de dados SQL real do sistema (`fmea_modes`). Retorna o **RPN (Risk Priority Number)**, Severidade, Ocorrência e ações recomendadas oficiais.
*   `get_asset_fmea_tool(query)`:
    Realiza busca semântica (RAG) na biblioteca de manuais para encontrar modos de falha por descrição.

### Ferramentas de Detalhamento de RCA
*   `get_full_rca_detail_tool(rca_id)`:
    Busca o conteúdo integral de uma RCA específica (Ishikawa, 5 Porquês, Planos de Ação) com 100% de precisão para confronto de dados.
*   `get_historical_rca_causes(rca_id)` / `get_historical_rca_action_plan(rca_id)`:
    Extrações específicas de partes de um relatório histórico.

### Ferramentas Externas e Habilidades
*   `DuckDuckGoTools()`: Pesquisa na internet para conceitos técnicos não indexados localmente.
*   `get_skill_reference(skill_name, file_path)`: **NOVO**
    Lê diretrizes metodológicas (ex: "como formatar um Ishikawa") das Skills do sistema.

---
*Atualizado em: 11/03/2026 - Pós-Issue 127*
