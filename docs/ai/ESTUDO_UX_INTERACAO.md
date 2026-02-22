# Estudo de UX: Interação Inteligente no RCA System

Atualmente, a IA é acionada via um botão "Assistir com IA" no Editor de RCA. Este estudo explora outros modos de interface para tornar o sistema mais fluido e proativo.

## 1. Modos de Interação Propostos

### A. IA "Ghost" (Autocompletar Inteligente)
- **Como funciona:** Enquanto o usuário digita a descrição ou o "5 Porquês", a IA sugere continuações em texto cinza claro (ghost text).
- **Vantagem:** Reduz o esforço cognitivo e acelera o preenchimento.
- **Desafio:** Requer debounce agressivo para não onerar a API.

### B. Painel Lateral de Diagnóstico (Sidebar)
- **Como funciona:** Um painel lateral que fica aberto permanentemente durante a edição, atualizando insights automaticamente conforme o formulário é preenchido.
- **Vantagem:** Interação contínua sem cobrir os campos do formulário.

### C. Gatilhos Contextuais (Popovers)
- **Como funciona:** Quando o usuário seleciona um Ativo, um pequeno ícone de "FMEA disponível" ou "Recorrência detectada" pisca discretamente. Ao clicar, abre o insight específico.
- **Vantagem:** Menos "barulhento" que o banner atual, porém muito focado.

### D. Chat Interativo (Copilot Style)
- **Como funciona:** Uma janela de chat na parte inferior onde o usuário pode perguntar: "Baseado no FMEA desse motor, o que mais devo verificar?".
- **Vantagem:** Flexibilidade total para investigações complexas.

## 2. Auditoria de Auditoria (Feedback Loop)
- Implementar botões de 👍/👎 em cada insight da IA.
- Salvar o feedback do usuário para re-treinamento ou ajuste de prompt (Ranking de Qualidade).

## 3. Próximos Passos
1. Validar a aceitação do Banner de Recorrência (Fase 3).
2. Prototipar a Sidebar de Insights na Fase 5.
