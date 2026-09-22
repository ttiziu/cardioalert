import { POLAR_ECG_SAMPLE_RATE } from './constants';

/**
 * ECG sintético para desarrollar y demostrar sin la banda H10.
 * No pretende ser clínicamente fiel: reproduce un PQRST reconocible
 * para validar la UI, el buffer de ventanas y el pipeline de inferencia.
 */
export function generateEcgChunk(
  startSample: number,
  count: number,
  bpm: number,
): number[] {
  const samplesPerBeat = (60 / bpm) * POLAR_ECG_SAMPLE_RATE;
  const out = new Array<number>(count);

  for (let i = 0; i < count; i++) {
    const phase = ((startSample + i) % samplesPerBeat) / samplesPerBeat;
    out[i] = Math.round(pqrst(phase) * 1000 + (Math.random() - 0.5) * 40);
  }
  return out;
}

/** Un latido normalizado en [0,1] del ciclo cardíaco. */
function pqrst(t: number): number {
  const gauss = (center: number, width: number, amp: number) =>
    amp * Math.exp(-((t - center) ** 2) / (2 * width ** 2));

  return (
    gauss(0.2, 0.025, 0.12) + // onda P
    gauss(0.38, 0.008, -0.16) + // Q
    gauss(0.4, 0.007, 1.0) + // R
    gauss(0.42, 0.009, -0.25) + // S
    gauss(0.62, 0.04, 0.3) // onda T
  );
}

export type MockHandle = { stop: () => void };

/** Emite paquetes de ECG al ritmo real del sensor (~73 ms). */
export function startMockEcg(
  onChunk: (samples: number[]) => void,
  onHr: (bpm: number) => void,
  bpm = 72,
): MockHandle {
  const chunkSize = 10;
  const intervalMs = (chunkSize / POLAR_ECG_SAMPLE_RATE) * 1000;
  let cursor = 0;

  const ecgTimer = setInterval(() => {
    onChunk(generateEcgChunk(cursor, chunkSize, bpm));
    cursor += chunkSize;
  }, intervalMs);

  const hrTimer = setInterval(() => {
    onHr(bpm + Math.round((Math.random() - 0.5) * 4));
  }, 1000);

  return {
    stop: () => {
      clearInterval(ecgTimer);
      clearInterval(hrTimer);
    },
  };
}
