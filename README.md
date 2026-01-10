# RCA System - Sistema de Gestão de Análise de Falhas Preditiva

![Status](https://img.shields.io/badge/Status-Production%20Ready-green)
![Tech](https://img.shields.io/badge/Tech-React%20%7C%20Node%20%7C%20SQLite-blue)
![License](https://img.shields.io/badge/License-Internal-gray)

**RCA System** é uma aplicação corporativa robusta para o gerenciamento do ciclo de vida de falhas industriais. O sistema unifica o controle de eventos de parada (Triggers), análises de causa raiz (RCA) e planos de ação corretiva.

Projetado para **High Performance**, o sistema renderiza instantaneamente datasets com milhares de registros sem travamentos.

---

## ⚡ Features Principais (Premium)

### 🏎️ Performance & UX
- **Zero Lag Rendering:** Estruturas de dados `O(1)` garantem fluidez mesmo com 2000+ registros.
- **Rendering Cap Inteligente:** Exibe 100 registros por vez para leveza extrema do DOM.
- **Paginação Client-Side:** Navegue instantaneamente ("Next/Prev") sem recarregar dados do servidor.
- **Filtros Globais:** A pesquisa textual e filtros de data operam sobre **100% dos dados**, não apenas nos visíveis.

### 📊 Dashboard Avançado
- **Gráficos 6M Dinâmicos:** Visualização de causas raiz (Método, Mão de obra, etc).
- **Legendas Interativas:** Clique para focar em categorias específicas.
- **Drill-down:** Navegação hierárquica (Área > Equipamento > Subconjunto).
- **Truncagem Inteligente:** Labels longos são tratados automaticamente para manter o visual limpo.

### 🔗 Integração Inteligente (Força Tarefa)
- **Vinculação Trigger <-> RCA:** Associe eventos de parada a análises existentes com um clique.
- **Auto-Status (Novo):** O sistema define automaticamente se a análise está "Em Andamento", "Aguardando Verificação" ou "Concluída" baseado na qualidade dos dados e eficácia do plano de ação.
- **Herança de Dados:** RCAs novas herdam automaticamente local, data e contexto do Trigger.
- **Auditoria de Dados:** Validação estrita de schemas na importação de CSV/JSON.

---

## 🚀 Quick Start

### Pré-requisitos
- Node.js 18+
- NPM

### Instalação e Execução

Para rodar o ambiente completo (Backend + Frontend):

1. **Backend (API + Banco):**
   ```bash
   # Terminal 1
   npm install
   npm run server
   ```
   *Servidor rodando em: `http://localhost:3000`*

2. **Frontend (UI):**
   ```bash
   # Terminal 2
   npm run dev
   ```
   *Acesse em: `http://localhost:5173`*

---

## 📚 Documentação Técnica

Para detalhes profundos sobre a arquitetura do sistema, estratégias de otimização e fluxo de dados, consulte:

👉 **[docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)**

---

## 🛠️ Troubleshooting

### "Tela Branca" ou Erro de Carregamento
- Verifique se o backend está rodando (`npm run server`).
- Limpe o `localStorage` do navegador se houver suspeita de cache antigo corrompido.

### Importação de CSV Falhou
- Verifique se o arquivo possui os cabeçalhos obrigatórios (`REQUIRED_HEADERS` no código).
- O sistema valida estritamente tipos de dados para evitar "sujeira" no banco.

---

**Desenvolvido por:** Time de Excelência Operacional (Com Assistência de IA Avançada)
**Versão:** 2.2.0 (Integrity Sprint)
