import { API_BASE_URL } from '@env';
import type { Alert, AlertStatus, NewAlert, Session } from '../data/types';
import type { Label } from '../ml/types';
import { supabase } from './supabase';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error ?? `Error ${response.status} en ${path}`);
  }
  return response.json() as Promise<T>;
}

const post = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined });

export const api = {
  startSession: (deviceId: string, patientCode: string) =>
    post<Session>('/sessions', { deviceId, patientCode }),
  endSession: (sessionId: string) => post<Session>(`/sessions/${sessionId}/end`),
  saveClassification: (sessionId: string, classification: Label, confidence: number) =>
    post(`/sessions/${sessionId}/classifications`, { classification, confidence }),
  listSessions: () => request<Session[]>('/sessions'),

  sendAlert: (a: NewAlert) =>
    post<Alert>('/alerts', {
      sessionId: a.sessionId,
      classification: a.label,
      confidence: a.confidence,
      ecgSnapshot: a.ecgSnapshot,
      hr: a.hr,
      rrMs: a.rrMs,
      latitude: a.latitude,
      longitude: a.longitude,
    }),
  listAlerts: () => request<Alert[]>('/alerts'),
  setAlertStatus: (id: string, status: Exclude<AlertStatus, 'pendiente'>) =>
    post<Alert>(`/alerts/${id}/status`, { status }),
};
