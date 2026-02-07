#  Guia de Maturidade e Resolução de Problemas em Testes E2E

Este documento serve como memória técnica dos desafios enfrentados durante a implementação da suíte de testes do **RCA System** e como guia obrigatório para a criação de novos testes funcionais.

---

## 1. O Fenômeno da "Tela Branca" (Blank Screen)

### O Problema
Durante a execução de testes no modo visível (`--headed`), a interface frequentemente ficava totalmente branca ou travada em um estado de carregamento infinito, impedindo qualquer interação.

### Causas Identificadas
1.  **Conflito de Virtualização (AutoSizer):** O componente `react-virtualized-auto-sizer` calculava uma altura de `0px` se o container pai não tivesse dimensões fixas no momento do carregamento.
2.  **Velocidade dos Mocks vs Hidratação do React:** Nossos mocks respondiam em 0ms, enviando dados para componentes que ainda não tinham terminado de montar seu ciclo de vida.
3.  **Crash por Dados Incompletos:** O Dashboard realizava operações de `.filter()` em propriedades da taxonomia que estavam vindo como `undefined` nos mocks iniciais.

### Como Corrigimos (O Padrão Atual)
- **Viewport Estático:** Configuramos o `playwright.config.ts` com um tamanho de janela fixo (1280x720).
- **Espera pelo Suspense:** Criamos uma barreira no `beforeEach` que aguarda explicitamente o componente `data-testid="app-suspense-loading"` desaparecer.
- **Mocks Completos (Fábricas):** Implementamos a `rcaFactory.ts` que garante que nenhum objeto (Taxonomia, RCA ou Gatilho) possua campos nulos que disparem erros de runtime no React.

---

## 2. Instabilidade do DOM (Element Detachment)

### O Problema
O Playwright localizava o botão, mas ao tentar clicar, recebia o erro: `element was detached from the DOM`.

### Causa Raiz
**Re-renderizações Agressivas.** O sistema executava múltiplos ciclos de atualização de estado logo após receber dados da API. Isso fazia com que o React destruísse e recriasse o menu lateral e os botões de ação repetidamente.

### Estratégia de Proteção
- **Estabilização de Estado:** Os testes agora aguardam estados de rede (`networkidle`) e visibilidade de containers principais (`aside`) antes de interagir.
- **Page Object Model (POM):** Centralizamos a localização de elementos em classes específicas. Se um seletor muda ou se torna instável, corrigimos em apenas um lugar.

---

## 3. Interceptação de Ponteiro (Z-Index)

### O Problema
Erro: `... <input type="file" ... /> intercepts pointer events`. O clique do robô era "roubado" por um elemento invisível.

### Causa Raiz
O input de upload de arquivos (CSV/JSON) estava mal posicionado no CSS, flutuando sobre os botões de ação reais.

### Solução de Teste (Workaround)
- **Cliques Forçados:** Utilizamos `{ force: true }` ou `dispatchEvent('click')` para garantir que a ação ocorra mesmo com obstruções de layout, enquanto o débito técnico de CSS aguarda correção no código de produção.

---

## 4. Arquitetura das Novas Suítes (Protocolo de Criação)

Para criar um novo teste, siga este checklist:

### A. Isolamento Total (API Shadowing)
Nunca dependa do backend real para testes funcionais de UI. Utilize o interceptador no `beforeEach`:
```typescript
await page.route('**/api/**', async route => {
  // Retorne dados da rcaFactory
});
```

### B. Uso de Page Objects
Nunca use seletores CSS diretos nos arquivos `.spec.ts`. Utilize as classes em `tests/pages/`:
```typescript
const editor = new RcaEditorPage(page);
await editor.open();
```

### C. Monitoramento de Saúde (Browser Logs)
Sempre ative a captura de erros de console para diagnosticar "Blank Screens" futuros:
```typescript
page.on('pageerror', err => console.log(` BROWSER CRASH: ${err.message}`));
```

### D. Validação Bilíngue (i18n)
Ao buscar botões por nome, use sempre Regex para suportar PT/EN:
```typescript
await page.getByRole('button', { name: /Salvar|Save/i });
```

---

## 5. Resumo da Estrutura de Pastas de Teste

- `tests/e2e/`: Especificações de teste divididas por domínio (Modais, i18n, Stress, Migração).
- `tests/pages/`: Camada de abstração (Page Objects).
- `tests/factories/`: Geradores de massa de dados (Factories).
- `tests/data/temp/`: Arquivos físicos para testes de upload.

---
*Este guia deve ser atualizado a cada nova descoberta de gargalo técnico no ambiente de automação.*

