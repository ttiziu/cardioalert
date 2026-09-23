import type { Label } from '../ml/types';

/** Mismo formato que devuelve el backend (backend/src/lib/dto.ts). */
export type Session = {
  id: string;
  patientCode: string;
  deviceId: string;
  startedAt: string;
  endedAt?: string;
  label: Label;
  confidence: number;
};

export type AlertStatus = 'pendiente' | 'aceptada' | 'derivada';

export type Alert = {
  id: string;
  sessionId: string;
  patientCode: string;
  label: Exclude<Label, 'normal'>;
  confidence: number;
  hr: number | null;
  rrMs: number | null;
  latitude: number | null;
  longitude: number | null;
  ecgSnapshot: number[];
  createdAt: string;
  status: AlertStatus;
};

export type NewAlert = Omit<Alert, 'id' | 'createdAt' | 'status'>;

export type StaffRole = 'paramedico' | 'medico';

export type AppUser = {
  id: string;
  email: string;
  fullName: string;
  role: StaffRole | 'admin';
  createdAt: string;
};

export type NewUser = { fullName: string; email: string; password: string; role: StaffRole };
