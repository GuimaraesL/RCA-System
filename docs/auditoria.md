# Documentação de Auditoria e Performance

Este documento descreve como realizar testes de performance e checagens de qualidade de código (linting) no RCA System localmente e como esses processos estão integrados no fluxo de Integração Contínua (CI).

## 1. Checagens de Código (Linting)
A verificação estática do código agora está centralizada no comando `lint` executado a partir da raiz do projeto. O comando valida a tipagem (TypeScript) tanto no frontend quanto no servidor.

**Como executar:**
Na raiz do projeto, execute:
```bash
npm run lint
```
Isso executará internamente:
- `tsc --noEmit` para validação do React/Frontend.
- `npm run lint --prefix server` para validação do Express/Backend.

## 2. Auditoria Lighthouse (Performance, Acessibilidade, SEO)
O Lighthouse é a principal ferramenta para medição de qualidade da aplicação web.

### 2.1 Dependências Globais Necessárias
Para rodar a auditoria Lighthouse localmente via CLI, você precisará da ferramenta instalada globalmente em sua máquina:
```bash
npm install -g lighthouse
```

*Alternativamente, você pode rodar via npx, que fará o download da versão mais recente na execução:*
```bash
npx lighthouse <URL> --view
```

### 2.2 Executando Localmente
Para avaliar a aplicação, certifique-se de que ela está em execução localmente (recomendado usar a build de produção para testes mais fiéis):

1. Faça o build e sirva a aplicação:
```bash
npm run build
npm run preview
```

2. Em outra aba do terminal, execute o script de auditoria:
```bash
npm run audit
```
O script `audit` disparará o Lighthouse contra `http://localhost:4173` (porta padrão do vite preview) e gerará um relatório HTML no diretório atual.

## 3. Integração Contínua (CI/CD)
No GitHub Actions, o workflow `ci-quality-gate.yml` foi atualizado para:
- Rodar `npm run lint` na fase de verificação de tipos.
- Instalar o `@lhci/cli` (Lighthouse CI).
- Avaliar a versão em build contra orçamentos básicos de qualidade utilizando os artefatos da branch.
