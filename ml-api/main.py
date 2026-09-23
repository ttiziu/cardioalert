"""API de inferencia ECG de CardioAlert.

Recibe una ventana preprocesada de 2500 muestras (250 Hz, 10 s, z-score) y
devuelve la clasificación del modelo entrenado en Colab.
"""

import os
from contextlib import asynccontextmanager

import numpy as np
from fastapi import Depends, FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

WINDOW_SIZE = 2500
CLASSES = ["normal", "afib", "isquemia"]

MODEL_PATH = os.getenv("MODEL_PATH", "model/cardioalert_cnn_bilstm.keras")
API_KEY = os.getenv("ML_API_KEY")

model = None


@asynccontextmanager
async def lifespan(_: FastAPI):
    global model
    # TensorFlow se importa aquí para que el arranque falle con un mensaje claro.
    import tensorflow as tf

    if not os.path.exists(MODEL_PATH):
        raise RuntimeError(f"No se encontró el modelo en {MODEL_PATH}")
    model = tf.keras.models.load_model(MODEL_PATH)
    yield
    model = None


app = FastAPI(title="CardioAlert ECG API", lifespan=lifespan)


def require_api_key(x_api_key: str | None = Header(default=None)):
    """Si ML_API_KEY está definida, la API queda cerrada a quien no la tenga."""
    if API_KEY and x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="API key inválida")


class ECGRequest(BaseModel):
    ecg: list[float] = Field(..., min_length=WINDOW_SIZE, max_length=WINDOW_SIZE)


class ECGResponse(BaseModel):
    prediction: str
    confidence: float
    probabilities: dict[str, float]


class ExplainRequest(BaseModel):
    ecg: list[float] = Field(..., min_length=WINDOW_SIZE, max_length=WINDOW_SIZE)
    segment_ms: int = Field(default=50, ge=10, le=500)
    sample_rate: int = Field(default=250, ge=50, le=1000)


class ExplainResponse(BaseModel):
    prediction: str
    confidence: float
    segment_ms: int
    importance: list[float]


def validate_window(values: list[float]) -> np.ndarray:
    """Valida la ventana y la deja lista para el modelo: (1, 2500, 1)."""
    window = np.asarray(values, dtype=np.float32)
    if window.shape != (WINDOW_SIZE,):
        raise HTTPException(
            status_code=422,
            detail=f"Se esperaban {WINDOW_SIZE} muestras y llegaron {window.size}",
        )
    if not np.isfinite(window).all():
        raise HTTPException(status_code=422, detail="La señal contiene valores no finitos")
    return window.reshape(1, WINDOW_SIZE, 1)


def occlusion_importance(
    window: np.ndarray, class_index: int, baseline: float, segment: int
) -> list[float]:
    """XAI por perturbación: anula tramos de la señal y mide la caída de confianza.

    Arma todas las variantes ocultas en un solo batch: una llamada al modelo en
    lugar de una por tramo.
    """
    starts = range(0, WINDOW_SIZE, segment)
    batch = np.repeat(window, len(starts), axis=0)
    for row, start in enumerate(starts):
        # La señal está en z-score, así que 0 equivale a "sin información".
        batch[row, start : start + segment, 0] = 0.0

    probabilities = model.predict(batch, verbose=0)[:, class_index]
    drops = np.maximum(0.0, baseline - probabilities)
    top = float(drops.max())
    return (drops / top).tolist() if top > 0 else drops.tolist()


@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": model is not None, "classes": CLASSES}


@app.post("/predict", response_model=ECGResponse, dependencies=[Depends(require_api_key)])
def predict(request: ECGRequest):
    if model is None:
        raise HTTPException(status_code=503, detail="Modelo no cargado")

    probabilities = model.predict(validate_window(request.ecg), verbose=0)[0]
    index = int(np.argmax(probabilities))
    return ECGResponse(
        prediction=CLASSES[index],
        confidence=float(probabilities[index]),
        probabilities={c: float(p) for c, p in zip(CLASSES, probabilities)},
    )


@app.post("/explain", response_model=ExplainResponse, dependencies=[Depends(require_api_key)])
def explain(request: ExplainRequest):
    if model is None:
        raise HTTPException(status_code=503, detail="Modelo no cargado")

    window = validate_window(request.ecg)
    probabilities = model.predict(window, verbose=0)[0]
    index = int(np.argmax(probabilities))
    segment = max(1, round(request.segment_ms / 1000 * request.sample_rate))

    return ExplainResponse(
        prediction=CLASSES[index],
        confidence=float(probabilities[index]),
        segment_ms=request.segment_ms,
        importance=occlusion_importance(window, index, float(probabilities[index]), segment),
    )
