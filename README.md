# RCA System - Sistema de Gestão de Análise de Falhas (v2.3.0)

![Status](https://img.shields.io/badge/Status-Active-success)
![Version](https://img.shields.io/badge/Version-2.3.0-blue)
![Tech](https://img.shields.io/badge/Tech-React%2019%20%7C%20Node.js%20%7C%20SQLite-blueviolet)

O **RCA System** é uma plataforma corporativa para a **Gestão do Ciclo de Vida de Falhas (Failure Lifecycle Management)**. Ele unifica o registro de eventos de parada (Triggers), a execução de análises de causa raiz (RCA) baseadas na metodologia 6M, e o acompanhamento de planos de ação corretiva.

---

## 📚 Documentação Técnica Completa

A documentação do projeto foi revisada e organizada para facilitar o desenvolvimento:

| Documento | Descrição |
| :--- | :--- |
| 🏗️ **[Arquitetura](./docs/ARCHITECTURE.md)** | Visão geral técnica, diagrama de componentes e fluxo de dados. |
| 🧠 **[Regras de Negócio](./docs/BUSINESS_RULES.md)** | Ciclo de vida da RCA, lógica de status e validações de domínio. |
| 🔌 **[API Reference](./docs/API_REFERENCE.md)** | Endpoints da API REST (v2), schemas e exemplos de requisição. |
| 📋 **[Product Requirements](./docs/PRD.md)** | Visão do produto, personas e requisitos funcionais (RF/RNF). |
| 🎨 **[Design System](./docs/DESIGN_SYSTEM.md)** | Guia de estilos, paleta de cores e componentes UI. |
| 🧪 **[Guia de Testes](./docs/TESTING.md)** | Estratégia de testes (Unitários, E2E) e comandos de execução. |
| 🔍 **[Catálogo de Testes](./docs/TEST_CATALOG.md)** | Lista detalhada de todos os arquivos de teste e suas coberturas. |
| 📝 **[Diretrizes de Código](./docs/CODE_GUIDELINES.md)** | Padrões de nomenclatura, estrutura de pastas e boas práticas. |

---

## ⚡ Features Principais

- **Performance Extrema:** Renderização via virtualização (`react-window`) para listas com milhares de registros sem *lag*.
- **Metodologia 6M:** Interface interativa para diagrama de Ishikawa (Espinha de Peixe).
- **Internacionalização (i18n):** Suporte nativo a múltiplos idiomas (PT-BR, EN-US).
- **Validação Robusta:** Integridade de dados garantida por schemas **Zod** no Frontend e Backend.
- **Relatórios:** Dashboards de indicadores.

---

## 🚀 Quick Start

### Pré-requisitos
- Node.js 20+
- NPM 10+

### Instalação

```bash
# Clone o repositório e instale todas as dependências (Raiz + Server)
npm install
npm install --prefix server 
```

### Executando em Desenvolvimento

Para iniciar **Frontend** (Vite) e **Backend** (Express) simultaneamente:

```bash
npm run dev
```
- **Frontend:** http://localhost:3000
- **Backend:** http://localhost:3001

---

> **Nota de Manutenção:** Mantenha este README atualizado. Para detalhes técnicos profundos, consulte a pasta `docs/` e o [PRD](./docs/PRD.md).

---

## 🧪 Rodando Testes

Garanta a qualidade do código antes de submeter alterações:

```bash
# Testes Unitários (Frontend)
npx vitest run

# Testes de Integração (Backend)
npm test --prefix server

# Testes E2E (Playwright)
npx playwright test
```

---

## 🤝 Contribuindo

1.  Consulte o [CODE_GUIDELINES.md](./docs/CODE_GUIDELINES.md) antes de começar.
2.  Crie uma branch para sua feature (`feat/nova-funcionalidade`).
3.  Escreva testes para cobrir suas alterações.
4.  Abra um Pull Request detalhando suas mudanças.

---

**Equipe de Desenvolvimento RCA**
