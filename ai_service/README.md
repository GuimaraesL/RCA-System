# 🤖 RCA System AI Service (Modular)

Este é o microserviço de inteligência artificial do RCA System, responsável por orquestrar o agente **RCA Detective** utilizando o framework [Agno](https://agno.com).

## 🧩 Arquitetura Modular
O serviço foi refatorado para uma estrutura modular limpa:
- `agent/`: Cérebro do agente (Prompts, Ferramentas, Definição).
- `api/`: Camada de interface REST (FastAPI).
- `config.py`: Gestão centralizada de configurações.
- `mcp_bridge.py`: Cliente de comunicação com o servidor MCP (Node.js).
- `main.py`: Ponto de entrada e gestão de ciclo de vida.

## 🚀 Como Executar Localmente

### 1. Pré-requisitos
- Python 3.11+
- Virtualenv (recomendado)

### 2. Instalação
```bash
# Crie e ative o ambiente virtual
python -m venv venv
.\venv\Scripts\activate  # Windows

# Instale as dependências
pip install -r requirements.txt
```

### 3. Configuração
Crie um arquivo `.env` baseado no exemplo abaixo:
```env
GOOGLE_API_KEY=sua_chave_aqui
MCP_SERVER_URL=http://localhost:3001/api/mcp/sse
INTERNAL_AUTH_KEY=dev-key-change-it
```

### 4. Execução
```bash
python main.py
```
O servidor iniciará em `http://localhost:8000`.

## 🛡️ Endpoints Principais
- `GET /health`: Verifica o status do serviço e da ponte MCP.
- `POST /analyze`: Solicita uma análise profunda de uma RCA (exige `x-internal-key`).

---
Para documentação técnica detalhada, consulte [docs/ai/SETUP_IA.md](../docs/ai/SETUP_IA.md).
