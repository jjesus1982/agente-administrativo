# Conecta Plus API - Dockerfile
FROM python:3.12-slim

WORKDIR /app

# Instala dependencias do sistema
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copia requirements
COPY requirements.txt .

# Instala dependencias Python
RUN pip install --no-cache-dir -r requirements.txt

# Copia codigo
COPY . .

# Expoe porta
EXPOSE 8100

# Variaveis de ambiente padrao
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV GUNICORN_WORKERS=4

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8100/health/live || exit 1

# Comando padrao (producao com gunicorn)
CMD ["gunicorn", "-c", "gunicorn.conf.py", "app.main:app"]
