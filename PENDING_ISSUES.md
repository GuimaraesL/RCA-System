# Backlog de Questões Sistêmicas (RCA Status & Validação)

## [Issue #20] Sincronização e Gatilhos de Atualização de Status de RCA

**Descrição:**
Atualmente, o status de uma RCA (ex: "Em Análise" -> "Concluída") é recalculado apenas no frontend, dentro do hook `useRcaLogic`, quando o usuário **abre** a análise. Isso causa inconsistências na listagem (Dashboard/Listas), onde uma RCA pode parecer pendente quando já deveria estar concluída (ou vice-versa) até que alguém a abra.

**Perguntas Chave:**
1. **Onde deve residir a Verdade?** O status deve ser uma consequência calculada no Backend a cada operação de escrita (SAVE)?
2. **Performance:** Calcular status em *read-time* (na listagem) para milhares de registros é inviável e custoso ($O(n)$).
3. **Gatilhos:** Quais ações disparam recálculo? (Salvar 5Q, Adicionar Ação, Completar Metadados).

**Proposta Inicial:**
- Mover a lógica de transição de status para o **Backend** (`POST/PUT /rca`).
- O Frontend apenas exibe o status persistido.
- Criar um endpoint de manutenção para "Recalcular Todos" (batch job) caso a lógica mude.

---

## [Issue #21] Estratégia de Retroatividade e Versionamento de Regras

**Descrição:**
Com a introdução de **Campos Obrigatórios Configuráveis (Issue #19)**, surge um dilema de consistência de dados antigos.
*Exemplo:* Uma RCA foi concluída em 2024. Hoje, o admin define que "Anexos" são obrigatórios.
*Problema:* Se abrirmos essa RCA antiga, ela deve ser rebaixada para "Pendente"?

**Cenários a Decidir:**
1. **Retroatividade Estrita:** Regras novas valem para todos. RCAs antigas "perdem" o status de concluída até serem adequadas. (Mais seguro, mas frustrante para o usuário).
2. **Snapshot / Versionamento:** Uma RCA é validada com as regras vigentes na data de sua conclusão. (Complexo de implementar).
3. **Forward-Only (Apenas Edição):** RCAs antigas mantêm o status. Se o usuário tentar *editar* e *salvar de novo*, aí sim as novas regras se aplicam.

**Proposta Inicial:**
- Adotar estratégia **Forward-Only**. O status persistido no banco é a verdade.
- Só validar conformidade ("Mandatory Fields") no momento de uma transição de status explícita (tentativa de re-conclusão) ou edição crítica.

---

## [Issue #22] Performance e Custo do Recálculo de Status

**Descrição:**
Avaliar o impacto de mover a lógica para o backend vs manter no cliente.
- Se mantivermos no cliente, a listagem precisaria carregar dados profundos (actions, root causes) de todas as RCAs para calcular o status "on the fly"? **Não recomendável.**
- O "custo" de mover para o backend é duplicar a lógica de validação (hoje no `useRcaLogic`) ou portá-la totalmente para o servidor.

**Ação:**
- POC: Portar a função `updateStatus` do `useRcaLogic.ts` para o `rca.ts` (backend).
