/** Traduce filas de Postgres (snake_case) a los objetos que consume la app. */

type Row = Record<string, any>;

export const toSessionDto = (r: Row) => ({
  id: r.id,
  patientCode: r.patient_code,
  deviceId: r.device_id,
  startedAt: r.started_at,
  endedAt: r.ended_at ?? undefined,
  label: r.last_label,
  confidence: r.last_confidence,
});

export const toAlertDto = (r: Row) => ({
  id: r.id,
  sessionId: r.session_id,
  patientCode: r.sessions?.patient_code ?? '',
  label: r.classification,
  confidence: r.confidence,
  hr: r.hr,
  rrMs: r.rr_ms,
  latitude: r.latitude,
  longitude: r.longitude,
  ecgSnapshot: r.ecg_snapshot ?? [],
  createdAt: r.created_at,
  status: r.status,
});
