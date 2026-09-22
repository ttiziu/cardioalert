import { Router } from 'express';
import { requireAuth, requireRole } from '../lib/auth.js';
import { toAlertDto } from '../lib/dto.js';
import { findOwnedSession } from '../lib/ownership.js';
import { alertSchema, alertStatusSchema } from '../lib/schemas.js';
import { admin } from '../lib/supabase.js';

export const alerts = Router();
alerts.use(requireAuth);

const ALERT_COLUMNS = '*, sessions(patient_code)';

alerts.post('/', requireRole('paramedico'), async (req, res) => {
  const parsed = alertSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
  const input = parsed.data;

  if (!(await findOwnedSession(admin, input.sessionId, req.user!.id))) {
    return res.status(404).json({ error: 'Sesión no encontrada' });
  }

  // El insert dispara Supabase Realtime y el monitor hospitalario se refresca.
  const { data, error } = await admin
    .from('alerts')
    .insert({
      session_id: input.sessionId,
      paramedic_id: req.user!.id,
      classification: input.classification,
      confidence: input.confidence,
      ecg_snapshot: input.ecgSnapshot,
      hr: input.hr,
      rr_ms: input.rrMs,
      latitude: input.latitude,
      longitude: input.longitude,
    })
    .select(ALERT_COLUMNS)
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(toAlertDto(data));
});

alerts.get('/', async (req, res) => {
  let query = admin
    .from('alerts')
    .select(ALERT_COLUMNS)
    .order('created_at', { ascending: false })
    .limit(50);

  // El paramédico ve solo las alertas que envió; médico y admin ven todas.
  if (req.user!.role === 'paramedico') query = query.eq('paramedic_id', req.user!.id);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data.map(toAlertDto));
});

alerts.post('/:id/status', requireRole('medico', 'admin'), async (req, res) => {
  const parsed = alertStatusSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });

  const { data, error } = await admin
    .from('alerts')
    .update({
      status: parsed.data.status,
      responded_at: new Date().toISOString(),
      responded_by: req.user!.id,
    })
    .eq('id', req.params.id)
    .eq('status', 'pendiente')
    .select(ALERT_COLUMNS)
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(409).json({ error: 'La alerta no existe o ya fue respondida' });
  res.json(toAlertDto(data));
});
