import { createClient } from '@supabase/supabase-js';

// Las variables de Vite que empiezan por VITE_ se inyectan en el build.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// Falla de forma clara y temprana si faltan las claves, en lugar de
// dar errores confusos más adelante.
if (!url || !anonKey) {
  const msg =
    'Faltan las variables VITE_SUPABASE_URL y/o VITE_SUPABASE_ANON_KEY. ' +
    'Copia .env.example a .env y completa las claves de tu proyecto Supabase.';
  // Mostrar el error en pantalla además de la consola.
  document.addEventListener('DOMContentLoaded', () => {
    document.body.innerHTML =
      `<div style="font-family:system-ui;max-width:560px;margin:80px auto;padding:24px;` +
      `border:1px solid #e5e7eb;border-radius:12px;color:#1a1a2e;line-height:1.5">` +
      `<h1 style="margin:0 0 8px;font-size:18px">Configuración incompleta</h1>` +
      `<p style="margin:0;color:#6b7280">${msg}</p></div>`;
  });
  throw new Error(msg);
}

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
