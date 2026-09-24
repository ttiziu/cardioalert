import { Router } from 'express';
import { requireAuth, requireRole } from '../lib/auth.js';
import { createUserSchema } from '../lib/schemas.js';
import { admin } from '../lib/supabase.js';

export const users = Router();
users.use(requireAuth, requireRole('admin'));

users.get('/', async (_req, res) => {
  const [{ data: authData, error: authError }, { data: profiles, error: profError }] = await Promise.all([
    admin.auth.admin.listUsers({ perPage: 200 }),
    admin.from('profiles').select('id, full_name, role, created_at'),
  ]);
  if (authError) return res.status(500).json({ error: authError.message });
  if (profError) return res.status(500).json({ error: profError.message });

  const emails = new Map(authData.users.map(u => [u.id, u.email ?? '']));
  res.json(
    profiles
      .map(p => ({
        id: p.id,
        email: emails.get(p.id) ?? '',
        fullName: p.full_name ?? '',
        role: p.role,
        createdAt: p.created_at,
      }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  );
});

users.post('/', async (req, res) => {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' });
  }
  const { email, password, fullName, role } = parsed.data;

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role },
    user_metadata: { full_name: fullName },
  });
  if (error) {
    const duplicated = /already|registered|exists/i.test(error.message);
    return res
      .status(duplicated ? 409 : 500)
      .json({ error: duplicated ? 'Ya existe un usuario con ese correo' : error.message });
  }

  // El rol se escribe aquí y no se deja al trigger handle_new_user: Supabase inserta
  // la cuenta antes de guardar app_metadata, así que el trigger no ve el rol y deja
  // el valor por defecto ('paramedico').
  const { error: profileError } = await admin
    .from('profiles')
    .upsert({ id: data.user.id, role, full_name: fullName });
  if (profileError) {
    // Sin perfil correcto la cuenta tendría el rol equivocado: se revierte la creación.
    await admin.auth.admin.deleteUser(data.user.id);
    return res.status(500).json({ error: `No se pudo asignar el rol: ${profileError.message}` });
  }

  res.status(201).json({
    id: data.user.id,
    email,
    fullName,
    role,
    createdAt: data.user.created_at,
  });
});
