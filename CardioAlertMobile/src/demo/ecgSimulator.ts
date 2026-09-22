import type { Label } from '../ml/types';

/**
 * ECG sintético a la frecuencia del Polar H10 (130 Hz, microvolts) para demos
 * sin sensor. Solo para presentación: nunca se usa si hay un Polar conectado.
 */
export const SIM_RATE = 130;

const gauss = (t: number, center: number, width: number, amp: number) =>
  amp * Math.exp(-((t - center) ** 2) / (2 * width * width));

export class EcgSimulator {
  private t = 0;
  private nextBeat = 0;
  private beatStart = 0;
  private rr = 0.8;

  constructor(public scenario: Label = 'normal') {}

  /** Genera `count` muestras nuevas en microvolts. */
  next(count: number): number[] {
    const out: number[] = [];
    for (let i = 0; i < count; i++) {
      if (this.t >= this.nextBeat) {
        this.beatStart = this.t;
        this.rr =
          this.scenario === 'afib'
            ? 0.45 + Math.random() * 0.55 // R-R caótico
            : 0.78 + (Math.random() - 0.5) * 0.04;
        this.nextBeat = this.t + this.rr;
      }
      const b = this.t - this.beatStart;
      let v = 0;
      if (this.scenario !== 'afib') v += gauss(b, 0.1, 0.025, 150); // onda P
      v += gauss(b, 0.2, 0.008, -120); // Q
      v += gauss(b, 0.22, 0.01, 1300); // R
      v += gauss(b, 0.245, 0.01, -250); // S
      if (this.scenario === 'isquemia') v += gauss(b, 0.32, 0.06, 260); // ST elevado
      v += gauss(b, 0.42, 0.045, 320); // onda T
      if (this.scenario === 'afib') v += 45 * Math.sin(2 * Math.PI * 6.3 * this.t); // ondas f
      v += (Math.random() - 0.5) * 30; // ruido
      out.push(Math.round(v));
      this.t += 1 / SIM_RATE;
    }
    return out;
  }

  get heartRate() {
    return Math.round(60 / this.rr);
  }

  get rrMs() {
    return Math.round(this.rr * 1000);
  }
}
