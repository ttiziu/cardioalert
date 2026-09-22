/**
 * Debe coincidir exactamente con el preprocesamiento del notebook de entrenamiento:
 * 250 Hz, ventanas de 10 s (2500 muestras), pasa-banda 0.5–40 Hz y z-score por ventana.
 */

export const TARGET_SAMPLE_RATE = 250;
export const WINDOW_SECONDS = 10;
export const WINDOW_SIZE = TARGET_SAMPLE_RATE * WINDOW_SECONDS;

/** Remuestreo lineal de `from` Hz a `to` Hz. */
export function resample(input: number[], from: number, to: number): number[] {
  if (from === to || input.length === 0) return [...input];

  const ratio = from / to;
  const outLength = Math.max(1, Math.round(input.length / ratio));
  const out = new Array<number>(outLength);

  for (let i = 0; i < outLength; i++) {
    const pos = i * ratio;
    const left = Math.floor(pos);
    const right = Math.min(left + 1, input.length - 1);
    const frac = pos - left;
    out[i] = input[left] * (1 - frac) + input[right] * frac;
  }
  return out;
}

/**
 * Filtro pasa-banda 0.5–40 Hz aplicado como cascada de dos filtros de un polo
 * (pasa-altos + pasa-bajos), en ida y vuelta para no desfasar la señal.
 * ponytail: suficiente para quitar deriva de base y ruido EMG; si el paper
 * exige un Butterworth de orden 4, se cambia aquí sin tocar el resto.
 */
export function bandpass(
  input: number[],
  sampleRate: number,
  lowHz = 0.5,
  highHz = 40,
): number[] {
  const highpassed = onePoleHighpass(input, sampleRate, lowHz);
  const forward = onePoleLowpass(highpassed, sampleRate, highHz);
  const backward = onePoleLowpass([...forward].reverse(), sampleRate, highHz);
  return backward.reverse();
}

function onePoleHighpass(x: number[], fs: number, cutoff: number): number[] {
  const rc = 1 / (2 * Math.PI * cutoff);
  const dt = 1 / fs;
  const alpha = rc / (rc + dt);
  const y = new Array<number>(x.length);
  y[0] = 0;
  for (let i = 1; i < x.length; i++) {
    y[i] = alpha * (y[i - 1] + x[i] - x[i - 1]);
  }
  return y;
}

function onePoleLowpass(x: number[], fs: number, cutoff: number): number[] {
  const rc = 1 / (2 * Math.PI * cutoff);
  const dt = 1 / fs;
  const alpha = dt / (rc + dt);
  const y = new Array<number>(x.length);
  y[0] = x[0];
  for (let i = 1; i < x.length; i++) {
    y[i] = y[i - 1] + alpha * (x[i] - y[i - 1]);
  }
  return y;
}

/** Z-score: media 0, desviación 1 (igual que `(x - mean) / (std + 1e-8)` en el notebook). */
export function normalize(input: number[]): number[] {
  if (input.length === 0) return [];
  const mean = input.reduce((a, b) => a + b, 0) / input.length;
  const variance =
    input.reduce((a, b) => a + (b - mean) * (b - mean), 0) / input.length;
  const std = Math.sqrt(variance);
  return input.map(v => (v - mean) / (std + 1e-8));
}

/** Aplica el pipeline completo a una ventana cruda del H10. */
export function preprocessWindow(
  rawSamples: number[],
  sourceRate: number,
): number[] {
  const resampled = resample(rawSamples, sourceRate, TARGET_SAMPLE_RATE);
  const filtered = bandpass(resampled, TARGET_SAMPLE_RATE);
  return normalize(filtered);
}

/**
 * Mantiene los últimos 10 s de señal cruda y entrega una ventana preprocesada
 * cada `strideSeconds`, para clasificar seguido sin esperar 10 s entre resultados.
 */
export class SlidingWindow {
  private buffer: number[] = [];
  private sinceLast = 0;
  private readonly rawWindowSize: number;
  private readonly rawStride: number;

  constructor(private readonly sourceRate: number, strideSeconds = 2.5) {
    this.rawWindowSize = Math.round(sourceRate * WINDOW_SECONDS);
    this.rawStride = Math.round(sourceRate * strideSeconds);
  }

  /** Devuelve una ventana lista para el modelo, o null si todavía no toca. */
  push(samples: number[]): number[] | null {
    this.buffer.push(...samples);
    if (this.buffer.length > this.rawWindowSize) {
      this.buffer.splice(0, this.buffer.length - this.rawWindowSize);
    }
    this.sinceLast += samples.length;
    if (this.buffer.length < this.rawWindowSize || this.sinceLast < this.rawStride) {
      return null;
    }
    this.sinceLast = 0;
    return preprocessWindow(this.buffer, this.sourceRate);
  }

  reset() {
    this.buffer = [];
    this.sinceLast = 0;
  }
}
