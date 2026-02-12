# Test Catalog - RCA System
# Issues e Avaliação de Qualidade do RCA System

Este documento centraliza a avaliação técnica de possíveis falhas, inconsistências e dívidas técnicas identificadas no código, servindo como backlog para futuras refatorações e correções.

## 1. Código & Qualidade

### 1.1 Hardcoded Strings & Magic Numbers
- [ ] Várias ocorrências de strings de status ("Em Progresso", "Concluída") espalhadas pelo código em vez de constantes.
- [ ] Labels e IDs de assets frequentemente hardcoded em componentes de UI.

### 1.2 Tipagem TypeScript (any)
- [ ] Uso excessivo de `any` em `src/services/apiService.ts` e `src/services/csvService.ts`.
- [ ] Parâmetros de eventos `e: any` em callbacks de UI.

### 1.3 Comentários Todo/Fixme
- [ ] `TODO` em `src/services/apiService.ts` (Implementar retry logic).
- [ ] `FIXME` em `src/hooks/useRcaLogic.ts` (Revisar dependências do useEffect).

## 2. Arquitetura & Componentes

### 2.1 Componentes Monolíticos
- [ ] `RcaEditor.tsx`: Arquivo muito grande, mistura lógica de wizard, validação e UI. Deveria ser quebrado em Steps menores ou Contexto dedicado.
- [ ] `AnalysesView.tsx`: Gerencia estado complexo de filtros que poderia estar em um hook dedicado (`useAnalysesFilter`).

### 2.2 Hooks Complexos
- [ ] `useRcaLogic.ts`: Hook muito extenso, difícil de testar. Mistura validação, fetch de dados e lógica de negócio.

## 3. Performance & Otimização

### 3.1 Renderização de Listas
- [ ] `RcaSelector.tsx`: Renderiza lista completa sem virtualização (Issue #78 criada, mas o problema persiste em outros seletores).
- [ ] `TriggersList.tsx`: Falta de memoização em linhas da tabela pode causar re-renders desnecessários.

### 3.2 Bundle Size
- [ ] Uso de bibliotecas pesadas como `jspdf` e variantes de ícones que poderiam ser lazy loaded.

## 4. UI/UX & Acessibilidade

### 4.1 Inconsistências de Design
- [ ] Mistura de estilos inline com Tailwind classes.
- [ ] Cores fora do padrão do Design System (alguns roxos/violetas ainda presentes).

### 4.2 Feedback ao Usuário
- [ ] Falta de feedback visual claro (loading states) em algumas interações de salvamento.
- [ ] Mensagens de erro genéricas ("Erro ao salvar") sem detalhes técnicos para o suporte.

---

*Gerado em: 2026-02-12*
