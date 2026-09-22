import { LABELS, type Label, type PredictFn } from './types';

/**
 * XAI por perturbación (Paralič et al., 2023): se anula un tramo de la señal,
 * se vuelve a clasificar y se mide cuánto cae la confianza de la clase detectada.
 * Cuanto más cae, más importante era ese tramo para la decisión.
 */
export async function perturbationImportance(
  window: number[],
  predict: PredictFn,
  label: Label,
  sampleRate = 250,
  segmentMs = 50,
): Promise<number[]> {
  const classIndex = LABELS.indexOf(label);
  const baseline = (await predict(window))[classIndex];
  const segment = Math.max(1, Math.round((segmentMs / 1000) * sampleRate));
  const importance: number[] = [];

  for (let start = 0; start < window.length; start += segment) {
    const occluded = window.slice();
    // La señal está en z-score: 0 es la media, o sea "sin información".
    for (let i = start; i < Math.min(start + segment, window.length); i++) {
      occluded[i] = 0;
    }
    const probs = await predict(occluded);
    importance.push(Math.max(0, baseline - probs[classIndex]));
  }

  const max = Math.max(...importance);
  return max > 0 ? importance.map(v => v / max) : importance;
}
