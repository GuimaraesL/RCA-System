# Plano de Refatoração: Desacoplamento de Strings e IDs de Sistema

Este plano visa resolver os problemas críticos apontados no `REPORT_FRAGILIDADE_STRINGS.md`, onde a lógica de negócio depende de strings voláteis (labels) em vez de identificadores estáveis.

## 1. Estratégia Geral
Substituir comparações de strings mágicas por constantes de ID.

**IDs Canônicos Mapeados:**
*   `STATUS-01`: Em Andamento
*   `STATUS-02`: Aguardando Verificação (ou Em Andamento v2, verificar duplicidade) -> *Nota: `grep` mostrou uso de STATUS-01 e STATUS-02 para 'Em Andamento', precisa unificar.*
*   `STATUS-03`: Concluída
*   `M1`: Mão de Obra
*   `M2`: Método (Inferido, verificar taxonomy repo)

## 2. Definição de Constantes (Shared Defaults)

### 2.1. Arquivo: `src/constants/SystemConstants.ts` (Frontend & Backend Shared se possível, ou duplicar por enquanto)

```typescript
export enum STATUS_IDS {
    IN_PROGRESS = 'STATUS-01',
    WAITING_VERIFICATION = 'STATUS-02',
    CONCLUDED = 'STATUS-03',
    DELAYED = 'STATUS-04',
    CANCELLED = 'STATUS-05'
}

export enum ROOT_CAUSE_M_IDS {
    MANPOWER = 'M1',
    METHOD = 'M2',
    MACHINE = 'M3',
    MATERIAL = 'M4',
    MEASUREMENT = 'M5',
    ENVIRONMENT = 'M6'
}
```

### 2.2. Hotspots Identificados (Mapping Exaustivo)
Abaixo, os locais onde a lógica deve ser alterada de `name === 'String'` para `id === ID`:

#### **Status: 'Concluída'**
*   `server/src/v2/domain/services/RcaService.ts`: Lógica de conclusão automática.
*   `src/components/AnalysesView.tsx`: Renderização de badges (cores).
*   `src/utils/triggerHelpers.ts`: Helper `isClosed` e cores.
*   `src/services/apiService.ts`: Mensagens de log.

#### **Status: 'Em Andamento'**
*   `src/services/apiService.ts`: Variável `isOpenStatus` mistura ID e String. Risco alto.
*   `src/utils/triggerHelpers.ts`: Badge colors.

#### **Categoria: 'Mão de Obra'**
*   `src/components/RcaEditor.tsx`: Lógica de ativação do módulo HRA.
*   `src/components/Dashboard.tsx`: Traduções de gráficos.

## 3. Refatoração Backend (`backend-specialist`)

### 3.1. `server/src/v2/domain/services/RcaService.ts`
*   **Problema:** `taxonomy.analysisStatuses.find(s => s.name === 'Concluída')`
*   **Solução:** Substituir por `taxonomy.analysisStatuses.find(s => s.id === STATUS_IDS.CONCLUDED)` ou uso direto do ID se a taxonomia garantir.

### 3.2. Script de Migração de Dados
*   **Tarefa:** Criar script SQL ou Node.js para varrer tabelas `rcas`, `triggers`, `actions` e converter strings legadas em colunas de ID para os IDs corretos.
*   **Alvo:** Colunas `status`, `specialty_id`, `root_cause_m_id` que possam conter nomes.

## 4. Refatoração Frontend (`frontend-specialist`)

### 4.1. `src/utils/triggerHelpers.ts` e `src/components/AnalysesView.tsx`
*   **Problema:** Lógica de cor baseada em nome.
*   **Solução:** Usar `STATUS_IDS` para switch/case de cores.

### 4.2. `src/components/RcaEditor.tsx`
*   **Problema:** Ativação HRA baseada em `'Mão de Obra'`.
*   **Solução:** `const isManpower = categoryId === ROOT_CAUSE_M_IDS.MANPOWER;`

### 4.3. `src/services/apiService.ts`
*   **Problema:** `isOpenStatus` checando string.
*   **Solução:** Checar contra lista de IDs de status abertos.

## 5. Verificação (`test-engineer`)

### 5.1. Testes Automatizados
*   Executar `full-app-flow.spec.ts` para garantir que o fluxo de RCA continua funcionando.
*   Adicionar teste específico que tenta concluir uma RCA e verifica se o status foi persistido como ID corretamente.

### 5.2. Teste Manual (Orchestrator Check)
*   Verificar se a aba "Confiabilidade Humana" aparece ao selecionar 'Mão de Obra'.
*   Verificar se as cores dos status na dashboard estão corretas.

## 6. Ordem de Execução
1.  Criar arquivos de Constantes (Backend e Frontend).
2.  Refatorar Backend (`RcaService`).
3.  Refatorar Frontend (`RcaEditor`, `AnalysesView`, `apiService`).
4.  Executar Testes.
