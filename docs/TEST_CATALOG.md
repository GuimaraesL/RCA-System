# Catálogo de Testes - RCA System

Este documento lista e descreve os arquivos de teste do projeto, servindo como guia para execução e manutenção da qualidade.

## 🟢 Testes E2E (Ponta a Ponta)
Localização: `tests/e2e/`
Ferramenta: **Playwright**

Estes testes simulam a jornada completa do usuário no navegador, com API mockada para isolamento.

| Arquivo (`.spec.ts`) | Descrição e Cobertura |
| :--- | :--- |
| **full-app-flow** | **Jornada Crítica.** Valida navegação básica (Dashboard -> Análises -> Ativos -> Configurações) para garantir que o app não crasha. |
| **rca-workflow-state** | **Ciclo de Vida.** Testa a conversão de Gatilho -> RCA e a transição automática de status (Em Andamento -> Concluída). |
| **rca-validation-rules** | **Validação de Formulário.** Verifica se campos obrigatórios bloqueiam o salvamento e exibem feedback visual (bordas vermelhas). |
| **rca-performance-stress** | **Stress Test.** Simula listas com 2000+ itens para validar a virtualização e performance de renderização. |
| **rca-i18n-*** | **Internacionalização.** Conjunto de testes (`crawler`, `debug`, `localization`) que valida a troca de idiomas e tradução de labels. |
| **investigation-visuals** | **Diagramas.** Testa a interatividade dos componentes visuais (Ishikawa, 5 Porquês). |
| **modals-ui** | **Interface.** Valida comportamento de modais, diálogos de confirmação e overlays. |
| **migration** | **Dados Legados.** Garante que RCAs antigas são migradas corretamente ao serem abertas. |

---

## 🔵 Testes de Integração (Backend)
Localização: `server/src/v2/`
Ferramenta: **Vitest**

Testam a integração entre Controllers, Services e Repositórios (SQLite).

| Arquivo (`.test.ts`) | Descrição |
| :--- | :--- |
| **api/controllers/RcaController** | Valida endpoints da API REST `/rcas` (GET, POST, PUT, DELETE). |
| **domain/services/RcaService** | Testa a lógica de negócio pura: cálculo de status, validação de campos obrigatórios. |
| **infrastructure/repositories/SqlActionRepository** | Valida persistência SQL de Ações. |
| **trigger_repository** | Valida persistência SQL de Gatilhos. |
| **full_flow** | Teste de integração amplo simulando fluxo completo no backend. |
| **import_export** | Valida lógica de importação/exportação de dados em massa. |

---

## 🟡 Testes Unitários (Frontend/Utils)
Localização: `src/**/__tests__/`
Ferramenta: **Vitest**

Testam funções isoladas e utilitários.

| Arquivo (`.test.ts`) | Descrição |
| :--- | :--- |
| **services/csvService** | Valida parsing e geração de CSVs (incluindo casos de borda e roundtrip). |
| **utils/statusUtils** | Testa funções auxiliares de formatação de status. |
| **utils/triggerUtils** | Testa helpers de manipulação de triggers. |
| **services/i18n-audit** | Auditoria estática de chaves de tradução faltantes. |

---

## 📚 Documentação Relacionada
- [Guia de Testes (Como Rodar)](./TESTING.md)
- [Regras de Negócio](./BUSINESS_RULES.md)

---

> **Nota de Manutenção:** Mantenha este catálogo atualizado. Novos arquivos de teste devem ser adicionados aqui. Consulte [TESTING.md](./TESTING.md) para estratégias.
- [Referência da API](./API_REFERENCE.md)
