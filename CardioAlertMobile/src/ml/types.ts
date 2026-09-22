export type Label = 'normal' | 'afib' | 'isquemia';

/** Mismo orden de salida que el modelo del notebook: [NORMAL, AFIB/AFL, ISQUEMIA]. */
export const LABELS: Label[] = ['normal', 'afib', 'isquemia'];

export type Prediction = {
  label: Label;
  confidence: number;
  probabilities: Record<Label, number>;
};

/** Recibe una ventana preprocesada de 2500 muestras y devuelve [p_normal, p_afib, p_isquemia]. */
export type PredictFn = (window: number[]) => Promise<number[]>;

export function toPrediction(probs: number[]): Prediction {
  let best = 0;
  for (let i = 1; i < probs.length; i++) if (probs[i] > probs[best]) best = i;
  return {
    label: LABELS[best],
    confidence: probs[best],
    probabilities: { normal: probs[0], afib: probs[1], isquemia: probs[2] },
  };
}
