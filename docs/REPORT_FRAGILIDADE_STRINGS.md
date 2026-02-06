# Relatório de Fragilidade: Acoplamento de Lógica com Strings (Labels)

**Data:** 06 de Fevereiro de 2026
**Status:** Crítico
**Relator:** @[debugger]

## 1. Sumário Executivo
A investigação técnica revelou que o sistema RCA utiliza "strings amigáveis" (labels) para tomar decisões de lógica de negócio, em vez de utilizar os IDs de sistema estáveis definidos na taxonomia. Esse padrão cria uma fragilidade crítica onde a alteração de um nome de status ou categoria nas Configurações pode quebrar funcionalidades inteiras do sistema silenciosamente.

---

## 2. Pontos Críticos Identificados

### 2.1. Gestão de Status (Backend e Frontend)
O sistema possui IDs normalizados (ex: `STATUS-01`, `STATUS-03`), mas o código ignora esses identificadores em checagens vitais.

*   **Local:** `server/src/v2/domain/services/RcaService.ts`
    *   **Código Atual:** `const doneItem = taxonomy.analysisStatuses.find(s => s.name === 'Concluída');`
    *   **Risco:** Se o gestor do sistema renomear o status para "Finalizada" na tela de Configurações, o backend não conseguirá mais identificar qual status representa uma RCA concluída, impedindo o fechamento automático de análises.
*   **Local:** `src/components/AnalysesView.tsx` e `src/utils/triggerHelpers.ts`
    *   **Código Atual:** `statusName === 'Concluída' ? 'bg-green-100' : ...`
    *   **Risco:** A estilização da interface e a lógica de "farol" de gatilhos dependem de correspondência exata de caracteres, incluindo acentuação.

### 2.2. Ativação de Módulos (HRA - Confiabilidade Humana)
A obrigatoriedade da análise de falha humana é disparada por nomes de categorias 6M.

*   **Local:** `src/components/RcaEditor.tsx`
    *   **Código Atual:** `taxonomy.rootCauseMs.find(m => m.name === 'Mão de Obra')?.id`
    *   **Risco:** Se o sistema for traduzido para Inglês ou se a categoria for renomeada para "Pessoas", o módulo HRA deixará de ser ativado, violando a regra de negócio de segurança.

### 2.3. Inconsistência na Importação e Migração
A lógica de importação aceita tanto IDs quanto Nomes, o que polui o banco de dados.

*   **Local:** `src/services/apiService.ts`
    *   **Código Atual:** `const isOpenStatus = !currentStatus || ... || currentStatus === 'Em Andamento';`
    *   **Impacto:** O banco de dados acaba contendo uma mistura de `STATUS-01` e `Em Andamento` na mesma coluna. Isso inviabiliza consultas SQL diretas e quebra filtros de Dashboard que esperam apenas IDs.

---

## 3. Impactos no Negócio

1.  **Impedimento da Internacionalização (i18n):** O sistema não pode ser portado para Inglês ou Espanhol plenamente, pois a lógica de negócio pararia de funcionar ao encontrar labels traduzidos.
2.  **Manutenção Cara:** Qualquer mudança na taxonomia exige alteração no código-fonte em múltiplos arquivos (Frontend e Backend).
3.  **Falhas Silenciosas:** O sistema não "crasha", ele apenas deixa de aplicar regras de validação, permitindo que RCAs incompletas sejam marcadas como finalizadas.

---

## 4. Recomendações Técnicas

1.  **Protocolo de Identidade:**
    *   **Lógica:** Deve usar **Sempre e Somente** os IDs (ex: `STATUS-03`, `6M-MANPOWER`).
    *   **Interface (UI):** Deve usar o sistema de tradução `t('status.completed')` baseado no ID.
2.  **Centralização de Constantes:**
    *   Criar um arquivo `src/constants/SystemConstants.ts` e `server/src/v2/domain/constants.ts` com Enums para todos os IDs "Hardcoded" necessários.
3.  **Limpeza de Dados:**
    *   Executar um script de migração para converter todos os nomes amigáveis salvos nas colunas de `status`, `specialty_id` e `root_cause_m_id` de volta para seus IDs originais.
4.  **Desacoplamento de UI:**
    *   Remover chaves de cores baseadas em nomes (`'Concluída'`) e passar a usar o ID ou uma propriedade `type` vinda da taxonomia.