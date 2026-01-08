# 🚀 RCA System - Roadmap & Tasks

> **Última atualização:** 2026-01-08  
> **Status:** Backend TypeScript + SQLite ✅ Funcionando

---

## 📊 Progresso Geral

| Bugs Core | 5 | 6 | 🟢 83% |
| Features | 0 | 3 | 🔴 0% |
| **Total** | **5** | **9** | **55%** |

---

## ✅ Bugs Corrigidos

### Bug #2: Excluir Trigger
- **Problema:** `window.confirm()` bloqueado pelo navegador corporativo
- **Solução:** Criado `ConfirmModal.tsx` customizado com design moderno
- **Commit:** `fix(triggers): Corrigir exclusão de triggers com ConfirmModal`

### Bug #1: Excluir RCA não funciona
- **Problema:** Botão de lixeira na aba Analyses não executava a exclusão
- **Solução:** Corrigida a função `deleteRecord` no `RcaContext` e vinculado o clique corretamente na `AnalysesView`
- **Status:** ✅ Corrigido

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

### Bug #6: Criar RCA a partir do Trigger
- **Onde:** Aba Triggers → Botão "Nova RCA"
- **Sintoma:** Não abre editor ou não cria
- **Prioridade:** 🟡 Média

---

## 🔧 Features Pendentes

### Feature #7: Importação JSON - Hierarquia de Assets
- **Onde:** Migration → Import JSON
- **Sintoma:** RCAs importam, mas Assets não aparecem ou perdem hierarquia.
- **Causa Técnica:** A função `flatten` em `apiService.ts` converte a árvore em lista, mas o backend pode falhar se um `parent_id` for inserido antes do pai existir. Além disso, o vínculo de `area_id` e `equipment_id` nas RCAs depende dos Assets estarem presentes.
- **Prioridade:** 🟡 Média

### Feature #8: Settings - Adicionar Itens
- **Onde:** Aba Settings → Adicionar tipo de análise, etc
- **Sintoma:** Botão não funciona
- **Causa:** Dados hardcoded, não conectado à API de taxonomy
- **Prioridade:** 🟢 Baixa

### Feature #9: Settings - Excluir Itens
- **Onde:** Aba Settings → Excluir item
- **Sintoma:** Botão não funciona
- **Nota:** Itens são hardcoded no frontend
- **Prioridade:** 🟢 Baixa

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

1. ⬜ Corrigir Bug #1 (Excluir RCA)
2. ⬜ Corrigir Bug #6 (Criar RCA do Trigger)
3. ⬜ Implementar Feature #7 (Import Assets):
    - [ ] Corrigir ordem de inserção (Top-down) no `flatten`.
    - [ ] Garantir que `parent_id` seja `null` se não existir no banco.
    - [ ] Validar se as RCAs importadas mantêm os IDs corretos de Area/Equipamento.
4. ⬜ Refatorar Settings (#8 e #9)

---

## 🔗 Links Úteis

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:3001/api
- **Health Check:** http://localhost:3001/api/health
