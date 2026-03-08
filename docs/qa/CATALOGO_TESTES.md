# Catálogo de Testes - RCA System

Este documento lista e descreve os arquivos de teste do projeto, servindo como guia para execução e manutenção da qualidade.

## 🟢 Testes E2E (Ponta a Ponta)
Localização: `tests/e2e/`
Ferramenta: **Playwright**

Estes testes simulam a jornada completa do usuário no navegador, com API mockada para isolamento.

| Arquivo (`.spec.ts`) | Descrição e Cobertura |
| :--- | :--- |
| **smoke** | **Jornada Crítica.** Valida navegação básica (Dashboard -> Análises -> Ativos -> Configurações) para garantir que o app não crasha. |
| **rca-workflow-state** | **Ciclo de Vida.** Testa a conversão de Gatilho -> RCA e a transição automática de status (Em Andamento -> Concluída). |
| **rca-performance-stress** | **Stress Test.** Simula listas com 2000+ itens para validar a virtualização e performance de renderização. |
| **rca-i18n** | **Internacionalização.** Valida a troca de idiomas e tradução de labels no DOM em tempo real. |
| **modals-ui** | **Interface.** Valida comportamento de modais, diálogos de confirmação e overlays. |
| **rca-migration-edge-cases** | **Casos de Borda.** Garante resiliência na abertura de RCAs com dados legados ou corrompidos. |
| **reproduce_chart_error** | **Regressão Visual.** Teste específico para garantir que erros de renderização nos gráficos (Recharts) não retornem. |

---

## 🔴 Testes do Serviço de IA (Python)
Localização: `ai_service/tests/`
Ferramenta: **Pytest**

Testam a lógica do Agente RCA Detective e a API de análise.

| Arquivo (`.py`) | Descrição |
| :--- | :--- |
| **test_api** | Valida os endpoints `/health` e `/analyze` (segurança e roteamento). |
| **test_tools** | Testa as ferramentas do agente (buscas no backend) com mocks. |
| **test_agent** | Valida a configuração e factory do agente Agno. |
| **test_fmea** | Valida a extração inteligente de modos de falha via Gemini 2.0 Flash. |
| **test_multimodal** | Valida o processamento de anexos (fotos/vídeos) e o fluxo de análise multimodal via Gemini 2.5 Flash. |

---

## 🔵 Testes de Integração (Backend)
Localização: `server/src/v2/`
Ferramenta: **Vitest**

Testam a integração entre Controllers, Services e Repositórios (SQLite).

| Arquivo (`.test.ts`) | Descrição |
| :--- | :--- |
| **api/v2/controllers/RcaController** | Valida endpoints da API REST `/rcas` (GET, POST, PUT, DELETE). |
| **api/v2/controllers/ImportLogic** | Valida a lógica complexa de importação e transformação de dados XLS/JSON. |
| **domain/services/RcaService** | Testa o "coração" do sistema: cálculo de status e regras de taxonomia. |
| **domain/services/ActionServiceStatus** | Testa o recálculo do status da RCA pai baseado em mudanças nas ações CAPA. |
| **domain/services/TriggerSync** | Valida a sincronização de gatilhos operacionais com as análises. |
| **infrastructure/repositories/SqlActionRepository** | Valida persistência SQL e integridade de integridade de chaves estrangeiras. |
| **trigger_repository** | Valida persistência SQL de Gatilhos. |
| **full_flow** | Fluxo completo do backend: Criação de Trigger -> Promoção para RCA -> Salvamento. |
| **logic_regression** | Garante que bugs críticos resolvidos no passado continuem corrigidos. |
| **benchmark** | Mede o tempo de resposta das operações críticas de banco de dados. |

---

## 🟡 Testes Unitários (Frontend/Hooks)
Localização: `src/**/__tests__/`
Ferramenta: **Vitest**

Testam funções isoladas, hooks de lógica e utilitários.

| Arquivo (`.test.ts / .tsx`) | Descrição |
| :--- | :--- |
| **context/RcaContext** | Estado global, persistência offline e comunicação entre abas. |
| **hooks/useRcaLogic** | Orquestração principal da lógica de edição de uma RCA. |
| **hooks/useRcaForm.validation** | Validação extensiva de campos obrigatórios via Zod. |
| **hooks/useActionsLogic** | Lógica de gestão de ações de planos de ação (CAPA). |
| **hooks/useFilteredData** | Motor de filtragem cruzada dinâmica e busca global. |
| **services/api/api.modular** | Valida contratos HTTP e interceptores de erro. |
| **services/aiService** | Valida integração frontend com o serviço de análise de IA. |
| **services/csvService.*** | Suite completa de testes para geração e leitura de CSV/Excel. |
| **services/i18n-audit** | **Auditoria.** Varre o código para garantir zero strings hardcoded. |
| **components/ai/SuggestionChips** | Valida a renderização e interação dos chips de sugestão da IA. |
| **components/ai/AiSuggestionsLogic** | Valida a lógica contextual das sugestões do chat da IA. |
| **utils/statusUtils** | Helpers de formatação visual de status. |
| **utils/triggerUtils** | Manipulação e sanitização de objetos de gatilho. |
| **Accessibility Tests** | Valida acessibilidade (Aria-labels, navegação via teclado) em componentes globais e steps. |
| **architecture** | Garante que a estrutura de camadas não seja violada (ex: UI chamando DB). |

---

## 📚 Documentação Relacionada
- [Guia de Testes (Como Rodar)](./TESTES.md)
- [Regras de Negócio](../processes/REGRAS_NEGOCIO.md)
- [Referência da API](../core/REFERENCIA_API.md)

---

> **Nota de Manutenção:** Mantenha este catálogo atualizado. Novos arquivos de teste devem ser adicionados aqui. Consulte [TESTES.md](./TESTES.md) para estratégias.
