# Design Técnico: Evolução Multi-Agente (Fase 4.5)

Este documento detalha a arquitetura do time de agentes **RCA-Detectives**, focando em especialização, memória persistente e fluxos de trabalho estruturados usando o framework **Agno**.

---

## 1. Arquitetura de Agentes (Teams)

Em vez de um único agente "faz-tudo", utilizaremos um **Team** de especialistas coordenados por um Lead Agent.

### A. Detective Agent (Lead Investigator)
- **Papel**: Coordenar a investigação inicial e buscar similaridades históricas.
- **Capacidades (Skills/Tools)**:
    - RAG Dinâmico: Busca na base de ~2800 RCAs históricas.
    - DuckDuckGo: Pesquisa externa de manuais e normas técnicas (se necessário).
    - Recurrence Scanner: Lógica de similaridade hierárquica.
- **Reasoning**: Loop de reflexão interno para validar se uma recorrência é real antes de afirmar.

### B. Asset Specialist (Consultant)
- **Papel**: Especialista no contexto do ativo atual.
- **Capacidades (Skills/Tools)**:
    - Context Fetcher: Busca detalhes técnicos do ativo via Backend API.
    - FMEA Placeholder: Estrutura preparada para receber dados de modos de falha (FMEA) no futuro.
- **Foco**: Validar se a hipótese do Detective é compatível com a física do equipamento.

### C. Technical Writer (Action Planner)
- **Papel**: Redator técnico focado em resultados acionáveis.
- **Capacidades (Skills/Tools)**:
    - 5W2H Architect: Geração de tabelas de planos de ação.
    - Markdown Styler: Formatação rica para relatórios executivos.
- **Foco**: Clareza, objetividade e pragmatismo nas recomendações.

---

## 2. Interface: Sidebar Híbrida (Copilot + Insights)

A interação não será mais baseada em um botão estático, mas em um painel lateral dinâmico.

### A. Camada de Insights (Automática)
- **Trigger**: Debounce de input do usuário nos campos "Descrição" e "Causa Raiz".
- **Agente**: **Detective** (em busca assíncrona).
- **Saída**: Cards de "Recorrência Detectada" ou "Sugestão Técnica" que aparecem no topo da Sidebar.

### B. Camada de Copilot (Chat)
- **Trigger**: Input manual do usuário no chat.
- **Agente**: **Team Orchestrator** (que escolhe entre Detective, Specialist ou Writer).
- **Memória**: `SqliteMemory` vinculada ao `rca_id`.
- **Ações**: O usuário pode pedir para formatar o 5W2H, pedir explicações sobre o FMEA ou solicitar uma revisão da análise.

---

## 3. Workflows de Interação

1.  **Modo Assistência**: O usuário começa a preencher. O sistema detecta similaridades e "empurra" o insight para a Sidebar.
2.  **Modo Investigação**: O usuário clica em um insight e faz uma pergunta de seguimento no chat.
3.  **Modo Finalização**: O usuário pede: "Gere as ações do 5W2H para essa falha". O **Technical Writer** responde e o usuário clica em "Aplicar" para injetar o texto no formulário principal.

---

## 4. Estrutura de Comunicação (Streaming)

Para garantir uma UX "viva", utilizaremos o **Streaming do Agno** via `arun(stream=True)`.
- O Frontend (React) consome o stream via Server-Sent Events (SSE).
- O backend retorna blocos de Markdown que a Sidebar renderiza progressivamente.

As `Skills` são funções Python encapsuladas que garantem precisão lógica que o LLM sozinho pode falhar.

- **`RecurrenceAnalysisSkill`**: Calcula scores de similaridade e identifica se a falha é recorrente no Subgrupo, Equipamento ou Área.
- **`ActionValidationSkill`**: Verifica se as ações propostas seguem a hierarquia de controle (Eliminação > Substituição > Engenharia > Administrativo > EPI).
- **`VisualDiagnosticSkill` (Fase 5)**: Placeholder para processamento de imagens via Vision (Gemini Multimodal).

---

## 4. Memória e Persistência (SQLite)

Utilizaremos o `SqliteMemory` para garantir que o agente não "esqueça" o contexto entre sessões.

