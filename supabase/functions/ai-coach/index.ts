// ============================================================
//  Edge Function: ai-coach
//  Chat con el coach de hábitos de KROTON HABITOS, usando la API
//  gratuita de Gemini (Google AI Studio) como modelo.
// ============================================================
//
// Cómo desplegarla (una sola vez, con la Supabase CLI):
//   1. supabase login
//   2. supabase link --project-ref <tu-project-ref>
//   3. Crea una API key gratis en https://aistudio.google.com/app/apikey
//   4. supabase secrets set GEMINI_API_KEY=tu_api_key
//   5. supabase functions deploy ai-coach
//
// La función exige un usuario autenticado (verifica el JWT que llega en el
// header Authorization) para que nadie pueda usarla sin haber iniciado
// sesión en la app. No lee datos de hábitos/metas del usuario todavía: es
// un coach conversacional, sin acceso a la base de datos.

import { createClient } from 'jsr:@supabase/supabase-js@2';

const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const SYSTEM_PROMPT =
  'Eres el Coach de KROTON HABITOS, un asistente que ayuda a las personas a ser constantes con sus ' +
  'hábitos y sus metas. Respondes siempre en español, con un tono cercano, directo y motivador, ' +
  'inspirado en la filosofía estoica (disciplina, enfocarse en lo que depende de uno, constancia ' +
  'diaria) pero sin sonar acartonado ni repetitivo. Das consejos prácticos y concretos, nunca genéricos ' +
  'ni de relleno. Mantén las respuestas breves (3 a 5 líneas) salvo que te pidan más detalle. No ' +
  'inventes datos sobre el progreso real del usuario (rachas, porcentajes, metas): si preguntan por sus ' +
  'métricas exactas, diles que las revisen en las pestañas "Hábitos" o "Metas" de la app, porque tú no ' +
  'tienes acceso a esa información todavía.';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_MESSAGE_LENGTH = 1000;
const MAX_HISTORY_TURNS = 10;

interface ChatTurn {
  role: 'user' | 'assistant';
  text: string;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'POST') return json({ error: 'Método no permitido.' }, 405);

  const geminiKey = Deno.env.get('GEMINI_API_KEY');
  if (!geminiKey) return json({ error: 'Falta configurar GEMINI_API_KEY en los secrets de Supabase.' }, 500);

  // Solo usuarios autenticados de la app pueden usar el coach.
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!supabaseUrl || !anonKey) return json({ error: 'Función mal configurada.' }, 500);

  const supabaseClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await supabaseClient.auth.getUser();
  if (userError || !userData.user) return json({ error: 'No autenticado.' }, 401);

  let body: { message?: unknown; history?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Cuerpo de la petición inválido.' }, 400);
  }

  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (!message) return json({ error: 'Mensaje vacío.' }, 400);
  if (message.length > MAX_MESSAGE_LENGTH) return json({ error: 'El mensaje es demasiado largo.' }, 400);

  const rawHistory = Array.isArray(body.history) ? (body.history as ChatTurn[]) : [];
  const history = rawHistory
    .filter((turn) => (turn.role === 'user' || turn.role === 'assistant') && typeof turn.text === 'string')
    .slice(-MAX_HISTORY_TURNS);

  const contents = [
    ...history.map((turn) => ({
      role: turn.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: turn.text }],
    })),
    { role: 'user', parts: [{ text: message }] },
  ];

  let geminiRes: Response;
  try {
    geminiRes = await fetch(`${GEMINI_URL}?key=${geminiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents,
        generationConfig: { maxOutputTokens: 400, temperature: 0.7 },
      }),
    });
  } catch (err) {
    console.error('Gemini fetch failed:', err);
    return json({ error: 'El asistente no está disponible en este momento.' }, 502);
  }

  if (!geminiRes.ok) {
    console.error('Gemini error:', geminiRes.status, await geminiRes.text());
    return json({ error: 'El asistente no está disponible en este momento.' }, 502);
  }

  const data = await geminiRes.json();
  const reply: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!reply) return json({ error: 'El asistente no pudo generar una respuesta. Intenta de nuevo.' }, 502);

  return json({ reply });
});
