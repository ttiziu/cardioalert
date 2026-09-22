import { ML_API_KEY, ML_API_URL } from '@env';
import { WINDOW_SIZE } from '../signal/preprocess';
import type { Prediction, PredictFn } from './types';
import { toPrediction } from './types';

export const REMOTE_MODEL_URL = ML_API_URL?.trim() ?? '';
export const HAS_REMOTE_MODEL = REMOTE_MODEL_URL.length > 0;

/** Clasifica contra la API de inferencia (ml-api desplegada en Railway). */
export function remotePredictor(): PredictFn {
  return async window => {
    if (window.length !== WINDOW_SIZE) {
      throw new Error(`La ventana debe tener ${WINDOW_SIZE} muestras`);
    }
    const response = await fetch(`${REMOTE_MODEL_URL.replace(/\/$/, '')}/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(ML_API_KEY ? { 'X-API-Key': ML_API_KEY } : {}),
      },
      // El modelo espera la señal ya preprocesada: 250 Hz, 10 s, z-score.
      body: JSON.stringify({ ecg: window.map(v => Math.round(v * 10000) / 10000) }),
    });
    if (!response.ok) {
      throw new Error(`API de inferencia: ${response.status} ${await response.text()}`);
    }
    const data = (await response.json()) as {
      probabilities: Record<string, number>;
    };
    return [
      data.probabilities.normal,
      data.probabilities.afib,
      data.probabilities.isquemia,
    ];
  };
}

/** Pide el mapa XAI completo en una sola llamada (el servidor hace la perturbación). */
export async function remoteExplain(
  window: number[],
  sampleRate = 250,
  segmentMs = 50,
): Promise<{ importance: number[]; prediction: Prediction }> {
  const response = await fetch(`${REMOTE_MODEL_URL.replace(/\/$/, '')}/explain`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(ML_API_KEY ? { 'X-API-Key': ML_API_KEY } : {}),
    },
    body: JSON.stringify({
      ecg: window.map(v => Math.round(v * 10000) / 10000),
      sample_rate: sampleRate,
      segment_ms: segmentMs,
    }),
  });
  if (!response.ok) {
    throw new Error(`API de inferencia: ${response.status} ${await response.text()}`);
  }
  const data = (await response.json()) as {
    importance: number[];
    probabilities?: Record<string, number>;
    prediction: string;
    confidence: number;
  };
  const probs = data.probabilities;
  return {
    importance: data.importance,
    prediction: probs
      ? toPrediction([probs.normal, probs.afib, probs.isquemia])
      : {
          label: data.prediction as Prediction['label'],
          confidence: data.confidence,
          probabilities: { normal: 0, afib: 0, isquemia: 0 },
        },
  };
}
