import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { findOwnedSession } from './ownership.js';

/** Imita la cadena from().select().eq().eq().maybeSingle() sobre una tabla en memoria. */
function fakeDb(rows: Array<Record<string, string>>) {
  const filters: Record<string, string> = {};
  const chain = {
    select: () => chain,
    eq: (column: string, value: string) => {
      filters[column] = value;
      return chain;
    },
    maybeSingle: async () => ({
      data:
        rows.find(r => Object.entries(filters).every(([k, v]) => r[k] === v)) ?? null,
      error: null,
    }),
  };
  return { from: () => chain } as unknown as SupabaseClient;
}

const rows = [{ id: 's1', paramedic_id: 'ana', patient_code: 'PAC-1234' }];

test('devuelve la sesión cuando pertenece al paramédico', async () => {
  const session = await findOwnedSession(fakeDb(rows), 's1', 'ana');
  assert.equal(session?.id, 's1');
});

test('no devuelve la sesión de otro paramédico', async () => {
  assert.equal(await findOwnedSession(fakeDb(rows), 's1', 'luis'), null);
});

test('no devuelve sesiones inexistentes', async () => {
  assert.equal(await findOwnedSession(fakeDb(rows), 'nope', 'ana'), null);
});
