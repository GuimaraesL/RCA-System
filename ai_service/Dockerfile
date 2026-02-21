# Dockerfile para o Serviço de IA (Agno)
# RCA System - AI Service Layer

FROM python:3.11-slim

# Evita que o Python crie arquivos .pyc e permite logs em tempo real
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

WORKDIR /app

# Instala dependências do sistema necessárias para pacotes Python
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copia apenas o requirements primeiro para aproveitar o cache do Docker
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copia o código da aplicação
COPY . .

# Exposição da porta (FastAPI padrão 8000)
EXPOSE 8000

# Comando de inicialização
CMD ["python", "main.py"]
