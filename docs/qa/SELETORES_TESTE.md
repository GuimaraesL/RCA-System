# Guia de Seletores e Atalhos para Testes - RCA System

Este documento mapeia os seletores e atalhos de teclado implementados no sistema para facilitar a automação de testes E2E e garantir a estabilidade das interações.

---

## 1. Atalhos de Teclado (Navegação e Ação)

O sistema utiliza o hook `useKeyboardShortcuts` para gerenciar comandos globais.

| Atalho | Ação | Destino / Efeito |
| :--- | :--- | :--- |
| `Alt + D` | Navegação | Dashboard |
| `Alt + T` | Navegação | Gatilhos (Triggers) |
| `Alt + A` | Navegação | Análises (RCAs) |
| `Alt + P` | Navegação | Planos de Ação |
| `Alt + H` | Navegação | Ativos (Assets) |
| `Alt + C` | Navegação | Configurações (Settings) |
| `Alt + M` | Navegação | Migração |
| `Alt + N` | Ação | Criar Nova RCA (quando em Análises) |
| `Ctrl + S` | Ação | Salvar (em Editores/Modais) |
| `Ctrl + B` | Interface | Alternar Sidebar (Recolher/Expandir) |
| `Ctrl + K` | Interface | Focar na Busca Global |
| `Esc` | Interface | Fechar Modal ou Cancelar Edição |
| `Alt + ←` | Editor RCA | Voltar Passo do Wizard |
| `Alt + →` | Editor RCA | Avançar Passo do Wizard |

---

## 2. Seletores Robutos (`data-testid`)

Sempre prefira `page.getByTestId()` para interações críticas.

### 2.1. Estados Globais
- `app-suspense-loading`: Loader principal disparado por `lazy components`. **Sempre aguarde este seletor sumir após navegação.**

### 2.2. Editor de RCA (Wizard)
- `btn-close-editor`: Botão voltar/fechar no cabeçalho.
- `select-rca-status`: Select de status no cabeçalho do editor.
- `step-indicator-{1-7}`: Indicadores de passo no topo do wizard.
- `btn-save-rca`: Botão salvar principal no rodapé.
- `btn-next-step` / `btn-prev-step`: Botões de navegação no rodapé.
- `section-five-whys`: Container da ferramenta 5 Porquês.
- `btn-add-why`: Botão para adicionar nível de porquê.
- `input-five-why-question-{index}`: Input da pergunta no 5 Porquês linear.
- `input-five-why-answer-{index}`: Input da resposta no 5 Porquês linear.
- `section-ishikawa`: Container do diagrama de Ishikawa.
- `input-ishikawa-new-item`: Campo de texto para nova causa.
- `btn-add-ishikawa-item`: Botão adicionar ao Ishikawa.
- `section-root-causes`: Container de Causas Raiz.
- `btn-add-root-cause`: Botão adicionar Causa Raiz.

### 2.3. Gatilhos (Triggers)
- `modal-trigger`: Container do modal de criação/edição.
- `btn-save-trigger`: Botão salvar no modal.
- `btn-new-trigger`: (*Sugestão de implementação*) Botão de criação na vista de gatilhos.

### 2.4. Modais Genéricos
- `modal-action`: Modal de Planos de Ação.
- `modal-confirm`: Modal de confirmação de exclusão/saída.
- `btn-confirm-yes`: Botão de confirmação positiva.
- `btn-confirm-no`: Botão de cancelamento no modal.

---

## 3. Seletores de Fallback (IDs Dinâmicos)

Para campos de formulário que utilizam `useId()`, utilize o seletor CSS `$=` (termina com) combinado com o nome do campo:

- `input[id$="what"]`
- `input[id$="failure_date"]`
- `select[id$="analysis_type"]`

**Nota:** Garanta que o componente pai (ou o passo do wizard) esteja visível antes de tentar localizar esses IDs.
