import { ALERT_CONFIDENCE_THRESHOLD, SUPABASE_URL } from '@env';

/** Sin Supabase configurado la app corre en modo demo: datos locales y ECG simulado. */
export const DEMO_MODE = !SUPABASE_URL || SUPABASE_URL.includes('TU_PROYECTO');

export const ALERT_THRESHOLD = Number(ALERT_CONFIDENCE_THRESHOLD) || 0.85;

// ponytail: hospital receptor fijo; tabla de hospitales + selección por cercanía cuando haya más de uno.
export const RECEIVING_HOSPITAL = {
  name: 'Hospital receptor',
  unit: 'Urgencias cardiológicas',
};
