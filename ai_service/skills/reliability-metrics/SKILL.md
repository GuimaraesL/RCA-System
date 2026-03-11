---
name: reliability-metrics
description: Habilidade para calcular e interpretar indicadores de confiabilidade como MTBF (Tempo Médio entre Falhas) e MTTR (Tempo Médio para Reparo).
---
# Reliability Metrics Skill

Esta habilidade permite ao Copiloto RCA quantificar o impacto das falhas e a eficácia das intervenções de manutenção através de dados estatísticos reais do histórico.

## Ferramentas Disponíveis
- `calculate_reliability_metrics_tool`: Recebe uma lista de IDs de RCAs validadas e retorna o MTBF, MTTR e a Disponibilidade Estimada do ativo.

## Como usar
Utilize esta ferramenta sempre que o `RAG Validator` confirmar recorrências para o incidente atual. Isso fornece embasamento estatístico para a severidade da falha e auxilia na priorização do Plano de Ação.
