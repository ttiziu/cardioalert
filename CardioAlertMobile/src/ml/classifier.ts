import type { Label, PredictFn } from './types';
import { HAS_REMOTE_MODEL, remotePredictor } from './remote';

export type ModelSource = 'demo' | 'servidor';

/**
 * Clasificador de demostración: devuelve la clase del escenario simulado y hace
 * que la confianza dependa de los picos de la señal, para que el XAI se vea
 * coherente. Se reemplaza por el modelo TFLite en `createPredictor`.
 */
export function demoPredictor(scenario: () => Label): PredictFn {
  const base: Record<Label, number[]> = {
    normal: [0.97, 0.02, 0.01],
    afib: [0.05, 0.91, 0.04],
    isquemia: [0.03, 0.03, 0.94],
  };
  return async window => {
    const probs = base[scenario()].slice();
    const top = probs.indexOf(Math.max(...probs));
    const energy = window.reduce((a, v) => a + (Math.abs(v) > 1.5 ? 1 : 0), 0);
    const reference = Math.max(1, window.length * 0.04);
    const factor = 0.7 + 0.3 * Math.min(1, energy / reference);
    const lost = probs[top] * (1 - factor);
    probs[top] -= lost;
    probs[top === 0 ? 1 : 0] += lost;
    return probs;
  };
}

export const MODEL_SOURCE: ModelSource = HAS_REMOTE_MODEL ? 'servidor' : 'demo';

/**
 * ponytail: hoy la inferencia vive en la API (opción A). Para inferencia
 * offline: `npm i react-native-fast-tflite`, poner el .tflite en assets y
 * devolver aquí un predictor local con el mismo contrato.
 */
export function createPredictor(scenario: () => Label): PredictFn {
  return HAS_REMOTE_MODEL ? remotePredictor() : demoPredictor(scenario);
}
