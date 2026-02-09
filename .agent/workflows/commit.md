---
description: Workflow para realizar commits seguindo as melhores práticas do GitHub e fechamento de issues.
---

# /commit - Workflow de Commit e Encerramento de Issues

$ARGUMENTS

---

## 📋 Ativação

Este workflow deve ser acionado quando o usuário solicitar a finalização de uma tarefa, commit de alterações ou encerramento de issues.

---

## 🚀 Passos do Workflow

### 1. Auditoria de Alterações
Antes de qualquer commit, realize uma auditoria básica:
- [ ] Verifique arquivos modificados (`git status`).
- [ ] Revise o diff (`git diff --staged`).
- [ ] Garanta que nenhum segredo/chave de API foi exposto.

### 2. Validação de Código (Pre-flight)
// turbo
1. Execute o linter: `npm run lint` ou equivalente.
2. Execute os testes: `npm test` ou equivalente.
3. Verifique erros de tipos: `npx tsc --noEmit`.

### 3. Identificação de Issues
Identifique quais issues estão sendo resolvidos:
- Procure por números de issues no contexto da conversa ou no histórico de tarefas (`{task-slug}.md`).
- Se não encontrar, peça ao usuário: "Quais issues este commit encerra?"

### 4. Geração da Mensagem de Commit
A mensagem DEVE seguir o padrão **Conventional Commits**:
- `feat:` para novas funcionalidades.
- `fix:` para correções de bugs.
- `refactor:` para melhorias no código sem mudança funcional.
- `docs:` para alterações em documentação.

**Formato:**
```text
<tipo>(<escopo>): <descrição curta em português>

<descrição longa detalhando as mudanças significativas e o porquê.>

Closes #<numero_issue>
Fixes #<numero_issue>
```

### 5. Execução do Git & GitHub CLI
// turbo
1. Adicione os arquivos: `git add .`
2. Realize o commit: `git commit -m "<mensagem_gerada>"`
3. Realize o push: `git push origin <branch_atual>`

### 6. Relatório Final
Informe ao usuário o sucesso da operação, os issues vinculados e o hash do commit.

---

## 🛠️ Melhores Práticas do GitHub

1. **Commits Atômicos:** Não misture refatoração de infraestrutura com novas funcionalidades no mesmo commit.
2. **Mensagens Imperativas:** Use "Adiciona gráfico" em vez de "Adicionando gráfico".
3. **Vínculo de Issues:** Use palavras-chave como `closes`, `fixes` ou `resolves` para que o GitHub feche as issues automaticamente após o merge na branch principal.
4. **GitHub CLI:** Utilize `gh issue list` e `gh issue view` para confirmar o estado das issues antes de encerrá-las.

---

## 🎬 Exemplo de Comando

```powershell
# Exemplo de fluxo automatizado via Agente
git add .
git commit -m "feat(dashboard): adiciona gráfico de categorias e resolve exibição de labels em chips

- Implementa o gráfico de barras para Categoria da Falha no Dashboard.
- Corrige o componente FilterBar para traduzir IDs para nomes amigáveis nos chips de filtros ativos.

Closes #44
Closes #52"
git push origin main
```

---

## 🏁 Encerramento

Ao final, valide se o push foi aceito e se os forks/pull requests (se houver) estão atualizados.
