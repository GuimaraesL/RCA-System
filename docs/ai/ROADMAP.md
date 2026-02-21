# Estratégia e Roadmap de IA — RCA Detective (Phase 2)

Este documento detalha o plano estratégico para a implementação da inteligência artificial no **RCA System**, focando no agente especializado **'RCA Detective'**.

---

## Objetivos da IA

1.  **Assistência na Criação de Análises:** Reduzir o tempo de preenchimento e aumentar a qualidade das RCAs sugerindo causas raiz, preenchendo o Ishikawa (6M) e propondo ações baseadas no histórico.
2.  **Análise de Recorrência:** Identificar automaticamente padrões de falhas repetitivas em equipamentos ou áreas, alertando sobre a ineficácia de ações passadas.

O diferencial estratégico do produto é a **Assistência Inteligente**, a **Análise de Recorrência Proativa** e a integração nativa de **FMEA**.

Para detalhes de baixo nível (protocolos, banco de dados, sincronização), consulte o [Manual de Design Técnico (IA)](./DESIGN_TECNICO.md) e a [Documentação do MCP](./MCP.md).

---

## Framework Escolhido: Agno

Após análise comparativa entre Agno, LangChain e CrewAI, optamos pelo **Agno (antigo Phidata)** por:
-   **Performance:** Instanciação de agentes em microsegundos (~2μs).
-   **Simplicidade:** API Pythônica limpa e baixo consumo de memória.
-   **Model-Agnostic:** Facilidade para trocar entre Gemini, GPT-4o e Claude.
-   **RAG Nativo:** Suporte robusto para bases de conhecimento e ferramentas customizadas.

---

## Arquitetura e Integração

O agente será um serviço independente em Python (FastAPI + Agno) operando em um modelo **Híbrido e Centralizado**.

### 1. Modelo de Integração (UX/UI)
- **Assistência Sob Demanda (Botão):** No Editor de RCA, um botão "Assistir com IA" sugere preenchimento de campos (5W, Ishikawa, Ações).
- **Alertas de Recorrência (Contextual):** O sistema monitora o contexto e, ao detectar padrões históricos, dispara alertas: *"Este equipamento falhou 3 vezes nos últimos 30 dias. Ver histórico?"*.

### 2. Escalabilidade Multiusuário (Ambiente Fabril)
- **Serviço Centralizado:** Um único serviço de IA atende a toda a planta, garantindo que o conhecimento gerado por um usuário/turno seja indexado no **Vector DB Central** e fique disponível para todos instantaneamente.
- **Microserviço Dockerizado:** Facilita o deploy interno e garante paridade de ambiente.

### Ferramentas (Tools) do Agente
| Ferramenta | Descrição |
| :--- | :--- |
| `query_rca_history` | Busca casos similares no histórico de RCAs. |
| `analyze_recurrence` | Detecta se a falha atual é recorrente em um período definido. |
| `suggest_root_causes` | Propõe causas prováveis baseada na descrição do problema. |
| `generate_ishikawa` | Pré-preenche as categorias 6M do diagrama de Ishikawa. |
| `suggest_actions` | Recomenda planos de ação baseados em sucessos passados. |
| `sync_knowledge` | Indexa novas análises no Vector DB após conclusão da RCA. |

### Knowledge Base (RAG)
- **Histórico de RCAs:** Embeddings de todas as análises concluídas.
- **Histórico de Triggers:** Registro de eventos de parada, motivos de interrupção e recorrência de gatilhos operacionais.
- **FMEA (Failure Mode and Effects Analysis):** Base de conhecimento estruturada por ativo, contendo modos de falha previstos, efeitos e ações recomendadas.
- **Metodologia:** Documentação técnica sobre RCA, 5 Porquês e Ishikawa.
- **Taxonomia:** Estrutura de ativos e modos de falha padronizados da planta.

---

## Roadmap de Implementação

### Fase 1: Fundação & Infra (Concluída 🚀)
- [x] Setup do Microserviço Python (FastAPI + Agno + Docker).
- [x] Implementação da tabela `fmea_modes` (Antecipada da Fase 4).
- [x] Estrutura base de segurança (JWT/RBAC) integrada.
- [ ] Configuração do **Vector DB Central** (ChromaDB ou SQLite-vec).

### Fase 2: Assistência & UI (Semanas 3-4)
- [ ] Pipeline de RAG (Indexação de embeddings do histórico).
- [ ] Endpoint de assistência (sugestão de Ishikawa/Causas).
- [ ] Integração UI: Botão de assistência no Editor de RCA.

### Fase 3: Inteligência de Recorrência (Semanas 5-6)
- [ ] Lógica de análise de padrões e similaridade.
- [ ] Sistema de alertas contextuais proativos na UI.
- [ ] Dashboard de tendências e reincidência por ativo.

### Fase 4: Especialização & FMEA (Em Andamento 🛠️)
- [ ] **Integração FMEA (UI):** Criação da aba de gestão de FMEA dentro da guia de Ativos (Assets).
- [x] **Persistência:** Implementação da tabela `fmea_modes` (N:1 com Assets) — **CONCLUÍDO**.
- [ ] **IA Sync:** Conector para enriquecer sugestões de Causa Raiz cruzando dados de FMEA.
- [ ] **Análise Multimodal:** Análise de fotos de falhas e diagramas técnicos.
- [ ] **Conector de Triggers:** Fluxo automático para verificar se um novo Trigger tem correlação com RCAs abertas.

---

## FMEA como Diferencial de Conhecimento
A inclusão do FMEA (Failure Mode and Effects Analysis) no corpo de conhecimento permite que o agente 'RCA Detective' não apenas olhe para o que *aconteceu* (histórico), mas também para o que os engenheiros *projetaram* que poderia acontecer. 

- **Aplicação:** Ao analisar uma falha no "Ativo X", a IA cruza o `stop_reason` do Trigger com os modos de falha registrados no FMEA do Ativo, elevando a precisão da sugestão de causa raiz.

---

## Stack Técnica

-   **Backend IA:** Python 3.11+, FastAPI, Agno.
-   **LLM (Desenvolvimento):** Gemini 2.0 Flash (Google API).
-   **LLM (Implementação/Final):** Azure OpenAI Service (Enterprise Compliance).
-   **Vector Store:** ChromaDB ou SQLite-vec (Local-first).
-   **Embeddings:** OpenAI `text-embedding-3-small`.

---

> **Nota:** Este documento deve ser atualizado conforme os experimentos de IA avancem e os requisitos de negócio evoluam.
