---
name: rca-formatter
description: Formata dados técnicos de RCA em tabelas Markdown profissionais e padronizadas.
license: MIT
metadata:
  version: "1.1.0"
  author: "GuimaraesL/RCA-System"
  tags: ["markdown", "rca", "formatting", "5w2h"]
---

# RCA Formatter Skill

Use esta skill para transformar objetos JSON brutos de uma RCA em tabelas estruturadas e amigáveis para humanos.

## When to Use
- Quando o usuário solicita "Ações Corretivas" ou "Planos de Ação".
- Quando você precisa apresentar dados JSON como uma tabela Markdown.
- Após recuperar dados completos de uma RCA via `get_full_rca_detail_tool`.

## Tools Provided

### `format_action_plan_table`
Gera uma tabela 5W2H consolidada com todas as ações da RCA.

**Input:** Um dicionário `rca_data` completo (resultado do `get_full_rca_detail_tool`).

**Output:** String Markdown com a tabela formatada.

**Fontes de dados extraídas automaticamente:**
- `containment_actions` → Ações de Contenção
- `root_causes[].actions` → Ações Corretivas
- `human_reliability[].actions` → Ações de Confiabilidade Humana

## Process
1. Receber o dicionário completo da RCA.
2. Extrair ações de todas as fontes (contenção, causa raiz, confiabilidade humana).
3. Classificar cada ação por tipo.
4. Montar a tabela Markdown com colunas: Tipo, Descrição, Responsável, Prazo, Status.

## Best Practices
- **Nunca** tente montar a tabela manualmente se esta ferramenta estiver disponível.
- **Sempre** verifique se o JSON de entrada contém dados antes de chamar a ferramenta.
- Use nomes de colunas curtos e descritivos.
- Se não houver ações, a ferramenta retorna uma mensagem informativa em vez de uma tabela vazia.
