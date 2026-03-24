# Documentação: Knowledge e Ferramentas (Tools) do AI Service

O `ai_service` faz uso de dois pilares de extensão de capacidades (Knowledge e Tools) dentro do ecossistema do Agno para transformar o LLM bruto (Gemini 2.0) num Copiloto Especialista em RCA.

---

## 1. Conhecimento (Knowledge Base - RAG)
Localização: `ai_service/core/knowledge.py`

O Copiloto RCA utiliza bases de dados locais vetorizadas (ChromaDB) para fundamentar suas respostas, divididas em duas coleções principais.

### RCA History (`rca_history_knowledge`)
*   **VectorDB:** ChromaDB (`rca_history_v1`)
*   **Propósito:** Contexto integral histórico (Full Context).
*   **Conteúdo:** RCAs completas divididas em chunks de 50k tokens.
*   **Uso:** Identificação de lições aprendidas e contexto geral de falhas.

### RCA Symptoms (`rca_symptoms_knowledge`)
*   **VectorDB:** ChromaDB (`rca_symptoms_v2`)
*   **Propósito:** Busca cirúrgica por incidentes baseada em sintomas (Problem Context).
*   **Conteúdo:** Título, Descrição do Problema e Ishikawa.
*   **Uso:** Identificação rápida de recorrências quando o usuário reporta uma falha nova.

### RCA Causes (`rca_causes_knowledge`)
*   **VectorDB:** ChromaDB (`rca_causes_v2`)
*   **Propósito:** Busca cirúrgica por análises técnicas similares (Analysis Context).
*   **Conteúdo:** Investigação Técnica, 5 Porquês e Causas Raiz.
*   **Uso:** Cruzamento de falhas por similaridade técnica de diagnóstico.

### Technical Knowledge (`technical_knowledge`)
*   **VectorDB:** ChromaDB (`technical_knowledge_v1`)
*   **Propósito:** Biblioteca técnica unificada.
*   **Conteúdo:** Manuais FMEA (`.md`) e Documentação Técnica de Fabricantes (`.pdf`).
*   **Uso:** Consultar a "teoria" esperada para cada tipo de falha mecânica, modos de falha tabelados e laudos externos.

---

## 2. Ferramentas (Tools)
Localização: `ai_service/core/tools.py`

As ferramentas permitem que os agentes realizem ações ativas na plataforma, recuperem contextos e processem métricas.

### Ferramentas de Contexto
*   `get_current_screen_context(run_context)`:
    Retorna os dados que o usuário está vendo na tela no momento da requisição (do `session_state`). Essencial para a IA extrair IDs de ativos, títulos e descrições do incidente atual de forma dinâmica.

### Ferramentas de RCA Histórica
*   `search_historical_rcas_tool(query, ...)`:
    Busca semântica no VectorDB de RCAs passadas, aplicando filtros hierárquicos (Subgrupo > Equipamento > Área) e incluindo uma etapa interna de validação técnica com o `RAG_Validator`.
*   `get_full_rca_detail_tool(rca_id)`:
    Busca o conteúdo INTEGRAL de uma RCA específica na API backend, incluindo Ishikawa, 5 Porquês, Planos de Ação e Gatilhos.
*   *Detail Tools Auxiliares:* `get_historical_rca_summary`, `get_historical_rca_causes`, `get_historical_rca_action_plan`, `get_historical_rca_triggers`.

### Ferramentas de FMEA
*   `get_deterministic_fmea_tool(asset_id)`:
    Consulta o banco de dados SQL real do backend para buscar modos de falha estruturados e RPN do ativo.
*   `get_asset_fmea_tool(query)`:
    Realiza busca semântica na biblioteca técnica (`technical_knowledge`) para encontrar modos de falha e ações recomendadas nos manuais.

### Ferramentas de Confiabilidade e Skills
*   `calculate_reliability_metrics_tool(rca_ids)`:
    Calcula **MTBF**, **MTTR** e Disponibilidade Estimada de um equipamento com base nas RCAs enviadas.
*   `get_skill_reference(skill_name, file_path)`:
    Permite aos agentes acessarem as metodologias oficiais (ex: como montar Ishikawa ou 5 Porquês) presentes nos arquivos `.md` dentro das Skills.
*   `DuckDuckGoTools()`:
    Utilizado pelo Time para pesquisa de informações técnicas na internet.