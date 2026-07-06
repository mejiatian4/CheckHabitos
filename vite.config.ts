import { defineConfig } from 'vite';

// El `base` debe coincidir con el nombre del repositorio en GitHub Pages.
// Si tu repo es https://github.com/usuario/habit-tracker, déjalo como '/habit-tracker/'.
// Si usas un dominio propio o publicas en la raíz (usuario.github.io), cámbialo a '/'.
//
// Puedes sobreescribirlo sin tocar código pasando la variable de entorno BASE_PATH:
//   BASE_PATH=/mi-repo/ npm run build
const base = process.env.BASE_PATH ?? '/habit-tracker/';

export default defineConfig({
  base,
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  server: {
    port: 5173,
    open: true,
  },
});
