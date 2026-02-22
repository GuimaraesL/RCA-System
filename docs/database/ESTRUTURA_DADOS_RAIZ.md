# Estrutura de Dados Raiz (Knowledge & AI)

Este documento detalha o propósito e a estrutura dos arquivos localizados na pasta `/data` na raiz do projeto, que servem como o **Cérebro da Inteligência Artificial** e Base de Conhecimento do RCA System.

---

## 1. Visão Geral da Pasta `/data`

Diferente da pasta `server/data/` (que contém os dados operacionais em tempo real), a pasta raiz `/data/` é dedicada à persistência de longo prazo para as funcionalidades de IA, busca semântica e base de conhecimento técnica.

### Estrutura de Diretórios

| Caminho | Tipo | Descrição |
| :--- | :--- | :--- |
| `/data/knowledge/` | Diretório (MD) | Contém documentações técnicas e metodologias (ex: `rca_methodology.md`) que servem como fonte estática para o RAG (Retrieval-Augmented Generation). |
| `/data/vector_db/` | Diretório (ChromaDB) | Banco de dados vetorial persistente que armazena os *embeddings* (vetores numéricos) de todas as análises e documentos técnicos para busca semântica. |
| `/data/rca_knowledge.db` | Arquivo (SQLite) | Banco de dados auxiliar para controle de integridade e metadados da IA (ex: Controle de Hashes para economia de custos de API). |

---

## 2. Fluxo de Dados da IA (RAG)

O diagrama abaixo ilustra como os dados operacionais e estáticos são processados para alimentar o "Cérebro" da IA.

```mermaid
graph TD
    subgraph "Fontes de Dados"
        DB_MAIN[(rca.db - Operacional)]
        DOC_MD[knowledge/*.md - Estático]
    end

    subgraph "Processamento (AI Service)"
        SYNC[Sincronizador Python]
        HASH_CHECK{Hash SHA-256 Mudou?}
        EMBED[Gerador de Embeddings - Gemini]
    end

    subgraph "Persistência IA (/data)"
        DB_HASH[(rca_knowledge.db)]
        DB_VECTOR[(vector_db - ChromaDB)]
    end

    %% Fluxo de Sincronização
    DB_MAIN --> SYNC
    DOC_MD --> SYNC
    SYNC --> HASH_CHECK
    
    %% Decisão de Hash
    HASH_CHECK -- "Sim" --> EMBED
    HASH_CHECK -- "Não (Skip)" --> SYNC
    
    %% Gravação
    EMBED --> DB_VECTOR
    EMBED --> DB_HASH

    %% Consumo
    AGENT[Agente RCA Detective] <-->|Busca Semântica| DB_VECTOR
```

---

## 3. Detalhamento dos Componentes

### 2.1. Base de Conhecimento Estática (`/data/knowledge/`)
Arquivos Markdown que descrevem processos industriais, metodologias de análise (Ishikawa, 5 Porquês) e guias de troubleshooting. Estes arquivos são lidos pelo serviço de IA durante a indexação inicial para "ensinar" o contexto operacional ao Agente Detective.

### 2.2. Banco de Dados Vetorial (`/data/vector_db/`)
Utiliza o **ChromaDB** para armazenar as representações vetoriais dos dados.
- **Arquivos:** `chroma.sqlite3` (persistência do index) e diretórios de metadados (`index_metadata.pickle`).
- **Função:** Permite que a IA encontre "análises similares" ou "causas raízes recorrentes" através de proximidade matemática de conceitos, indo além da simples busca por palavras-chave.

### 2.3. Controle de Hashes (`rca_knowledge.db`)
Este banco SQLite é uma peça fundamental para a **Otimização de Custos**:
- **Tabela `hashes`:** Armazena o ID da RCA e o Hash SHA-256 do seu conteúdo no momento da última indexação.
- **Fluxo:** Antes de enviar dados para a API do Google Gemini Embeddings (que é paga/limitada), o sistema verifica se o conteúdo mudou. Se o hash for igual, a indexação é ignorada, economizando recursos.

---

## 3. Comparação: Dados Raiz vs. Dados Server

| Característica | `/data` (Raiz) | `server/data` (Backend) |
| :--- | :--- | :--- |
| **Propósito** | Inteligência e Conhecimento | Operação e Transação |
| **Banco Principal** | ChromaDB + SQLite (Auxiliar) | SQLite (`rca.db`) |
| **Tecnologia IA** | Embeddings / Vetores | Relacional / SQL |
| **Acesso** | AI Service (Python) | Backend (Node.js) |

---

## 📚 Documentação Relacionada
- [Modelo de Dados Operacional](./MODELO_DADOS.md)
- [Design Técnico de IA](../ai/DESIGN_TECNICO.md)
- [Setup do Serviço de IA](../ai/SETUP_IA.md)
