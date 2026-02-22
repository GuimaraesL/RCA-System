# 🤖 RCA System AI Service (Modular)

Este é o microserviço de inteligência artificial do RCA System, responsável por orquestrar o agente **RCA Detective** utilizando o framework [Agno](https://agno.com).

## 🧩 Arquitetura Modular
O serviço foi refatorado para uma estrutura modular limpa:
- `agent/`: Cérebro do agente (Prompts, Ferramentas, Definição).
- `api/`: Camada de interface REST (FastAPI).
- `config.py`: Gestão centralizada de configurações e caminhos.
- `main.py`: Ponto de entrada, gestão de ciclo de vida e background syncing.

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
BACKEND_URL=http://localhost:3001/api
INTERNAL_AUTH_KEY=dev-key-change-it
```

### 4. Execução
```bash
python main.py
```
O servidor iniciará em `http://localhost:8000`.

## 🛡️ Endpoints Principais
- `GET /health`: Verifica o status do serviço.
- `POST /analyze`: Solicita uma análise profunda de uma RCA baseada no RAG e FMEA (exige `x-internal-key`).

## 🧠 Inteligência e Otimização
- **Hash Control**: O serviço utiliza um banco SQLite local (`data/rca_knowledge.db`) para rastrear RCAs já indexadas. Isso evita chamadas repetitivas à API de Embeddings da Google, economizando créditos.
- **REST-First**: A comunicação com o backend Node.js é feita via HTTP direto, garantindo robustez e facilidade de depuração.

---
Para documentação técnica detalhada, consulte [docs/ai/SETUP_IA.md](../docs/ai/SETUP_IA.md).
