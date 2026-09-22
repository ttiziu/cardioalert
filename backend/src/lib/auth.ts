import type { NextFunction, Request, Response } from 'express';
import { admin, getUserFromToken } from './supabase.js';

export type Role = 'paramedico' | 'medico' | 'admin';

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; role: Role };
    }
  }
}

/** El rol sale de `profiles`: la misma fuente que usan las políticas RLS. */
async function getRole(userId: string): Promise<Role | null> {
  const { data } = await admin
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();
  return (data?.role as Role | undefined) ?? null;
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Falta el token de autenticación' });
  }

  const user = await getUserFromToken(header.slice(7));
  if (!user) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }

  const role = await getRole(user.id);
  if (!role) {
    return res.status(403).json({ error: 'Usuario sin perfil asignado' });
  }

  req.user = { id: user.id, role };
  next();
}

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Rol no autorizado' });
    }
    next();
  };
}
