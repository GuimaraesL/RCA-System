# Documentação do Protocolo MCP - RCA System

Este documento detalha a implementação do **Model Context Protocol (MCP)** no RCA System, que serve como a interface de comunicação padronizada entre o Backend (Node.js) e o Agente de IA (Python/Agno).

---

## 1. Visão Geral da Arquitetura

O sistema utiliza um modelo de **Servidor MCP Embarcado** no Backend Node.js. Isso permite que a IA tenha acesso direto aos dados e regras de negócio sem bypassar as validações de domínio.

### Fluxo de Comunicação
1. O Agente de IA (Agno) se conecta ao Servidor MCP via JSON-RPC.
2. O Agente "descobre" as ferramentas e conhecimentos disponíveis.
3. Quando a IA precisa de um dado do banco ou uma regra de negócio, ela invoca uma **Tool** ou lê um **Resource**.
4. O Backend processa o pedido, aplica validações Zod e retorna o resultado estruturado.

---

## 2. Ferramentas Expostas (Tools)

As ferramentas permitem que a IA execute ações ou consultas ativas no sistema.

| Nome | Parâmetros | Descrição |
| :--- | :--- | :--- |
| `get_rca_context` | `id: string` | Retorna o objeto completo da RCA (5W, Ishikawa, Causas, Status). |
| `search_assets` | `query: string` | Busca na hierarquia de ativos por nome ou tipo. |
| `get_asset_fmea` | `asset_id: string` | Recupera todos os modos de falha registrados para o ativo e seus filhos. |
| `query_similar_rcas` | `problem_desc: string` | Executa uma busca por similaridade semântica no histórico de análises. |
| `get_taxonomy_rules` | - | Retorna as regras de obrigatoriedade e status vigentes. |

---

## 3. Recursos (Resources)

Recursos são fontes de dados estáticas ou dinâmicas que a IA pode ler para ganhar contexto.

| URI | Descrição |
| :--- | :--- |
| `rca://history/recent` | Resumo das últimas 50 análises concluídas para contexto rápido. |
| `taxonomy://assets/tree` | Exportação completa da árvore de ativos em formato JSON. |
| `docs://business-rules` | Versão processável das regras de negócio do sistema. |

---

## 4. Modelos de Prompt (Prompts)

O servidor MCP fornece templates de prompts pré-configurados para garantir consistência nas respostas da IA.

| Nome | Descrição | Estrutura Esperada |
| :--- | :--- | :--- |
| `analyze-root-cause` | Guia para preenchimento de Ishikawa e 5 Porquês. | Causa por categoria 6M + Justificativa técnica. |
| `analyze-recurrence` | Identifica se a falha atual já ocorreu antes e avalia ações anteriores. | Lista de RCAs similares + Score de similaridade + Alerta de eficácia. |
| `verify-action-effectiveness` | Avalia se uma proposta de ação ataca a causa raiz. | Check de viabilidade + Relação direta com a causa. |

### Detalhamento: Prompt de Análise de Recorrência

O prompt `analyze-recurrence` é projetado para atuar no momento em que um novo Trigger é detectado ou uma RCA é iniciada.

**Objetivo:** Evitar que o usuário crie planos de ação que já falharam no passado para o mesmo equipamento/fenômeno.

**Lógica Interna:**
1.  **Contexto Atual:** Recebe o `stop_reason` e `asset_id` do evento atual.
2.  **Busca Histórica:** Utiliza `query_similar_rcas` para recuperar casos similares dos últimos 24 meses.
3.  **Análise Crítica:**
    -   Se houver similaridade > 85%, identifica as ações cadastradas na RCA anterior.
    -   Verifica se o Trigger atual ocorreu *depois* da conclusão daquelas ações.
    -   Se sim, rotula a falha como "Recorrente" e sinaliza as ações anteriores como "Ineficazes".
4.  **Saída:** Um alerta estruturado recomendando que a nova análise não replique as causas/ações da RCA [ID].

---

## 5. Implementação Técnica

### Backend (Node.js)
O servidor MCP é inicializado junto com a API Express e compartilha o mesmo `DatabaseConnection`.
- Localização prevista: `server/src/v2/infrastructure/mcp/McpServer.ts`
- Protocolo: JSON-RPC sobre stdio ou HTTP.

### Cliente (Python/Agno)
O Agente Agno utiliza o `McpClient` nativo para consumir as ferramentas.
- Configuração: O endpoint do servidor MCP é injetado como uma variável de ambiente no serviço Python.

---

## 6. Segurança e Governança

1. **Read-Only por Padrão:** O servidor MCP no estágio atual não permite escrita direta no banco de dados. A IA propõe, mas o sistema (via usuário) persiste.
2. **Audit Log:** Todas as chamadas MCP são registradas pelo `logger` do sistema para auditoria técnica.
3. **Validadores Zod:** Cada ferramenta MCP passa por um validador de schema antes da execução.

---

> **Nota de Manutenção:** Este documento deve ser atualizado sempre que uma nova Tool ou Resource for adicionado ao `McpServer.ts`.
