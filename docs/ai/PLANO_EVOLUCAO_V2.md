# Plano de Evolução do AI Service (Agno v2)

Este documento descreve o plano de ação detalhado para evoluir a arquitetura do agente "RCA Detective", transformando-o de um assistente reativo para um **Copiloto de Confiabilidade Proativo e Interativo**, aderindo estritamente às melhores práticas da documentação oficial do framework [Agno](https://docs.agno.com).

## 1. O Paradigma de Contexto (Atual vs Histórico)

O maior risco em assistentes de IA corporativos é a alucinação de dados ou a mistura entre o que está acontecendo agora e o que aconteceu no passado. Para resolver isso, estabelecemos a seguinte regra arquitetural absoluta:

*   **Contexto Frontend (O Presente):** Os dados enviados no payload da requisição (mesmo que sejam rascunhos) são a **Única Fonte de Verdade (SSOT)** para o problema *atual*. A IA não deve usar ferramentas para tentar descobrir o que está acontecendo agora.
*   **Tools de IA (O Passado e a Teoria):** As ferramentas (`tools`) são estritamente para buscar contexto externo: RCAs históricas (RAG), manuais de fabricantes, web search ou tabelas FMEA do banco de dados.

## 2. Pilar 1: Refatoração de Tools (Granularidade)

Atualmente, a ferramenta `get_full_rca_detail_tool` retorna um JSON completo, o que onera a janela de contexto (tokens) e confunde o LLM. A evolução será quebrar isso em ferramentas menores e mais objetivas.

### Novas Ferramentas a serem criadas (`core/tools.py`):
1.  **`get_historical_rca_summary(rca_id)`**: Retorna apenas Título, Descrição, Ativo e Quem. Ideal para o agente fazer uma triagem inicial rápida.
2.  **`get_historical_rca_causes(rca_id)`**: Retorna estritamente o array de `root_causes` e diagnósticos (Ishikawa/5 Porquês). Chamada apenas se o resumo indicar similaridade.
3.  **`get_historical_rca_action_plan(rca_id)`**: Retorna ações de contenção, corretivas e confiabilidade humana. Foco em saber "o que foi feito para consertar no passado".
4.  **Integração Web Search**: Adição do `DuckDuckGoTools` nativo do Agno para buscar manuais de fabricantes na internet caso o FMEA local seja insuficiente.

## 3. Pilar 2: Evolução Conversacional (O Facilitador Socrático)

A experiência de chat deve deixar de ser um "oráculo que responde tudo de uma vez" e passar a ser um **facilitador de engenharia**.

### Atualizações nos Prompts (`core/prompts.py`):
1.  **Separação Cognitiva Clara**: Inserir regras globais informando ao modelo que o contexto injetado no prompt vem do frontend (falha atual) e que tools são apenas para o passado.
2.  **Método Socrático (5 Porquês Interativo)**: Instruir o `chat_agent` a não adivinhar a causa raiz se o usuário der uma descrição vaga. Ele deve assumir o papel de investigador, fazendo uma pergunta lógica por vez ("Por que a correia partiu?").

## 4. Pilar 3: Workflows de Auditoria (QA)

Conforme a [documentação do Agno](https://docs.agno.com/workflows/overview), Workflows são ideais para processos determinísticos. Como os dados sempre vêm do frontend antes de aprovar uma RCA, criaremos um **QA Gate**.

### Novo Arquivo: `workflows/qa_audit.py`
Será um pipeline que não interage com o usuário, apenas avalia a qualidade do JSON:
*   **Step 1 (Lógico):** Um Agente verifica se as Causas Raiz listadas fazem sentido lógico em relação à Descrição do Problema.
*   **Step 2 (Compliance):** Um Agente verifica se o Plano de Ação (5W2H) possui responsáveis, prazos, e se os verbos indicam ações que resolvem a causa e não o sintoma.
*   **Output:** Um Score de Qualidade e sugestões de melhoria (retornados para a UI ou para o Chat).

## 5. Pilar 4: Scripts de Debugging e Ferramentas CLI

Para garantir uma esteira de desenvolvimento saudável e evitar quebrar o Frontend durante testes no AI Service, implementaremos ferramentas de CLI baseadas na [documentação de Debugging do Agno](https://docs.agno.com/agents/debugging-agents).

### Novos Scripts em `scripts/`:
1.  **`cli_chat.py`**: Utilizará o método nativo `agent.cli_app(markdown=True)` do Agno para permitir conversar com o Copilot diretamente no terminal colorido, visualizando em tempo real quais ferramentas ele decide chamar internamente. Simulará a injeção do payload inicial.
2.  **`clear_memory.py`**: Um utilitário de banco de dados (`SQLite`) para limpar facilmente a tabela `agno_sessions` de um determinado `session_id` durante o desenvolvimento, evitando que testes anteriores "viciem" o agente.

---

## 6. Ordem de Execução (Roadmap de Implementação)

1.  **Fase A (Debug & Tools):**
    *   Criar `scripts/cli_chat.py` e `scripts/clear_memory.py`.
    *   Refatorar `core/tools.py` para ferramentas granulares e testar as chamadas via CLI.
2.  **Fase B (Conversação Socrática):**
    *   Atualizar `core/prompts.py` (Regras de Frontend x Tools e Método Socrático).
    *   Adicionar `DuckDuckGoTools` ao agente de chat e especialista.
3.  **Fase C (Workflow de Qualidade):**
    *   Criar o diretório/arquivo `workflows/qa_audit.py`.
    *   Integrar o novo workflow à rota da API (ex: `POST /audit`) para consumo eventual pelo frontend.
4.  **Fase D (Testes e Ajustes na API):**
    *   Ajustar `api/routes.py` para garantir a injeção semântica impecável dos dados do frontend (rascunho/atual) como contexto protegido contra tool calls.

---
*Plano elaborado para a próxima iteração do RCA AI Service.*