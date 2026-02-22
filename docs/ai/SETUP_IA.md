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
- `httpx`: Cliente HTTP para integração com o Backend.

---

## 3. Variáveis de Ambiente (.env)

3. **Configuração de Variáveis de Ambiente (`.env`)**
   ```env
   GOOGLE_API_KEY=sua_chave_gemini_flash
   BACKEND_URL=http://localhost:3001/api
   INTERNAL_AUTH_KEY=sua_chave_de_seguranca_interna
   ```

4. **Execução**
   ```bash
   python main.py
   ```

---

## 4. Resiliência e Fallback

O microserviço foi desenhado para ser resiliente a falhas de conexão externa:

### 4.1. Conexão com o Backend
- **Startup:** O serviço inicia e sincroniza as RCAs em background. Se o backend estiver offline, ele continuará tentando a sincronização sem travar o boot.
- **Runtime:** Se o backend principal cair, as ferramentas de consulta retornarão erro graciosamente, informando que os dados externos estão temporariamente indisponíveis.

---

## 5. Segurança do Microserviço

- **Auth entre Serviços:** Todas as requisições ao `/analyze` devem incluir o cabeçalho `x-internal-key` correspondente à `INTERNAL_AUTH_KEY`.

---

> **Nota de Implementação:** A arquitetura modular permite a fácil expansão para novos agentes ou ferramentas sem afetar o core do serviço.
