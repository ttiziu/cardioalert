# CardioAlert — API de inferencia ECG

Recibe una ventana de 2500 muestras (250 Hz, 10 s, z-score) y devuelve la clasificación.

## Poner el modelo

Copia el archivo entrenado en Colab a `model/`:

```
ml-api/model/mejor_modelo_cnn_estable.keras
```

Se versiona en git (pesa < 1 MB), así Railway lo recibe con el código.

## Local

```bash
cd ml-api
python3.12 -m venv .venv && source .venv/bin/activate  # TensorFlow requiere Python ≤ 3.12
pip install -r requirements.txt
uvicorn main:app --reload
```

Prueba: `curl localhost:8000/health`

## Railway

1. New Project → Deploy from GitHub → root directory `ml-api`.
2. Variables: `ML_API_KEY` (una clave que inventes) y, si cambias la ruta, `MODEL_PATH`.
3. Railway detecta el `Procfile` e inyecta `PORT` solo.
4. Copia la URL pública al `.env` de la app como `ML_API_URL`.

## Endpoints

- `GET /health` — estado y si el modelo cargó.
- `POST /predict` — `{"ecg": [2500 números]}` → `{prediction, confidence, probabilities}`.
  Requiere la cabecera `X-API-Key` si `ML_API_KEY` está configurada.
