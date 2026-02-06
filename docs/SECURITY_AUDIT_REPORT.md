# Relatório de Auditoria de Segurança

**Data:** 06 de Fevereiro de 2026
**Auditor:** @[security-auditor]
**Escopo:** Análise Estática (SAST), Configuração e Dependências.

---

## 1. Sumário de Riscos

O sistema apresenta **2 Vulnerabilidades Críticas** que exigem correção imediata, além de vários pontos de atenção em boas práticas e dependências.

| Categoria (OWASP) | Vulnerabilidade | Severidade | Localização Principal |
|---|---|---|---|
| **A04: Cryptographic Failures** | Exposição de Chave de API (Gemini) no Frontend | **CRÍTICA** | `vite.config.ts` |
| **A05: Injection** | Método `exec()` inseguro exposto no Wrapper DB | **CRÍTICA** | `DatabaseConnection.ts` |
| **A03: Supply Chain** | Dependências Desatualizadas / Suspeitas | **ALTA** | `server/package.json` |
| **A05: Injection (XSS)** | Uso de `innerHTML` sem sanitização | **MÉDIA** | `AnimatedCounter.tsx` |
| **A02: Misconfiguration** | Ausência de Headers de Segurança (CSP/HSTS) | **BAIXA** | Global |

---

## 2. Detalhamento das Vulnerabilidades

### 2.1. Exposição de Segredos (A04) ⚠️ CRÍTICO
O arquivo `vite.config.ts` injeta a variável `GEMINI_API_KEY` diretamente no código do cliente durante o build.

*   **Evidência:**
    ```typescript
    // vite.config.ts
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    }
    ```
*   **Impacto:** Qualquer usuário com acesso ao navegador pode extrair a chave API inspecionando o código fonte JS, permitindo uso fraudulento da cota de IA da empresa.
*   **Recomendação:** Remover a injeção. Criar um endpoint no Backend (`/api/generate`) que atua como proxy para a Google Gemini API. O frontend deve chamar apenas o seu backend.

### 2.2. SQL Injection Potential (A05) ⚠️ CRÍTICO
A classe `DatabaseConnection` expõe um método `exec(sql)` que recebe string crua e passa direto para o driver SQLite (`sql.js`).

*   **Evidência:**
    ```typescript
    // server/src/v2/infrastructure/database/DatabaseConnection.ts
    public exec(sql: string): void {
        const db = this.getRawDatabase();
        db.exec(sql); // Sem prepare/bind
    }
    ```
*   **Risco:** Se qualquer desenvolvedor usar `exec()` passando variáveis de input (ex: `exec("DELETE FROM users WHERE id=" + id)`), ocorrerá injeção de SQL.
*   **Recomendação:**
    1.  Renomear o método para `execUnsafeMigrationScriptOnly()` para desencorajar uso.
    2.  Forçar o uso de `query()` ou `execute()` que utilizam `prepare` e `bind`.

### 2.3. Cross-Site Scripting (XSS) (A05)
O componente `AnimatedCounter` manipula o DOM diretamente via `innerHTML`.

*   **Evidência:**
    ```typescript
    // src/components/ui/AnimatedCounter.tsx
    node.innerHTML = prefix + val.toLocaleString() + suffix;
    ```
*   **Risco:** Se `prefix` ou `suffix` forem controlados por um atacante (ex: vindo de uma configuração de moeda maliciosa salva no banco), podem injetar scripts.
*   **Recomendação:** Substituir `innerHTML` por `textContent` ou `innerText`, já que o conteúdo é apenas texto formatado.

### 2.4. Dependências (A03)
*   **Express 4.18.2:** Versão antiga. Recomenda-se atualizar para a mais recente (4.21+) para garantir correções de segurança.
*   **Zod 4.3.6:** Versão listada no `package.json` do servidor parece incorreta (Zod estável é v3). Verificar se não é um pacote malicioso (typosquatting) ou erro de digitação.

---

## 3. Próximos Passos (Plano de Mitigação)

1.  **Imediato:** Rotacionar (revogar e gerar nova) a `GEMINI_API_KEY` se o código já foi deployado em algum lugar público.
2.  **Refatorar:** Mover a lógica de chamada da IA para o Backend (Node.js).
3.  **Corrigir:** Alterar `AnimatedCounter` para usar `textContent`.
4.  **Auditar:** Verificar todo uso de `.exec(` no projeto.