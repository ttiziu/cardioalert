import assert from 'node:assert/strict';
import { test } from 'node:test';
import { alertSchema, alertStatusSchema, createUserSchema, startSessionSchema } from './schemas.js';

const validAlert = {
  sessionId: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
  classification: 'isquemia',
  confidence: 0.94,
  ecgSnapshot: [0.1, -0.2],
  hr: 87,
  rrMs: 689,
  latitude: -12.0553,
  longitude: -77.0311,
};

test('acepta una alerta válida', () => {
  assert.equal(alertSchema.safeParse(validAlert).success, true);
});

test('rechaza alertas de ritmo normal', () => {
  assert.equal(alertSchema.safeParse({ ...validAlert, classification: 'normal' }).success, false);
});

test('rechaza confianza fuera de 0..1', () => {
  assert.equal(alertSchema.safeParse({ ...validAlert, confidence: 1.5 }).success, false);
});

test('rechaza snapshots más largos que una ventana', () => {
  const ecgSnapshot = new Array(2501).fill(0);
  assert.equal(alertSchema.safeParse({ ...validAlert, ecgSnapshot }).success, false);
});

test('exige el formato anónimo del código de paciente', () => {
  assert.equal(startSessionSchema.safeParse({ deviceId: 'A1', patientCode: 'PAC-1234' }).success, true);
  assert.equal(startSessionSchema.safeParse({ deviceId: 'A1', patientCode: 'Juan Pérez' }).success, false);
});

test('solo permite aceptar o derivar', () => {
  assert.equal(alertStatusSchema.safeParse({ status: 'derivada' }).success, true);
  assert.equal(alertStatusSchema.safeParse({ status: 'pendiente' }).success, false);
});

const newUser = { fullName: 'Ana Torres', email: 'Ana@Hospital.pe ', password: 'segura123', role: 'medico' };

test('acepta un usuario válido y normaliza el correo', () => {
  const r = createUserSchema.safeParse(newUser);
  assert.equal(r.success, true);
  assert.equal(r.success && r.data.email, 'ana@hospital.pe');
});

test('no permite crear administradores desde la app', () => {
  assert.equal(createUserSchema.safeParse({ ...newUser, role: 'admin' }).success, false);
});

test('exige contraseña de al menos 8 caracteres', () => {
  assert.equal(createUserSchema.safeParse({ ...newUser, password: '1234567' }).success, false);
});
