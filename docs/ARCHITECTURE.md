# Arquitetura do Sistema RCA

## Visão Geral

O **RCA System** é uma aplicação Full-Stack projetada para gerenciar Triggers (eventos de parada), Análises de Causa Raiz (RCA) e Planos de Ação. O sistema foca em **alta performance** e **UX responsiva**, capaz de lidar com grandes volumes de dados (2k+ registros) sem degradação de performance.

## 🏗️ Stack Tecnológico

- **Frontend:** React (Vite), TypeScript, TailwindCSS.
- **Backend:** Node.js, Express, TypeScript.
- **Database:** SQLite (Local).
- **State Management:** React Context API + Hooks Customizados.
- **Persistence:** JSON Files (Legacy/Backup) & SQLite (Primary).

---

## 📂 Estrutura de Diretórios

```
RCA-System/
├── components/         # Componentes React (UI)
│   ├── ActionsView.tsx     # Gerenciamento de Ações
│   ├── AnalysesView.tsx    # Gerenciamento de RCAs
│   ├── TriggersView.tsx    # Gerenciamento de Triggers
│   └── Dashboard.tsx       # Métricas e Gráficos
├── context/            # Gerenciamento de Estado Global
│   └── RcaContext.tsx      # Centralizador de Dados (API Bridge)
├── hooks/              # Lógica de Negócio Reutilizável
│   ├── useAssetsLogic.ts   # Lógica de Ativos
│   └── useFilterPersistence.ts # Persistência de Filtros
├── server/             # Backend API
│   ├── src/
│   │   ├── database.ts     # Conexão SQLite
│   │   └── routes/         # Endpoints REST
├── services/           # Camada de Serviço (Frontend)
│   └── apiService.ts       # Chamadas Fetch/Axios
└── types/              # Definições de Tipos TypeScript
```

---

## 🚀 Estratégia de Performance (Otimização Big Data)

Para garantir fluidez com milhares de registros, implementamos estratégias agressivas de otimização de renderização e estrutura de dados.

### 1. Complexidade de Tempo O(1)
Eliminamos loops aninhados `O(M*N)` que causavam travamentos.

- **Antes (Laggy):**
  ```typescript
  // O(N*M) - Busca linear para cada item renderizado
  triggers.map(t => {
      const rca = records.find(r => r.id === t.rca_id); 
  });
  ```

- **Depois (Instantâneo):**
  ```typescript
  // O(1) - Lookup direto via Hash Map
  const rcaMap = useMemo(() => new Map(records.map(r => [r.id, r])), [records]);
  triggers.map(t => {
      const rca = rcaMap.get(t.rca_id);
  });
  ```

### 2. Rendering Cap & Paginação
Para evitar "DOM Bloating" (excesso de nós HTML que travam o navegador), limitamos a renderização visual enquanto mantemos a busca global.

- **Lógica:** O filtro busca em 100% dos dados.
- **Render:** Apenas os 100 primeiros resultados da busca são inseridos no DOM.
- **Navegação:** Paginação Client-Side ("Próximo"/"Anterior") permite acesso total sem re-fetch.

### 3. Memoização Agressiva
Uso extensivo de `useMemo` para computações pesadas:
- Filtragem de dados.
- Construção de árvores de ativos (`AssetTree`).
- Mapeamento de Taxonomias.

---

## 🔄 Fluxo de Dados (Data Flow)

1.  **Boot:** `RcaContext` inicializa e dispara `apiService.fetchAll()`.
2.  **API:** Backend consulta SQLite e retorna JSONs normalizados.
3.  **Client Cache:** Frontend armazena dados em memória (State).
4.  **Interaction:**
    - **Leitura:** Componentes consomem Contexto.
    - **Escrita:** Componentes chamam Context Methods -> API (Optimistic Update ou Await) -> State Update.

---

## 🛡️ Regras de Desenvolvimento

1.  **Tipagem Estrita:** Todo dado deve ter interface definida em `types/index.ts`.
2.  **Fail Fast:** Erros de API devem ser tratados no `apiService` com logs claros.
3.  **Imutabilidade:** Nunca mutar estado diretamente; usar setters do React.
4.  **Performance First:** Sempre validar complexidade de algoritmos dentro de `map` ou `filter`.

---

## 📜 Regras de Negócio (Auto-Promoção de Status)

O sistema possui uma lógica autônoma para determinar o status de uma Análise (`Em Andamento`, `Aguardando Verificação` ou `Concluída`), garantindo integridade dos dados e fluxo de processo.

### 1. Escopo de Gerenciamento
A automação atua **apenas** sobre os seguintes status ("Gerenciados"):
- `Vazio / Nulo`
- `STATUS-01` (Em Andamento)
- `STATUS-WAITING` (Aguardando Verificação)
- `STATUS-03` (Concluída)

⚠️ **Status Protegidos**: Status manuais ou externos (ex: `STATUS-CANCELLED`, `STATUS-PENDING-APPROVAL`) são **ignorados** pela automação. Se um usuário cancelar manualmente, o robô jamais alterará isso.

### 2. Pipeline de Decisão (`useRcaLogic.ts` & `apiService.ts`)

#### A. Verificação de Completude (Mandatory Check)
Para ser elegível a qualquer promoção, o registro deve conter:
1.  **Campos de Texto:** Título, Descrição, Quem, Quando, Onde.
2.  **Taxonomia:** Especialidade, Modo de Falha, Categoria, Tipo Componente.
3.  **Localização (Crítico):** `subgroup_id` (Nível Subconjunto) é obrigatório.
4.  **Listas:** Pelo menos 1 Participante e 1 Causa Raiz.
5.  **Impacto:** `downtime_minutes` definido (pode ser 0).

🔴 **FALHA:** Se qualquer campo faltar ➔ Força Status **Em Andamento** (`STATUS-01`).

#### B. Análise de Plano de Ação (Apenas se Completude OK)
Se o registro estiver completo, o sistema avalia os Planos de Ação (Main Actions):

1.  **Sem Ações:**
    - Considerado resolvido (ex: Causa Raiz simples ou procedimental).
    - ✅ Resultado: **Concluída** (`STATUS-03`).

2.  **Com Ações (Lógica de Eficácia):**
    - Verifica campo `status` de cada ação.
    - **Box 3 (Eficaz)** e **Box 4 (Eficácia Comprovada):** IDs `'3'` e `'4'`.
    - **Regra:**
        - Se **TODAS** as ações forem Box 3 ou 4 ➔ ✅ **Concluída** (`STATUS-03`).
        - Se **QUALQUER** ação não for Box 3 nem 4 ➔ ⏳ **Aguardando Verificação** (`STATUS-WAITING`).
