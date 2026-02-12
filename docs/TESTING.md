# Estratégia e Procedimentos de Testes - RCA System

Este documento detalha a arquitetura de testes, as ferramentas utilizadas e os procedimentos obrigatórios para garantir a qualidade e estabilidade do RCA System.

---

## 1. Pirâmide de Testes

O projeto segue uma estrutura de testes dividida em três camadas principais:

### 1.1. Testes Unitários (Vitest)
- **Escopo:** Funções puras, hooks do React e lógica de domínio isolada.
- **Localização:** 
  - Frontend: `src/**/__tests__/*.test.ts(x)`
  - Backend: `server/src/**/__tests__/*.test.ts`
- **Ferramenta:** Vitest com JSDOM para simulação de ambiente de navegador no frontend.

### 1.2. Testes de Integração (Vitest)
- **Escopo:** Validação da interação entre serviços, repositórios e banco de dados SQLite.
- **Localização:** `server/src/v2/__tests__/*.test.ts`
- **Ferramenta:** Vitest executando contra um banco de dados de teste (`rca_test.db`).

### 1.3. Testes de Ponta a Ponta - E2E (Playwright)
- **Escopo:** Fluxos completos de usuário, validação de interface e integração total (com mocks de API).
- **Localização:** `tests/e2e/*.spec.ts`
- **Ferramenta:** Playwright.

---

## 2. Execução via CLI

### 2.1. Executar Testes do Frontend (Raiz)
```bash
npx vitest run
```

### 2.2. Executar Testes do Backend
```bash
npm test --prefix server
```

### 2.3. Executar Testes E2E
```bash
npx playwright test
```
Para abrir a interface visual do Playwright:
```bash
npx playwright test --ui
```

---

## 3. Guia de Mocking e Dados de Teste

### 3.1. Mocking no Frontend (E2E)
Seguimos o padrão de **API Shadowing**. Nunca dependemos do backend real para testes funcionais de UI. O isolamento deve ser feito no `beforeEach`:

```typescript
await page.route('**/api/**', async route => {
  // Retorne dados controlados via Factories
});
```

### 3.2. Uso de Factories
Utilizamos fábricas de dados para garantir que os objetos de teste sejam consistentes e completos.
- **Referência:** `tests/factories/rcaFactory.ts`
- **Regra:** Nunca utilize objetos literais incompletos; use sempre as factories para evitar erros de runtime (Blank Screens).

### 3.3. Regressão Visual (Snapshots)
O projeto possui suporte inicial para snapshots visuais através do Playwright.
- **Implementação:** O método `takeSnapshot(name)` está disponível no `RcaEditorPage`.
- **Status Atual:** Desabilitado por padrão no ambiente de Integração Contínua (CI) para evitar falso-positivos por renderização de fontes.
- **Uso Local:** Pode ser habilitado em arquivos `.spec.ts` para validar mudanças complexas de layout.

---

## 4. Guia de Maturidade e Resolução de Problemas (Knowledge Base)

Este capítulo consolida as soluções para os desafios técnicos enfrentados na automação do projeto.

### 4.1. O Fenômeno da Tela Branca (Blank Screen)
Durante a execução de testes no modo visível, a interface pode travar ou ficar branca devido a:
1. **Conflito de Virtualização:** O container pai deve ter dimensões fixas.
2. **Velocidade de Mocks:** Mocks respondendo em 0ms podem quebrar a hidratação do React.
3. **Dados Incompletos:** Filtros falham se propriedades da taxonomia forem `undefined`.

**Solução Padrão:**
- Viewport estático de 1280x720 no `playwright.config.ts`.
- Aguardar o desaparecimento de `data-testid="app-suspense-loading"`.
- Garantir mocks completos via Factories.

### 4.2. Instabilidade do DOM (Element Detachment)
Re-renderizações agressivas podem fazer com que o Playwright perca a referência de elementos.
- **Estratégia:** Aguardar estado `networkidle` e visibilidade de containers principais antes de interagir.
- **Page Object Model (POM):** Centralizar seletores em `tests/pages/`.

### 4.3. Intercepção de Ponteiro (Z-Index)
Inputs invisíveis podem bloquear cliques em botões reais.
- **Workaround:** Utilizar `{ force: true }` ou `dispatchEvent('click')` enquanto ajustes de CSS não forem aplicados.

---

## 5. Protocolo de Criação de Novos Testes

1. **Page Objects:** Nunca use seletores CSS diretos nos arquivos `.spec.ts`. Use as classes em `tests/pages/`.
2. **Monitoramento:** Ative a captura de erros de console (`page.on('pageerror', ...)`) para diagnosticar falhas.
3. **Bilíngue (i18n):** Use Regex para busca de botões (ex: `/Salvar|Save/i`).
4. **Idioma e Padrão:**
   - Todos os comentários e nomes de testes devem ser em **Português (PT-BR)**.
   - Proibido o uso de emojis em descrições técnicas.
   - Manter o cabeçalho detalhando: Proposta, Ações, Execução e Fluxo.

---

## 6. Configuração do Ambiente

1. Certifique-se de que as dependências estão instaladas: `npm install` e `npm install --prefix server`.
2. Instale os navegadores do Playwright: `npx playwright install`.
3. O frontend deve estar configurado para rodar na porta 3000 durante os testes E2E locais (conforme `playwright.config.ts`).

---

> **Nota:** Este documento deve ser mantido vivo e atualizado conforme a arquitetura evolui. Qualquer decisão em relação a testes e automação deve ser refletida aqui.

---

## 📚 Documentação Relacionada
- [Visão Geral do Produto (PRD)](./PRD.md)
- [Arquitetura Técnica](./ARCHITECTURE.md)
- [Referência da API](./API_REFERENCE.md)
- [Diretrizes de Código](./CODE_GUIDELINES.md)
- [Design System](./DESIGN_SYSTEM.md)
- [Catálogo de Testes](./TEST_CATALOG.md)
- [PRD - Requisitos](./PRD.md)

---

> **Nota de Manutenção:** Mantenha este documento atualizado. Ajustes na estratégia de testes devem ser refletidos no [TEST_CATALOG.md](./TEST_CATALOG.md).
