import { Router } from 'express';
import { requireAuth, requireRole } from '../lib/auth.js';
import { toSessionDto } from '../lib/dto.js';
import { findOwnedSession } from '../lib/ownership.js';
import { classificationSchema, startSessionSchema } from '../lib/schemas.js';
import { admin } from '../lib/supabase.js';

export const sessions = Router();
sessions.use(requireAuth);

const SESSION_COLUMNS =
  'id, patient_code, device_id, started_at, ended_at, last_label, last_confidence';

sessions.post('/', requireRole('paramedico'), async (req, res) => {
  const parsed = startSessionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });

  const { data, error } = await admin
    .from('sessions')
    .insert({
      paramedic_id: req.user!.id,
      patient_code: parsed.data.patientCode,
      device_id: parsed.data.deviceId,
    })
    .select(SESSION_COLUMNS)
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(toSessionDto(data));
});

sessions.post('/:id/end', async (req, res) => {
  if (!(await findOwnedSession(admin, req.params.id, req.user!.id))) {
    return res.status(404).json({ error: 'Sesión no encontrada' });
  }

  const { data, error } = await admin
    .from('sessions')
    .update({ ended_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .select(SESSION_COLUMNS)
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(toSessionDto(data));
});

sessions.post('/:id/classifications', async (req, res) => {
  const parsed = classificationSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });

  if (!(await findOwnedSession(admin, req.params.id, req.user!.id))) {
    return res.status(404).json({ error: 'Sesión no encontrada' });
  }

  const { classification, confidence } = parsed.data;
  const inserted = await admin
    .from('classifications')
    .insert({ session_id: req.params.id, classification, confidence });
  if (inserted.error) return res.status(500).json({ error: inserted.error.message });

  const updated = await admin
    .from('sessions')
    .update({ last_label: classification, last_confidence: confidence })
    .eq('id', req.params.id);
  if (updated.error) return res.status(500).json({ error: updated.error.message });

  res.status(201).json({ ok: true });
});

sessions.get('/', async (req, res) => {
  let query = admin
    .from('sessions')
    .select(SESSION_COLUMNS)
    .order('started_at', { ascending: false })
    .limit(100);

  // El paramédico ve solo sus sesiones; médico y admin ven todas.
  if (req.user!.role === 'paramedico') query = query.eq('paramedic_id', req.user!.id);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data.map(toSessionDto));
});
