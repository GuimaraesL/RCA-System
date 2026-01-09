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
