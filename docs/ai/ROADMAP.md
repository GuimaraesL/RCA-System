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

### Fase 4: Especialização & FMEA (Planejada 📅)
- [ ] **IA Sync**: Conector para enriquecer sugestões de Causa Raiz cruzando dados de FMEA.
- [ ] **Interface FMEA**: Aba de gestão técnica de modos de falha nos Assets.
- [ ] **Análise Multimodal**: Processamento de fotos de falhas.

---

## Stack Técnica

-   **Backend IA:** Python 3.11+, FastAPI, Agno Framework.
-   **LLM & Embeddings:** Google Gemini 2.0 Flash (API).
-   **Vector Store:** ChromaDB (Centralizado em `/data/vector_db`).
-   **Cache de Integridade:** SQLite (`data/rca_knowledge.db`).

---
*Roadmap atualizado para refletir a consolidação da infraestrutura e inteligência base.*
