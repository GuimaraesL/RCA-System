# Pipeline de RAG (Retrieval-Augmented Generation)

O Pipeline de RAG do AI Service permite que o Copiloto identifique incidentes passados e cruze seus padrões de falha com o incidente atual. Ele atua principalmente através do **ChromaDB** integrado à plataforma Agno.

## Arquitetura de Dados

O módulo de busca vetorial utiliza o `ChromaDb` persistente localmente, equipado com `GeminiEmbedder` (gerando embeddings vetoriais via Google GenAI).

### O Fluxo de Ingestão e Consulta

```mermaid
graph TD
    subgraph Sincronizacao ["Startup / Background"]
        B[Backend /api/rcas] -- Fetch JSON --> E[core/knowledge.py]
        E -- Cria Documentos 50k Chunks --> EM[GeminiEmbedder]
        EM -- Salva Vetores --> DB[(ChromaDB: rca_history_v1)]
        
        MD_PDF[Arquivos .md e .pdf] -- Text/PDF Reader --> EM2[GeminiEmbedder]
        EM2 -- Salva Vetores --> DB2[(ChromaDB: technical_knowledge_v1)]
    end

    subgraph Chat_Analise ["Chat / Analise (api/routes.py)"]
        U[Usuario reporta falha] --> API[FastAPI /analyze]
        API -- Busca de Metadados --> TL["search_historical_rcas_tool (Interna)"]
        TL --> DB
        
        DB -- Candidatos Brutos --> RV[RAG Validator Agent]
        RV -- Filtro de Falsos Positivos --> V[Recorrências Validadas]
        
        V -- Contexto Injetado --> LLM[Unified Copilot Team]
        LLM -- Gera Resposta SSE --> API
    end
```

## Sistema de Validação em 2 Estágios (2-Stage RAG)

Para garantir máxima fidelidade na área de engenharia e confiabilidade, as buscas não retornam simplesmente os "Top K" documentos baseados na proximidade de cosseno. Há um segundo estágio de triagem lógica.

### 1. Fallback Hierárquico de Metadados
O sistema busca no banco vetorial respeitando a hierarquia do ativo (Área > Equipamento > Subgrupo), para não misturar falhas de máquinas não relacionadas.

```mermaid
flowchart TD
    Start((Inicio da Busca)) --> Subgrupo{Subgrupo Identificado?}
    Subgrupo -- Sim --> B1[Busca Vector: Mesmo Subgrupo]
    Subgrupo -- Nao --> Equipamento
    
    B1 --> Equipamento{Equipamento Identificado?}
    
    Equipamento -- Sim --> B2[Busca Vector: Mesmo Equipamento]
    Equipamento -- Nao --> Area
    
    B2 --> Area{Área Identificada?}
    
    Area -- Sim --> B3[Busca Vector: Mesma Área]
    Area -- Nao --> Join
    
    B3 --> Join[Une todos os Candidatos Brutos]
```

### 2. Validador Semântico (RAG Validator)
Uma vez que os candidatos são retornados pelo VectorDB (ChromaDB), eles são passados para um Agente Efêmero especializado: o **RAG Validator** (`get_rag_validator`). 
Sua única função é aplicar rigor técnico, comparando o incidente da tela com os candidatos brutos, determinando quais são falsos positivos (ex: "vazamento" em bombas diferentes) e quais são **recorrências validadas**.

Apenas as recorrências validadas são disponibilizadas para o cálculo de métricas (MTBF/MTTR) e para a análise do Copiloto.