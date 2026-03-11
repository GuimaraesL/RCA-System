---
name: fmea-analysis
description: Especialidade em Engenharia de Manutenção focada em Modos de Falha e Efeitos (FMEA). Permite consultar o banco de dados real e o RAG técnico.
---
# FMEA Analysis Skill

Esta habilidade (skill) capacita o Agente a realizar diagnósticos técnicos determinísticos, cruzando a realidade do ativo com a teoria de engenharia.

## Ferramentas Disponíveis
- `get_asset_fmea_tool`: Busca semântica (RAG) em manuais e bibliotecas FMEA.
- `get_deterministic_fmea_tool`: Consulta direta ao banco de dados estruturado do sistema para obter dados precisos de RPN e ações recomendadas.

## Como usar
Sempre que um ativo for identificado, utilize a consulta determinística primeiro se o ID estiver disponível. Use a busca semântica para encontrar padrões em famílias de equipamentos similares ou manuais de fabricantes.
