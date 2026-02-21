# Infraestrutura e Setup do Serviço de IA

Este documento descreve os requisitos técnicos, configuração de ambiente e estratégias de resiliência para o microserviço de IA (RCA Detective).

---

## 1. Requisitos de Ambiente

O serviço de IA roda de forma isolada do Backend Node.js para garantir escalabilidade e eficiência no processamento de linguagem natural.

- **Linguagem:** Python 3.11+.
- **Framework:** FastAPI (Backend) e Agno (Agentes).
- **Porta Padrão:** 8000.

### Estrutura Modular
O serviço está organizado seguindo princípios de responsabilidade única:
- `agent/`: Configurações, prompts e ferramentas do RCA Detective.
- `api/`: Rotas FastAPI e modelos Pydantic.
- `config.py`: Gestão de configurações e ambiente.
- `mcp_bridge.py`: Ponte de comunicação com o servidor MCP.
- `main.py`: Entrypoint e gestão de lifespan.

---

## 2. Setup de Execução (Docker)

O serviço é conteinerizado para garantir paridade entre ambientes.

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Dependências Core (requirements.txt)
As principais bibliotecas utilizadas são:
- `agno`: Framework para orquestração de agentes.
- `fastapi`, `uvicorn`: Servidor web assíncrono.
- `google-generativeai`: Integração com o modelo Gemini.
- `mcp`: SDK para o Model Context Protocol.

---

## 3. Variáveis de Ambiente (.env)

| Variável | Descrição | Padrão |
| :--- | :--- | :--- |
| `GOOGLE_API_KEY` | Chave da API do Google Gemini. | (Obrigatório) |
| `MCP_SERVER_URL` | URL do servidor MCP (Node.js). | `http://localhost:3001/api/mcp/sse` |
| `INTERNAL_AUTH_KEY` | Chave para autenticação entre serviços. | `dev-key-change-it` |

---

## 4. Resiliência e Fallback

O microserviço foi desenhado para ser resiliente a falhas de conexão externa:

### 4.1. Conexão MCP
- **Startup:** O serviço inicia mesmo se o servidor MCP estiver offline, reportando um aviso no log.
- **Runtime:** Se a ponte MCP cair, o endpoint `/analyze` retornará erro `503 Service Unavailable`, permitindo que o sistema principal trate a falha graciosamente.

---

## 5. Segurança do Microserviço

- **Auth entre Serviços:** Todas as requisições ao `/analyze` devem incluir o cabeçalho `x-internal-key` correspondente à `INTERNAL_AUTH_KEY`.

---

> **Nota de Implementação:** A arquitetura modular permite a fácil expansão para novos agentes ou ferramentas sem afetar o core do serviço.
