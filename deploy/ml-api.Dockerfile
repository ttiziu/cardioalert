# API de inferencia (FastAPI + TensorFlow) de CardioAlert.
# Construir desde la raíz del repo:  docker build -f deploy/ml-api.Dockerfile -t cardioalert-ml-api ml-api
# TensorFlow necesita ~1 GB de RAM en ejecución.
FROM python:3.12-slim
WORKDIR /app
ENV PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1 PORT=8000
COPY requirements.txt ./
RUN pip install -r requirements.txt
COPY main.py ./
COPY model ./model
RUN useradd --create-home app
USER app
EXPOSE 8000
# Forma de shell para que $PORT la defina la plataforma (Cloud Run, Fly, Render…).
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT}"]
