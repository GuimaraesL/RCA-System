# Template: Tabela de Plano de Ação (5W2H)

Este documento define o formato padrão para tabelas de plano de ação geradas pela skill `rca-formatter`.

## Estrutura da Tabela

| Coluna        | Descrição                          | Exemplo                    |
| :------------ | :--------------------------------- | :------------------------- |
| **Tipo**      | Classificação da ação              | Contenção, Corretiva, Huma-Rel |
| **Descrição** | O que deve ser feito (em negrito)  | **Trocar rolamento do motor** |
| **Responsável** | Quem é o dono da ação            | João Silva                 |
| **Prazo**     | Data limite para conclusão         | 2026-03-15                 |
| **Status**    | Situação atual da ação             | Pendente, Em Andamento, Concluído |

## Regras de Formatação
1. A descrição da ação deve estar sempre em **negrito**.
2. Se o responsável não for informado, usar "A definir".
3. Se o prazo não for informado, usar "N/A".
4. Se o status não for informado, assumir "Pendente".
5. A tabela deve conter ações de **todas** as fontes disponíveis (contenção, causa raiz, confiabilidade humana).

## Exemplo de Saída

```markdown
| Tipo | Descrição da Ação | Responsável | Prazo | Status |
| :--- | :--- | :--- | :--- | :--- |
| Contenção | **Isolar equipamento para inspeção** | Carlos Mendes | 2026-02-28 | Concluído |
| Corretiva | **Substituir sensor de temperatura** | Ana Lima | 2026-03-10 | Pendente |
| Huma-Rel | **Retreinar operadores no procedimento X** | RH Industrial | 2026-03-20 | Pendente |
```
