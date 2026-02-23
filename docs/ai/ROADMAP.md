# Estratégia e Roadmap de IA — RCA Detective

Este documento detalha o plano estratégico para a implementação da inteligência artificial no **RCA System**, focando no agente especializado **'RCA Detective'**.

---

## Objetivos da IA

1.  **Assistência na Criação de Análises:** Reduzir o tempo de preenchimento e aumentar a qualidade das RCAs sugerindo causas raiz, preenchendo o Ishikawa (6M) e propondo ações baseadas no histórico.
2.  **Análise de Recorrência:** Identificar automaticamente padrões de falhas repetitivas em equipamentos ou áreas, alertando sobre a ineficácia de ações passadas.

O diferencial estratégico do produto é a **Assistência Inteligente**, a **Análise de Recorrência Proativa** e a integração nativa de **FMEA**.

Para detalhes de baixo nível (protocolos, banco de dados, sincronização), consulte o [Manual de Design Técnico (IA)](./DESIGN_TECNICO.md).

---

## Framework Escolhido: Agno

Optamos pelo **Agno (antigo Phidata)** por sua performance excepcional (instanciação em ~2μs), simplicidade Pythônica e suporte robusto para RAG nativo e ferramentas customizadas.

---

## Arquitetura e Integração

O agente opera como um microserviço independente em Python (FastAPI + Agno) seguindo o modelo **REST-First**.

### 1. Modelo de Integração (UX/UI)
- **Assistência Sob Demanda (Botão):** No Editor de RCA, o botão "Assistir com IA" consome o contexto da RCA atual e os ~2800 casos históricos.
- **Alertas de Recorrência (Contextual):** (Fase 3) Monitoramento de padrões históricos para disparar alertas de reincidência proativos.

---

## Roadmap de Implementação

### Fase 1: Fundação & Infra (Concluída 🚀)
- [x] Setup do Microserviço Python (FastAPI + Agno).
- [x] Configuração do **Vector DB Central** (ChromaDB Persistente).
- [x] Implementação da tabela `fmea_modes` (Backend).

### Fase 2: Brain & RAG (Concluída 🚀 - Fev 2026)
- [x] Pipeline de RAG (Indexação de ~2800 RCAs históricas).
- [x] **Otimização de Custos**: Sistema de Hash Control para evitar re-indexações.
- [x] **REST-First**: Integração direta via HTTP com o Backend Node.js.
- [x] **UI Integration**: Botão de assistência funcional no Frontend.

### Fase 3: Inteligência de Recorrência (Concluída 🚀 - Fev 2026)
- [x] Lógica de detecção hierárquica recursiva (Subgrupo > Equipamento > Planta).
- [x] Sistema de alertas contextuais proativos na UI (Banners de Alerta de Recorrência).
- [x] Suporte a **Deep Linking via Hash** (`#/rca/ID`) para navegação entre análises similares.
- [x] Refinamento da Persona: Especialista em Confiabilidade Sênior (Anti-vazamento técnico).
- [x] Priorização de contexto real-time para análises não persistidas.

### Fase 4: Observabilidade & Auditoria de IA (Concluída 🚀 - Fev 2026)
- [x] Integração com **Agno Dashboard** (os.agno.com) via `AgentOS`.
- [x] Auditoria de Dados: Rastreamento automático de ferramentas e fontes consultadas.
- [x] Estudo de UX: Documento `ESTUDO_UX_INTERACAO.md` consolidado.
- [x] Logs Estruturados: Visibilidade de traces no Agno Studio (SDK v2.5.3+).

### Fase 4.5: Evolução Multi-Agente & Interface (Em Planejamento 🛠️)
- [ ] **Sidebar Híbrida (UX/UI)**: Implementação de painel lateral colapsável no Editor de RCA.
    - **Insights Automáticos**: Alertas de recorrência e sugestões de causa raiz via debounce.
    - **Copilot Chat**: Interface de conversação persistente para investigação profunda.
- [ ] **Memória Persistente**: Implementação de `SqliteMemory` para manter o contexto da Sidebar vinculado ao `rca_id`.
- [ ] **Teams (Multi-Agente)**: Orquestração entre Detective (Busca), Asset Specialist (FMEA) e Writer (Plano de Ação).

### Fase 5: Interface, Mídia & Visão (Próxima 📅)
- [ ] **Multimodalidade na Sidebar**: Capacidade de arrastar fotos de falhas para o chat para análise visual imediata.
- [ ] **Streaming de Respostas**: Implementação de Server-Sent Events (SSE) para que as respostas da IA apareçam em tempo real na Sidebar.
- [ ] **Ações Rápidas**: Botões "Aplicar Sugestão" que preenchem automaticamente campos do formulário (Ishikawa, 5W2H).

### Fase 6: Integração Profunda com FMEA (Especialização 📅)
- [ ] **IA Sync**: Cruzamento automático entre causa raiz sugerida e modos de falha (FMEA) cadastrados no Assets Manager.
- [ ] **Checklist Dinâmico**: Geração de listas de verificação baseadas no tipo de ativo e falha detectada.

---

## Granularidade de Dados

- **Nível 1 (Geral)**: Documentação técnica e normas (RAG Estático).
- **Nível 2 (Histórico)**: Base de ~2800 RCAs concluídas (RAG Dinâmico).
- **Nível 3 (Contextual)**: Dados de FMEA e taxonomia do ativo (via Tools).

---

## Stack Técnica

-   **Backend IA:** Python 3.11+, FastAPI, Agno Framework.
-   **LLM & Embeddings:** Google Gemini 2.0 Flash (API).
-   **Vector Store:** ChromaDB (Persistente).
-   **Memória:** SQLite (`data/agent_memory.db`).
-   **Cache de Integridade:** SQLite (`data/rca_knowledge.db`).

---
*Roadmap atualizado para refletir a consolidação da infraestrutura e inteligência base.*
