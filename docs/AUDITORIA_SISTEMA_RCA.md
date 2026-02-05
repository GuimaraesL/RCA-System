# Relatório de Auditoria e Diagnóstico - RCA System
**Data:** 05 de Fevereiro de 2026  
**Status:** Investigação 100% Concluída  
**Versão Alvo:** 2.2.0 (Integrity Sprint)

---

## 1. Bugs Críticos (Crash & Runtime)

### 1.1 Loop Infinito de Renderização no Modal de Gatilhos
- **Sintoma:** Ao abrir "New Trigger" e expandir/selecionar itens no `AssetSelector`, o console é inundado com `Maximum update depth exceeded`.
- **Causa Provável:** O componente `TriggersPage` possui um `useEffect` que reseta a `currentPage` sempre que o estado de `filters` muda. Ao selecionar um ativo, o `handleAssetSelect` atualiza o trigger, que por sua vez pode estar disparando uma atualização nos filtros dinâmicos, criando um ciclo entre o modal e a página pai.
- **Localização:** `components/triggers/TriggersPage.tsx` e `hooks/useTriggersLogic.ts`.

### 1.2 Erro de Propriedade Nula no RcaEditor
- **Sintoma:** Erro `value prop on %s should not be null` ao carregar registros existentes.
- **Causa:** Campos como `OS Number`, `Financial Impact` ou `Quality Impacts` estão vindo como `null` do banco de dados, mas os inputs do React esperam uma string vazia `""` para componentes controlados.
- **Localização:** `components/RcaEditor.tsx` e sub-componentes de `steps/`.

### 1.3 Duplicidade de Colunas na Listagem de Gatilhos
- **Sintoma:** O cabeçalho da tabela exibe duas colunas "Status".
- **Detalhe:** Uma refere-se ao "Farol" (idade/prazo) e a outra ao status taxonômico. Ambas usam rótulos conflitantes.
- **Localização:** `components/triggers/TriggersList.tsx`.

---

## 2. Integridade e Consistência de Dados

### 2.1 Poluição por Erro de Importação (`#NAME?`)
- **Problema:** Resíduos de erro de fórmula do Excel (`#NAME?`) foram persistidos como valores válidos na taxonomia de "Analysis Types" e "Failure Modes".
- **Impacto:** Quebra a filtragem e polui os dashboards.

### 2.2 Anomalias de Data e Tempo
- **Truncamento:** Registros com ano "203" em vez de "2023" ou "2024".
- **Datas Futuras:** Registros com data em "2027" para eventos já analisados.
- **Inconsistência 5W1H:** O campo "When" aceita apenas data, mas o requisito pede "Data/Hora detalhada".

### 2.3 Sujeira na Taxonomia (6M e Categorias)
- **Duplicatas:** "Máquina" vs "Maquina", "Mão de Obra" vs "Mão Obra".
- **Categorias Verbosas:** "Failure Category" sendo usada para armazenar descrições longas (ex: "Queda da chaveta; com folga entre o conjunto...") em vez de categorias normalizadas.

---

## 3. i18n (Internacionalização)

### 3.1 Lacuna no Checklist de Manutenção
- **Problema:** Todos os 11 itens do checklist de precisão estão "hardcoded" em Português no banco ou no código, sem chaves de tradução.
- **Sintoma:** Console exibe `Translation missing` para cada item quando o sistema está em Inglês.

### 3.2 UI Frankenstein (Híbrida)
- **Problema:** A interface traduz botões e labels, mas o conteúdo dinâmico (Status, Especialidades, Modos de Falha) permanece 100% em Português.
- **Sugestão:** Implementar tradução no nível da taxonomia ou mapeamento no frontend.

### 3.3 Erros de Tradução e Chaves Ausentes
- **Modal de Exclusão:** Tentativa de acesso a `confirmModal.deleteTitle` enquanto o arquivo i18n utiliza `modals.deleteTitle`.
- **Mecânica:** Uso de "Mecânicas" (plural) e "Mecânica" (singular) de forma inconsistente.

---

## 4. UX, Design e Performance

### 4.1 Exposição de Débito Técnico (UUIDs)
- **Problema:** UUIDs de 36 caracteres são exibidos na primeira coluna de quase todas as tabelas.
- **Impacto:** Visual "poluído" e técnico demais. O PRD pede uma "UX Premium". IDs de sistema devem ser ocultos ou substituídos por IDs curtos de exibição.

### 4.2 Truncamento Excessivo (5 Whys)
- **Problema:** No modo árvore, as perguntas são cortadas em menos de 20 caracteres (ex: "Why 'Falha nos sensores d'?"), impossibilitando a leitura do fluxo lógico.

### 4.3 Inconsistência Monetária
- **Problema:** Input pede "$" (Dólar), mas o rodapé calcula em "R$" (Real).

---

## 5. Arquitetura e Código Morto

### 5.1 Redundância de Componentes
- **Arquivo:** `components/TriggersView.tsx`.
- **Status:** Código morto. O sistema utiliza `components/triggers/TriggersPage.tsx`. Deve ser removido para evitar confusão.

### 5.2 Sincronização Issue #20
- **Observação:** A migração da lógica de status para o backend está gerando conflitos onde o frontend ainda tenta validar campos mandatórios de forma redundante ou baseada em nomes de status antigos (ex: "Aguardando Verificação" vs "STATUS-WAITING").

---

## Próximos Passos Sugeridos
1. **Sanitização de Dados:** Script de correção para remover `#NAME?` e unificar categorias duplicadas.
2. **Fix do Loop:** Refatorar `handleAssetSelect` com `useCallback` e revisar dependências do `useEffect` em `TriggersPage`.
3. **Mapeamento i18n:** Adicionar os itens do checklist ao `en.ts` e `pt.ts`.
4. **Limpeza de UI:** Ocultar UUIDs e adicionar cabeçalhos faltantes nas tabelas de ações.
