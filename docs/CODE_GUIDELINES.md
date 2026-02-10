# Diretrizes de Código e Melhores Práticas - RCA System

Este guia define os padrões técnicos, arquiteturais e de comportamento para o desenvolvimento do RCA System. O cumprimento destas diretrizes é obrigatório para todos os colaboradores e agentes de IA.

---

## 1. Arquitetura e Separação de Responsabilidades

O projeto segue uma separação rigorosa entre as camadas para garantir testabilidade e manutenção.

### 1.1. Frontend (`src/`)
- **Components (`/components`):** Apenas apresentação e interação de UI. Devem ser agnósticos à origem dos dados quando possível.
- **Hooks (`/hooks`):** Toda a lógica de negócio, validação e estado complexo reside aqui. Componentes chamam hooks; eles não processam dados pesados.
- **Context (`/context`):** Estado global e orquestração de dados (ex: Cache de API, Configurações).
- **Services (`/services`):** Portas de saída para o mundo externo (API REST, LocalStorage, CSV).
- **Utils (`/utils`):** Funções puras, cálculos matemáticos e formatadores de data.

### 1.2. Backend (`server/src/v2/`)
- **API (`/api`):** Controladores (entrada/saída HTTP) e Schemas de validação (Zod).
- **Domain (`/domain`):** Serviços com as regras de negócio "hardcore" (ex: cálculo dinâmico de status).
- **Infrastructure (`/infrastructure`):** Repositórios (SQL) e conexão com banco de dados.
- **Types (`/types`):** Definições de interfaces que refletem o contrato entre as camadas.

---

## 2. Padrões de Nomenclatura

### 2.1. Arquivos e Pastas
- **Componentes React:** `PascalCase.tsx` (ex: `RcaEditor.tsx`).
- **Hooks:** `camelCase` com prefixo `use` (ex: `useRcaLogic.ts`).
- **Arquivos de Lógica/Utils:** `camelCase.ts` (ex: `apiService.ts`).
- **Pastas:** `kebab-case` ou `camelCase` (preferência por minúsculas).

### 2.2. Variáveis e Funções
- **Variáveis/Funções:** `camelCase`.
- **Constantes/Enums:** `UPPER_SNAKE_CASE`.
- **Interfaces/Types:** `PascalCase`.

---

## 3. Comentários e Documentação

### 3.1. Filosofia de Comentários
- **FOCO NO PORQUÊ:** Comente o motivo de uma decisão complexa, não o que o código faz (o código deve ser autoexplicativo).
- **IDIOMA:** Todos os comentários devem ser em **Português (PT-BR)**.
- **PROIBIÇÃO DE EMOJIS:** Não utilize emojis em comentários de código ou documentação técnica para manter a sobriedade profissional.

### 3.2. Cabeçalho de Arquivos Críticos
Arquivos de serviço ou teste devem conter um pequeno bloco informativo no topo:
```typescript
/**
 * Proposta: [O que este arquivo resolve]
 * Fluxo: [Como os dados passam por aqui]
 */
```

---

## 4. Tratamento de Erros e Logs

- **Logs de Console:** Devem ser em **Português (PT-BR)** e incluir prefixos identificadores:
  - `console.log('✅ Context: RCA salva com sucesso')`
  - `console.error('❌ API Error [GET /rcas]:', error)`
- **Validação:** Utilize sempre **Zod** no backend e no frontend para garantir que contratos de dados não sejam quebrados.
- **UI Feedback:** Nunca deixe o usuário sem resposta. Use o estado de erro para mostrar alertas visuais em vermelho.

---

## 5. UI/UX e Estilo

- **Framework:** Tailwind CSS v4.
- **Cores:** Siga a paleta de tons Slate/Blue/Indigo do projeto.
- **Acessibilidade:** Todo input deve ter um `label` associado ou `aria-label`.
- **Reatividade:** Garanta que componentes pesados utilizem `React.memo` ou `useMemo` para evitar re-renderizações desnecessárias (especialmente com i18n).

---

## 6. Padrão de Commits (Conventional Commits)

Seguimos rigorosamente o padrão de Conventional Commits para manter um histórico limpo e automatizável:

- `feat:` Nova funcionalidade.
- `fix:` Correção de bug.
- `docs:` Alterações em documentação.
- `style:` Formatação, pontos e vírgulas, etc (sem alteração de código).
- `refactor:` Refatoração de código de produção.
- `test:` Adição ou correção de testes.
- `chore:` Atualização de tarefas de build, dependências, etc.

**Exemplo:** `fix(validation): corrige tipo de dado em potential_impacts`

---

## 7. Fluxo de Trabalho e Revisão (GitHub)

1. **Issues:** Nenhuma linha de código deve ser escrita sem uma Issue associada.
2. **Branches:** Crie branches descritivas (ex: `fix/issue-70-csv-status`).
3. **Revisão:** Antes de considerar uma tarefa pronta, execute a suíte completa de testes:
   - `npm test --prefix server`
   - `npx vitest run`
   - `npx playwright test`
4. **Commits:** Não realize commits automáticos sem revisão manual do `git diff`.

---

## 8. Testes

Consulte o documento [docs/TESTING.md](./TESTING.md) para diretrizes detalhadas sobre a pirâmide de testes e resolução de problemas técnicos em automação.