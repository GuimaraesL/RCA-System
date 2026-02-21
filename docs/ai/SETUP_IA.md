# Infraestrutura e Setup do Serviço de IA

Este documento descreve os requisitos técnicos, configuração de ambiente e estratégias de resiliência para o microserviço de IA (RCA Detective).

---

## 1. Requisitos de Ambiente

O serviço de IA roda de forma isolada do Backend Node.js para garantir escalabilidade e eficiência no processamento vetorial.

- **Linguagem:** Python 3.11+.
- **Runtime:** Contêiner Docker Linux-based.
- **Porta Padrão:** 8000 (FastAPI).

---

## 2. Setup de Execução (Docker)

O serviço deve ser instanciado utilizando a imagem oficial estável do Python.

```dockerfile
# Exemplo de estrutura base
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Dependências Core (requirements.txt)
- `fastapi`, `uvicorn` (Servidor).
- `agno` (Framework de Agentes).
- `chromadb` ou `sqlite-vec` (Vector Database).
- `mcp` (SDK de comunicação).

---

## 3. Variáveis de Ambiente (.env)

Configurações obrigatórias para o funcionamento do motor de IA.

| Variável | Descrição |
| :--- | :--- |
| `LLM_PROVIDER` | `google` (dev) ou `azure` (prod). |
| `AZURE_OPENAI_API_KEY` | Chave de acesso ao serviço Azure. |
| `AZURE_OPENAI_ENDPOINT` | URL do endpoint Azure. |
| `MCP_SERVER_URL` | URL de comunicação com o Backend Node.js. |
| `VECTOR_DB_PATH` | Caminho persistente para o banco de dados vetorial. |

---

## 4. Resiliência e Fallback

Para evitar degradação da experiência do usuário em caso de falha na IA:

### 4.1. Timeouts e Circuit Breaker
- **Timeout MCP:** O Backend Node.js deve aguardar no máximo 5 segundos por uma resposta do servidor MCP antes de retornar um fallback.
- **Degradação Graciosa:** Se o serviço de IA estiver offline, o Frontend deve ocultar ou desabilitar o botão "Assistir com IA", permitindo que o usuário prossiga com a análise manual normal de RCA.

### 4.2. Tratamento de Erros de Fluxo
- **Erro de Contexto:** Caso a IA não encontre casos similares, deve retornar uma mensagem amigável: "Nenhuma falha similar encontrada no histórico recente".

---

## 5. Segurança do Microserviço

- **Auth entre Serviços:** O microserviço Python exigirá uma `INTERNAL_AUTH_KEY` no cabeçalho das requisições provenientes do Node.js.
- **Isolamento de Volume:** O volume de dados do Vector DB deve ser acessível apenas pelo contêiner de IA.

---

> **Nota de Implementação:** A persistência dos embeddings deve ser realizada em volumes Docker para garantir que o conhecimento não seja perdido em restarts do serviço.
