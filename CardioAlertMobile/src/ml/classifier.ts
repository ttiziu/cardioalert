import type { Label, PredictFn } from './types';
import { HAS_REMOTE_MODEL, remotePredictor } from './remote';

/**
 * - `modelo`: el CNN entrenado, servido por ml-api. Para pacientes reales.
 * - `simulacion`: el escenario que elige el usuario. Para demostrar los flujos de
 *   AFib e isquemia sin un paciente que las presente.
 */
export type ModelSource = 'modelo' | 'simulacion';

export const MODEL_AVAILABLE = HAS_REMOTE_MODEL;
export const DEFAULT_SOURCE: ModelSource = MODEL_AVAILABLE ? 'modelo' : 'simulacion';

/**
 * Clasificador de simulación: devuelve la clase del escenario elegido y hace que
 * la confianza dependa de los picos de la señal, para que el XAI sea coherente.
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

/** Predictor que consulta la fuente activa en cada ventana: se puede cambiar en vivo. */
export function createPredictor(source: () => ModelSource, scenario: () => Label): PredictFn {
  const simulated = demoPredictor(scenario);
  const remote = MODEL_AVAILABLE ? remotePredictor() : null;
  return window =>
    source() === 'modelo' && remote ? remote(window) : simulated(window);
}
