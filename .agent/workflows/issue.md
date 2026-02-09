---
description: Workflow para criação de issues no GitHub via CLI seguindo as melhores práticas de documentação e rotulagem.
---

# /issue - Workflow de Criação de Issues

$ARGUMENTS

---

## 📋 Objetivo

Padronizar a criação de issues para garantir clareza, rastreabilidade e facilitar a implementação por qualquer desenvolvedor ou agente de IA.

---

## 🚀 Passos do Workflow

### 1. Definição do Tipo
Identifique a natureza da demanda:
- **Bug**: Algo não está funcionando como deveria.
- **Enhancement/Feature**: Uma nova funcionalidade ou melhoria de uma existente.
- **Task/Maintenance**: Refatoração, limpeza de código ou atualização de dependências.
- **Documentation**: Melhorias nos arquivos de documentação.

### 2. Coleta de Informações
Prepare os elementos essenciais:
- **Título**: Curto e descritivo (ex: `[Bug] Erro de renderização no gráfico de 6M`).
- **Contexto**: Por que esta issue é necessária?
- **Critérios de Aceite**: O que define que a issue foi resolvida?
- **Tarefas (Checklist)**: Lista técnica do que precisa ser feito.

### 3. Seleção de Labels
Utilize as labels padrão do repositório:
- `bug`, `enhancement`, `documentation`, `critical`, `help wanted`.

### 4. Execução via GitHub CLI
Utilize o comando formatado para criar a issue de forma interativa ou direta.

**Comando Recomendado:**
```powershell
gh issue create --title "[TIPO] Descrição Curta" --body "CONTEÚDO" --label "tipo-label"
```

---

## 📝 Templates de Body (Melhores Práticas)

### Para Funcionalidades (Feature)
```markdown
**Descrição da Necessidade**
[Descreva o que precisa ser feito e por quê]

**Critérios de Aceite**
- [ ] Item 1
- [ ] Item 2

**Informações Técnicas**
- Arquivos afetados: `src/components/...`
- Dependências: `lucide-react`, `recharts`
```

### Para Erros (Bug)
```markdown
**Descrição do Erro**
[O que está acontecendo?]

**Passos para Reproduzir**
1. Vá para '...'
2. Clique em '....'
3. Veja o erro '....'

**Comportamento Esperado**
[O que deveria acontecer?]

**Impacto**
[Baixo/Médio/Alto]
```

---

## 🎬 Exemplo de Execução pelo Agente

Ao receber uma demanda complexa, o Agente deve:
1. Analisar os arquivos envolvidos.
2. Formular o comando `gh`.
3. Executar:
```powershell
gh issue create --title "[Feature] Implementar Exportação de PDF para RCAs" --body "**Contexto**
Usuários precisam gerar relatórios físicos das análises concluídas.

**Critérios de Aceite**
- [ ] Botão de exportação na AnalysesView.
- [ ] Geração de PDF via jspdf.
- [ ] Inclusão de gráficos e 5 porquês.

**Tarefas**
- [ ] Instalar jspdf.
- [ ] Criar serviço de template PDF.
- [ ] Adicionar botão na UI." --label "enhancement"
```

---

## 🏁 Verificação Final
Após criar a issue, o Agente deve confirmar o número gerado e a URL para consulta do usuário.
