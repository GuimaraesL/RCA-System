# 🚀 RCA System - Roadmap & Tasks

> **Última atualização:** 2026-01-08  
> **Status:** Backend TypeScript + SQLite ✅ Funcionando

---

## 📊 Progresso Geral

| Categoria | Concluídos | Total | Status |
|-----------|------------|-------|--------|
| Bugs Core | 7 | 7 | 🟢 100% |
| Features | 4 | 4 | 🟢 100% |
| **Total** | **11** | **11** | **100%** |


---

## ✅ Bugs Corrigidos


### Bug #2: Excluir Trigger
- **Problema:** `window.confirm()` bloqueado pelo navegador corporativo
- **Solução:** Criado `ConfirmModal.tsx` customizado com design moderno
- **Commit:** `fix(triggers): Corrigir exclusão de triggers com ConfirmModal`

### Bug #1: Excluir RCA não funciona (Corrigido)
- **Problema:** Botão de lixeira na aba Analyses não executava a exclusão
- **Solução:** Corrigida a função `deleteRecord` no `RcaContext` e vinculado o clique corretamente na `AnalysesView`
- **Status:** ✅ Corrigido

### Bug #6: Criar RCA a partir do Trigger (Corrigido)
- **Problema:** Ao clicar em "Nova RCA" na aba de Triggers, o editor não abria ou não vinculava os dados.
- **Solução:** Restaurado o fluxo de criação e vínculo no `App.tsx`.
- **Status:** ✅ Corrigido

### Bug #7: Importação JSON - Regressão na Hierarquia de Assets (Corrigido)
- **Problema:** Ao importar JSON, a hierarquia de ativos era perdida ou gerava erros de chave estrangeira no SQLite devido à ordem de inserção.
- **Solução:** Implementada a ordenação Top-Down na função `flatten` (pais antes de filhos) e adicionada limpeza automática da tabela de assets antes da importação para garantir integridade.
- **Status:** ✅ Corrigido

### Feature #8: Settings - Adicionar Itens (Corrigido)
- **Status:** ✅ Corrigido (Conectado ao hook global)

### Feature #9: Settings - Excluir Itens (Corrigido)
- **Status:** ✅ Corrigido

### Feature #10: Filtro Padrão em Triggers (Corrigido)
- **Status:** ✅ Corrigido
- **Solução:** Implementado `FilterBar` na `TriggersView`, com suporte a filtros globais, hierarquia de ativos e busca textual.


### Bug #3: Excluir Action
- **Problema:** `handleDeleteAction` não usava contexto async
- **Solução:** Migrado para `deleteAction` do RcaContext
- **Commit:** Incluído no fix anterior

### Bug #4: Link RCA ↔ Trigger
- **Problema:** Div do link não tinha onClick
- **Solução:** Adicionado `onOpenRca` prop e onClick com hover styles
- **Commit:** `fix(triggers): Adicionar navegação do link RCA no TriggersView`

### Bug #5: Alterar Vínculo RCA do Trigger
- **Problema:** Modal de edição não tinha campo para alterar RCA
- **Solução:** Adicionado select "RCA Vinculada" com opção de remover vínculo
- **Commit:** `fix(triggers): Adicionar campo para alterar vínculo RCA`

---


---

## 🐛 Bugs Pendentes

*Nenhum bug crítico pendente.*

---

## 🔧 Features Pendentes

### Feature #11: Herança de Hierarquia (Trigger -> RCA) (Corrigido)
- **Status:** ✅ Corrigido
- **Solução:** Implementado lookup de nome de ativo via `assets` context no `App.tsx` e pré-população de `asset_name_display`, `area_id`, `equipment_id` e `subgroup_id` na criação da RCA.




---

## 🏗️ Arquitetura Atual

```
RCA-System/
├── server/                 # Backend TypeScript + Express
│   ├── src/
│   │   ├── index.ts       # Entry point (porta 3001)
│   │   ├── db/            # SQLite com sql.js
│   │   └── routes/        # API REST (rcas, triggers, actions, etc)
│   └── data/rca.db        # Banco SQLite
│
├── components/             # React Components
│   ├── TriggersView.tsx   # Gestão de triggers
│   ├── AnalysesView.tsx   # Lista de RCAs
│   ├── RcaEditor.tsx      # Editor de RCA
│   ├── Dashboard.tsx      # Painel com gráficos
│   ├── ConfirmModal.tsx   # Modal customizado (novo)
│   └── ...
│
├── context/
│   └── RcaContext.tsx     # Estado global + API calls
│
├── services/
│   ├── apiService.ts      # Chamadas ao backend
│   └── storageService.ts  # Fallback localStorage
│
└── types.ts               # TypeScript interfaces
```

---

## 📝 Próximos Passos

1. **Revisão Final:** O sistema está completo e estável.
2. **Documentação:** Atualizar documentação técnica se necessário.


---

## 🔗 Links Úteis

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:3001/api
- **Health Check:** http://localhost:3001/api/health
