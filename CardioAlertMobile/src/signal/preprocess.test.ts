import {
  normalize,
  resample,
  preprocessWindow,
  SlidingWindow,
  WINDOW_SIZE,
  TARGET_SAMPLE_RATE,
} from './preprocess';

describe('resample', () => {
  it('lleva 130 Hz a 250 Hz manteniendo la duración', () => {
    const oneSecondAt130 = Array.from({ length: 130 }, (_, i) => i);
    const out = resample(oneSecondAt130, 130, 250);
    expect(out.length).toBe(250);
  });

  it('no altera la señal si las tasas coinciden', () => {
    const input = [1, 2, 3];
    expect(resample(input, 250, 250)).toEqual(input);
  });
});

describe('normalize', () => {
  it('deja media 0 y desviación 1', () => {
    const out = normalize([-500, 250, 1000, 40, 7]);
    const mean = out.reduce((a, b) => a + b, 0) / out.length;
    const std = Math.sqrt(out.reduce((a, b) => a + b * b, 0) / out.length);
    expect(mean).toBeCloseTo(0);
    expect(std).toBeCloseTo(1);
  });

  it('no divide por cero con señal plana', () => {
    expect(normalize([0, 0, 0])).toEqual([0, 0, 0]);
  });
});

describe('preprocessWindow', () => {
  it('entrega exactamente 2500 muestras desde 10 s del H10', () => {
    const raw = Array.from({ length: 130 * 10 }, (_, i) =>
      Math.sin((2 * Math.PI * 1.2 * i) / 130),
    );
    const out = preprocessWindow(raw, 130);
    expect(WINDOW_SIZE).toBe(2500);
    expect(out.length).toBe(WINDOW_SIZE);
  });
});

describe('SlidingWindow', () => {
  it('espera 10 s completos antes de la primera ventana', () => {
    const w = new SlidingWindow(130);
    expect(w.push(new Array(1299).fill(1))).toBeNull();
    const out = w.push([1]);
    expect(out).toHaveLength(TARGET_SAMPLE_RATE * 10);
  });

  it('después entrega una ventana nueva cada 2.5 s', () => {
    const w = new SlidingWindow(130);
    w.push(new Array(1300).fill(1));
    expect(w.push(new Array(300).fill(1))).toBeNull();
    expect(w.push(new Array(25).fill(1))).toHaveLength(2500);
  });
});
