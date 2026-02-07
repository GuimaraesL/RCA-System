# 🌐 Relatório Global de Auditoria de Internacionalização (i18n)

**Data:** 07 de Fevereiro de 2026  
**Escopo:** Todo o diretório `src/` (Componentes, Contextos, Hooks, Services)  
**Objetivo:** Garantir conformidade total com o sistema de tradução.

---

## 🛠️ Violações Reais (Visíveis ao Usuário)

| Arquivo | Linha | String Hardcoded | Impacto |
| :--- | :--- | :--- | :--- |
| `RcaSelector.tsx` | 229 | "Sem descrição (What)" | Título da busca não traduz. |
| `Step7Additional.tsx` | 75 | "https://..." (placeholder) | Placeholder técnico fixo. |
| `TriggersList.tsx` | 50 | "Farol" (label) | Label de coluna fixo em PT. |
| `ReportsView.tsx` | 169 | "Box" (label) | Texto de categoria fixo. |

---

## 🔍 Inconsistências Técnicas (Módulos de Sistema)

### 1. Contextos e Tipagem (`RcaContext.tsx`)
- Detectadas múltiplas instâncias da palavra "Promise" entre símbolos de comparação (`<Promise>`). 
- **Ação:** Nenhuma (Falso-positivo de auditoria JSX).

### 2. Lógica de Interface (`ActionsView.tsx`, `AnalysesView.tsx`)
- Detectado o código de paginação: `setCurrentPage(prev => (prev * itemsPerPage...)`.
- **Análise:** Embora seja código, a regex o captura como texto JSX se estiver mal formatado ou dentro de um fragmento.

---

## 🚀 Próximos Passos de Limpeza

1.  **Refatorar Placeholders:** Mover `"https://..."` e `"0.00"` para o dicionário global em `common.ts`.
2.  **Traduzir Labels de Tabela:** Garantir que "Farol" e "ID" usem a função `t()`.
3.  **Sanitizar a Factory:** Garantir que os dados gerados pela `rcaFactory` também suportem chaves de tradução.

---
*Relatório expandido para cobrir 100% da base de código frontend.*