import { z } from 'zod';

export const labelSchema = z.enum(['normal', 'afib', 'isquemia']);

export const startSessionSchema = z.object({
  deviceId: z.string().min(1).max(64),
  patientCode: z.string().regex(/^PAC-\d{4}$/, 'Formato esperado: PAC-1234'),
});

export const classificationSchema = z.object({
  classification: labelSchema,
  confidence: z.number().min(0).max(1),
});

export const alertSchema = z.object({
  sessionId: z.string().uuid(),
  classification: z.enum(['afib', 'isquemia']),
  confidence: z.number().min(0).max(1),
  ecgSnapshot: z.array(z.number()).max(2500),
  hr: z.number().int().min(20).max(300).nullable(),
  rrMs: z.number().int().min(150).max(3000).nullable(),
  latitude: z.number().min(-90).max(90).nullable(),
  longitude: z.number().min(-180).max(180).nullable(),
});

export const alertStatusSchema = z.object({
  status: z.enum(['aceptada', 'derivada']),
});

/** El admin solo crea cuentas operativas: no puede crear otros administradores. */
export const createUserSchema = z.object({
  fullName: z.string().trim().min(3, 'Nombre muy corto').max(80),
  email: z.string().trim().toLowerCase().email('Correo inválido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres').max(72),
  role: z.enum(['paramedico', 'medico']),
});
