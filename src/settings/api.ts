import { supabase } from '../lib/supabase';

/**
 * Elimina la cuenta del usuario autenticado (y en cascada todos sus hábitos,
 * registros y metas) llamando a la función `delete_my_account` de Supabase.
 * Ver `supabase/schema.sql` para el porqué esto necesita una función SQL
 * en vez de borrarse directamente desde el cliente.
 */
export async function deleteAccount(): Promise<void> {
  const { error } = await supabase.rpc('delete_my_account');
  if (error) throw error;
}