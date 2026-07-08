import { supabase } from '../lib/supabase';
import type { ChatMessage } from '../lib/types';

/**
 * Envía un mensaje al coach de IA (Edge Function `ai-coach`, que llama a la
 * API gratuita de Groq). `supabase.functions.invoke` adjunta automáticamente
 * el token del usuario autenticado, así la función puede verificar quién pregunta.
 */
export async function sendCoachMessage(message: string, history: ChatMessage[]): Promise<string> {
  const { data, error } = await supabase.functions.invoke<{ reply?: string; error?: string }>('ai-coach', {
    body: { message, history: history.slice(-10) },
  });

  if (error) throw new Error('No se pudo contactar al coach. Intenta de nuevo en un momento.');
  if (!data?.reply) throw new Error(data?.error ?? 'El coach no respondió. Intenta de nuevo.');
  return data.reply;
}
