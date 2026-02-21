# RCA System - Sistema de Gestão de Análise de Falhas (v2.3.0)

![Status](https://img.shields.io/badge/Status-Active-success)
![Version](https://img.shields.io/badge/Version-2.3.0-blue)
![Tech](https://img.shields.io/badge/Tech-React%2019%20%7C%20Node.js%20%7C%20SQLite-blueviolet)

O **RCA System** é uma plataforma corporativa para a **Gestão do Ciclo de Vida de Falhas (Failure Lifecycle Management)**. Ele unifica o registro de eventos de parada (Triggers), a execução de análises de causa raiz (RCA) baseadas na metodologia 6M, e o acompanhamento de planos de ação corretiva.

---

## 📚 Central de Documentação

A documentação do projeto foi revisada e organizada em categorias para facilitar o acesso:

👉 **[Acesse a Central de Documentação](./docs/README.md)**

Nela você encontrará detalhes sobre:
- 🏗️ **Arquitetura & Core** (Monorepo, Clean Architecture, API)
- 🎨 **Design System** (Identidade Visual, Componentes)
- 🧪 **Estratégia de Testes** (Unitários, Integração, E2E)
- ⚙️ **Processos de Negócio** (Ciclo de Vida RCA, Regras)
- 🤖 **Inteligência Artificial** (Roadmap, Design Técnico)

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

> **Nota de Manutenção:** Mantenha este README atualizado. Para detalhes técnicos profundos, consulte a pasta `docs/` e o [PRD](./docs/core/PRD.md).

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
