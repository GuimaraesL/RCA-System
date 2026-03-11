# 🤖 RCA System AI Service (Specialist Orchestration)

Este é o microserviço de inteligência artificial do RCA System, responsável por orquestrar o **Time de Especialistas RCA** utilizando o framework [Agno](https://agno.com).

## 🧩 Arquitetura de Especialistas (Issue 127)
O serviço evoluiu de um agente único para um modelo de **Orquestração de Times**, permitindo diagnósticos periciais profundos:

- `agents/`: Contém os especialistas em **Mídia (Multimodal)**, **FMEA (Técnico)** e **Fatores Humanos (HFACS)**.
- `skills/`: Habilidades modulares de Agno que encapsulam ferramentas de métricas e diretrizes metodológicas.
- `api/`: Camada de interface FastAPI com suporte a **Streaming SSE** e processamento multimodal.
- `core/`: Motores de conhecimento (Triplo RAG: RCA, FMEA e Documentos Técnicos PDF).

## 🧠 Novas Capacidades
- **Análise Visual Pericial:** Identificação de fraturas, corrosão e desalinhamento via Gemini 2.0 Flash Multimodal.
- **Métricas Determinísticas:** Cálculo automático de **MTBF**, **MTTR** e **Disponibilidade** baseado no histórico real.
- **FMEA Estruturado:** Integração com banco de dados SQL para consulta de RPN e ações oficiais de mitigação.
- **Triplo RAG:** Busca semântica em RCAs históricas, Manuais Markdown e Documentos Técnicos em PDF.

## 🚀 Como Executar Localmente

### 1. Pré-requisitos
- Python 3.11+
- Google API Key (Gemini 2.0 Flash)

### 2. Instalação
```bash
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Execução
```bash
python main.py
```
O servidor iniciará em `http://localhost:8000` e realizará automaticamente a sincronização inicial das bases de conhecimento.

---
Para documentação técnica detalhada, consulte a pasta [docs/ai/](../docs/ai/).
