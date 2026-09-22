import type { SupabaseClient } from '@supabase/supabase-js';

export type OwnedSession = { id: string; patient_code: string };

/**
 * Devuelve la sesión solo si pertenece al paramédico. El backend usa la llave
 * service_role (salta RLS), así que esta verificación es la que impide escribir
 * en sesiones ajenas.
 */
export async function findOwnedSession(
  db: SupabaseClient,
  sessionId: string,
  paramedicId: string,
): Promise<OwnedSession | null> {
  const { data, error } = await db
    .from('sessions')
    .select('id, patient_code')
    .eq('id', sessionId)
    .eq('paramedic_id', paramedicId)
    .maybeSingle();
  if (error) throw error;
  return data;
}
