# PLAN: Refatoração do TriggersView.tsx (Non-Destructive)

## Objetivo
Refatorar o componente `TriggersView.tsx` (800+ linhas) criando uma **nova estrutura do zero** em `src/components/triggers/`, sem modificar ou deletar o arquivo original. O arquivo original servirá apenas como referência (base).

---

## 🏗️ Nova Estrutura de Arquivos

```
src/
├── components/
│   └── triggers/              # [NEW] Nova pasta para o módulo
│       ├── TriggersPage.tsx   # [NEW] Componente principal (Orchestrator)
│       ├── TriggersList.tsx   # [NEW] Tabela de dados
│       ├── TriggerModal.tsx   # [NEW] Formulário de edição/criação
│       └── TriggerFilters.tsx # [NEW] Barra de filtros (wrapper do FilterBar se necessário)
├── hooks/
│   └── useTriggersLogic.ts    # [NEW] Lógica de estado e handlers
└── utils/
    └── triggerUtils.ts        # [NEW] Funções puras (cálculos, formatação)
```

## 📋 Detalhamento das Tarefas

### Fase 1: Fundação (Utilities & Hooks)
1. **`src/utils/triggerUtils.ts`**
   - Extrair `getFarol` (lógica de dias/cores).
   - Extrair `getAssetName` (busca em árvore).
   - Extrair `getStatusColor`.
   - Extrair `calculateDuration`.

2. **`src/hooks/useTriggersLogic.ts`**
   - Centralizar estado: `isModalOpen`, `editingTrigger`, `filters`.
   - Centralizar handlers: `handleSave`, `handleDelete`, `handleSort`.
   - Centralizar lógica de filtragem complexa (`triggersWithContext`, `dynamicOptions`).

### Fase 2: Componentes UI
3. **`src/components/triggers/TriggerModal.tsx`**
   - Migrar o componente inline `TriggerModal`.
   - Receber props: `isOpen`, `onClose`, `onSave`, `trigger`, `assets`, `taxonomy`.

4. **`src/components/triggers/TriggersList.tsx`**
   - Migrar a tabela `<table>`.
   - Adicionar paginação e ordenação (SortHeader).

5. **`src/components/triggers/TriggersPage.tsx`**
   - Montar o quebra-cabeça.
   - Usar `useTriggersLogic`.
   - Renderizar `TriggerFilters` (ou usar `FilterBar` existente), `TriggersList` e `TriggerModal`.
   - **IMPORTANTE:** Este componente deve replicar exatamente a funcionalidade do original.

### Fase 3: Verificação & Testes
6. **Testes Unitários**
   - Criar `src/utils/__tests__/triggerUtils.test.ts`.

7. **Validação Manual**
   - Usuário poderá importar `TriggersPage` no `App.tsx` para testar a nova versão manualmente.

## 🛑 Regras Críticas
- **NÃO EDITAR** `src/components/TriggersView.tsx` (somente leitura).
- Manter compatibilidade total com `RcaContext`.
- Usar TailwindCSS para estilização (copiar classes existentes).

## Agentes Envolvidos
- `frontend-specialist`: Criação dos componentes e hooks.
- `test-engineer`: Criação dos testes de utilitários.
