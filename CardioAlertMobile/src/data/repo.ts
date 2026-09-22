import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEMO_MODE } from '../config';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';
import type { Label } from '../ml/types';
import type { Alert, AlertStatus, NewAlert, Session } from './types';

/**
 * Único punto de acceso a datos de la app.
 * Modo real: todo pasa por el backend. Modo demo: se guarda en el celular.
 */

const SESSIONS_KEY = 'cardioalert.sessions';
const ALERTS_KEY = 'cardioalert.alerts';

const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export const newPatientCode = () => `PAC-${Math.floor(1000 + Math.random() * 9000)}`;

async function readLocal<T>(key: string): Promise<T[]> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

async function writeLocal<T>(key: string, items: T[]) {
  await AsyncStorage.setItem(key, JSON.stringify(items.slice(0, 200)));
}

async function updateLocal<T extends { id: string }>(
  key: string,
  id: string,
  patch: Partial<T>,
) {
  const items = await readLocal<T>(key);
  await writeLocal(key, items.map(i => (i.id === id ? { ...i, ...patch } : i)));
}

export async function startSession(deviceId: string, patientCode: string): Promise<Session> {
  if (!DEMO_MODE) return api.startSession(deviceId, patientCode);
  const session: Session = {
    id: newId(),
    patientCode,
    deviceId,
    startedAt: new Date().toISOString(),
    label: 'normal',
    confidence: 0,
  };
  await writeLocal(SESSIONS_KEY, [session, ...(await readLocal<Session>(SESSIONS_KEY))]);
  return session;
}

export async function saveClassification(session: Session, label: Label, confidence: number) {
  if (!DEMO_MODE) {
    await api.saveClassification(session.id, label, confidence);
    return;
  }
  await updateLocal<Session>(SESSIONS_KEY, session.id, { label, confidence });
}

export async function endSession(session: Session) {
  if (!DEMO_MODE) {
    await api.endSession(session.id);
    return;
  }
  await updateLocal<Session>(SESSIONS_KEY, session.id, { endedAt: new Date().toISOString() });
}

export async function listSessions(): Promise<Session[]> {
  return DEMO_MODE ? readLocal<Session>(SESSIONS_KEY) : api.listSessions();
}

export async function sendAlert(input: NewAlert): Promise<Alert> {
  if (!DEMO_MODE) return api.sendAlert(input);
  const alert: Alert = {
    ...input,
    id: newId(),
    createdAt: new Date().toISOString(),
    status: 'pendiente',
  };
  await writeLocal(ALERTS_KEY, [alert, ...(await readLocal<Alert>(ALERTS_KEY))]);
  return alert;
}

export async function listAlerts(): Promise<Alert[]> {
  return DEMO_MODE ? readLocal<Alert>(ALERTS_KEY) : api.listAlerts();
}

export async function setAlertStatus(id: string, status: Exclude<AlertStatus, 'pendiente'>) {
  if (!DEMO_MODE) {
    await api.setAlertStatus(id, status);
    return;
  }
  await updateLocal<Alert>(ALERTS_KEY, id, { status });
}

/**
 * Avisa cuando cambian las alertas. Realtime solo sirve de señal: los datos se
 * vuelven a pedir con `listAlerts`, que respeta los permisos del backend.
 */
export function subscribeAlerts(onChange: () => void): () => void {
  if (DEMO_MODE) {
    const timer = setInterval(onChange, 2000);
    return () => clearInterval(timer);
  }
  const channel = supabase
    .channel('alerts-feed')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'alerts' }, onChange)
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}
