import { perturbationImportance } from './xai';
import type { PredictFn } from './types';

describe('perturbationImportance', () => {
  it('marca como más importante el tramo del que depende la predicción', async () => {
    const window = new Array(250).fill(0);
    for (let i = 100; i < 113; i++) window[i] = 5;

    // Modelo de juguete: la "isquemia" depende solo de la energía en 100–112.
    const predict: PredictFn = async w => {
      const energy = w.slice(100, 113).reduce((a, b) => a + Math.abs(b), 0);
      const p = Math.min(1, energy / 65);
      return [1 - p, 0, p];
    };

    const importance = await perturbationImportance(window, predict, 'isquemia');
    const top = importance.indexOf(Math.max(...importance));

    expect(importance).toHaveLength(Math.ceil(250 / 13));
    expect(top * 13).toBeLessThanOrEqual(112);
    expect(top * 13 + 13).toBeGreaterThan(100);
    expect(importance[0]).toBe(0);
  });

  it('devuelve ceros si ningún tramo afecta la confianza', async () => {
    const importance = await perturbationImportance(
      new Array(50).fill(1),
      async () => [1, 0, 0],
      'normal',
    );
    expect(importance.every(v => v === 0)).toBe(true);
  });
});