- **Storage**: `data/agent_memory.db` (SQLite).
- **Session ID**: Mapeado diretamente para o `rca_id`.
- **User ID**: Mapeado para o usuário logado na plataforma.
- **Benefício**: Se dois usuários diferentes editarem a mesma RCA, o agente terá o contexto compartilhado da investigação.

## 5. Fluxos de Dados e Interação (Mermaid)

### A. Fluxo de Bancos de Dados (Data Architecture)
Este diagrama mostra como o serviço de IA interage com as diferentes fontes de dados e persistência.

```mermaid
graph TD
    User((Usuário)) <--> FE[Frontend - Editor de RCA / Sidebar]
    FE <-->|Streaming /chat| API[FastAPI - AI Service]
    API <-->|Dados de Ativos/RCAs| BE[Backend - Node.js API]
    
    subgraph "Camada de Persistência (IA)"
        API <-->|Histórico de Mensagens| MEM[(SQLite - agent_memory.db)]
        API <-->|Busca Semântica| VDB[(ChromaDB - vector_db)]
        API <-->|Controle de Sincronia| KDB[(SQLite - rca_knowledge.db)]
    end
```

### B. Fluxo do Time de Agentes (Team Workflow)
Este diagrama ilustra a colaboração entre os especialistas para gerar um insight de alta qualidade.

```mermaid
sequenceDiagram
    participant U as Usuário (Sidebar)
    participant O as Team Orchestrator
    participant D as Detective (Lead)
    participant S as Asset Specialist
    participant W as Technical Writer
    participant K as Knowledge (RAG)

    U->>O: "Por que esse motor falhou novamente?"
    O->>D: Iniciar Investigação Histórica
    D->>K: Busca Vetorial (~2800 RCAs)
    K-->>D: Retorna falhas similares
    D-->>O: Hipótese: "Fadiga por desalinhamento"
    
    O->>S: Validar Hipótese com Contexto do Ativo
    S->>S: Verifica Modos de Falha (FMEA/Taxonomia)
    S-->>O: Confirmação Técnica: "Compatível"
    
    O->>W: Formatar Insight e Plano de Ação
    W->>W: Gera Tabela 5W2H e Resumo
    W-->>O: Markdown Finalizado
    
    O-->>U: Resposta via Streaming (Sidebar)
```

---

## 6. Estrutura de Pastas (Refatoração Modular)

Para suportar essa complexidade, a pasta `ai_service` será organizada assim:

```text
ai_service/
├── agent/
│   ├── teams/
│   │   ├── lead_detective.py     # Definição do Detective
│   │   ├── asset_specialist.py   # Definição do Asset Specialist
│   │   └── tech_writer.py        # Definição do Technical Writer
│   ├── skills/
│   │   ├── recurrence.py         # Lógica de similaridade
│   │   └── actions.py            # Lógica de validação de ações
│   ├── knowledge.py              # Configuração do RAG (ChromaDB)
│   ├── memory.py                 # Configuração da Memória (SQLite)
│   ├── prompts.py                # Instruções das Personas
│   └── tools.py                  # Ferramentas de API (Backend)
├── api/
│   ├── routes.py                 # Endpoints FastAPI
│   └── models.py                 # Pydantic Models
├── data/
│   ├── vector_db/                # ChromaDB (Persistente)
│   ├── agent_memory.db           # SQLite (Histórico de chats)
│   └── rca_knowledge.db          # SQLite (Controle de Hashes)
├── main.py                       # Ponto de entrada (FastAPI + AgentOS)
└── config.py                     # Variáveis de ambiente
```

---

## 6. Próximos Passos de Implementação (Sprint 4.5)

1.  [x] Criar o banco de dados `agent_memory.db` via SqliteStorage.
2.  [x] Desmembrar o agente atual em 3 instâncias especialistas.
3.  [x] Implementar a orquestração via `Team`.
4.  [x] Adicionar suporte a `DuckDuckGo` nas tools do Detective.
5.  [x] Atualizar o endpoint `/analyze` para consumir o `Team.run()` com suporte a Streaming (SSE).
