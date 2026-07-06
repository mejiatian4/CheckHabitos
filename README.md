# Constancia — Rastreador de hábitos

Aplicación web para registrar hábitos día a día y visualizar el progreso. Tabla semanal de lunes a domingo con casillas por día, gráfica del progreso de hoy, resumen semanal en barras y racha de días consecutivos. Los datos se guardan en **Supabase**, así que puedes ver tu progreso desde cualquier dispositivo iniciando sesión.

Pensada para desplegarse **gratis** como sitio estático en **GitHub Pages**.

---

## Características

- Registro e inicio de sesión con correo y contraseña (Supabase Auth), con sesión persistente.
- Crear, editar y eliminar hábitos, cada uno con su color.
- Tabla semanal (lunes a domingo) con una casilla por día; el día de hoy queda resaltado.
- Navegación entre semanas y botón para volver a la semana actual.
- Gráfica de dona con el progreso de hoy (completados / total y porcentaje).
- Gráfica de barras con el cumplimiento por día de la semana.
- Indicadores de porcentaje semanal y racha actual.
- Modo claro y oscuro automáticos, diseño responsive y accesible.
- Cada usuario solo ve sus propios datos (seguridad por fila en la base de datos).

---

## Stack

- **Vite** + **TypeScript** (sin framework de UI; CSS propio).
- **Chart.js** para las gráficas.
- **@supabase/supabase-js** para datos y autenticación.

---

## Requisitos previos

- **Node.js 18 o superior** y npm.
- Una cuenta gratuita en **[Supabase](https://supabase.com)**.
- Una cuenta en **GitHub** (para el despliegue).

---

## 1. Configurar Supabase

1. Entra a [supabase.com](https://supabase.com) y crea un proyecto nuevo (el plan gratuito es suficiente).
2. Abre **SQL Editor** → **New query**, pega el contenido de [`supabase/schema.sql`](supabase/schema.sql) y pulsa **Run**. Esto crea las tablas, los índices y las políticas de seguridad.
3. Ve a **Project Settings → API** y copia dos valores:
   - **Project URL** → será tu `VITE_SUPABASE_URL`.
   - **anon public key** → será tu `VITE_SUPABASE_ANON_KEY`.

> La `anon key` está diseñada para viajar en el frontend; es pública por diseño. La seguridad real la dan las políticas de *Row Level Security* del esquema, no el ocultamiento de esa clave.

### Correo de confirmación (opcional)

Por defecto, Supabase pide confirmar el correo al registrarse. Para pruebas puedes desactivarlo en **Authentication → Providers → Email → Confirm email**. Si lo dejas activado, tras registrarte revisa tu correo antes de iniciar sesión.

---

## 2. Correr en local

```bash
# 1. Instalar dependencias
npm install

# 2. Crear el archivo .env a partir del ejemplo
cp .env.example .env
#    y editar .env con tus valores de Supabase

# 3. Levantar el servidor de desarrollo (recarga en caliente)
npm run dev
```

Abre la dirección que muestra la terminal (por defecto `http://localhost:5173`). Cualquier cambio en el código se refleja al instante.

> **¿Solo quieres ver el diseño sin configurar nada?** Abre el archivo [`vista-previa.html`](vista-previa.html) con doble clic en tu navegador. Es una maqueta estática con datos de ejemplo que usa los estilos reales del proyecto; sirve para revisar el diseño antes de montar Supabase.

### Otros comandos

```bash
npm run build     # genera el sitio estático en dist/
npm run preview   # sirve el build de producción para revisarlo antes de desplegar
```

---

## 3. Desplegar en GitHub Pages

El repositorio incluye un workflow en [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) que construye y publica la app automáticamente.

**Pasos:**

1. Sube el proyecto a un repositorio de GitHub (la rama debe llamarse `main`).
2. En el repositorio, ve a **Settings → Secrets and variables → Actions → New repository secret** y crea dos secretos:
   - `VITE_SUPABASE_URL` con tu Project URL.
   - `VITE_SUPABASE_ANON_KEY` con tu anon key.
3. Ve a **Settings → Pages** y, en **Build and deployment → Source**, selecciona **GitHub Actions**.
4. Haz un push a `main` (o lanza el workflow manualmente desde la pestaña **Actions**). Al terminar, la pestaña Pages mostrará la URL pública.

### Sobre el `base` de Vite

GitHub Pages publica en una subruta (`https://usuario.github.io/nombre-del-repo/`). El workflow detecta el nombre del repositorio automáticamente y lo pasa como `BASE_PATH`, así que **no necesitas configurar nada a mano**.

Si corres `npm run build` localmente y quieres probar esa subruta, pásala tú:

```bash
BASE_PATH=/nombre-del-repo/ npm run build
```

Para un dominio propio o publicación en la raíz (`usuario.github.io`), usa `BASE_PATH=/`.

---

## Estructura del proyecto

```
habit-tracker/
├── .github/workflows/deploy.yml   # despliegue automático a GitHub Pages
├── public/favicon.svg
├── src/
│   ├── lib/
│   │   ├── supabase.ts            # cliente de Supabase
│   │   ├── types.ts               # tipos de dominio
│   │   └── dates.ts               # utilidades de fechas (semana lun–dom)
│   ├── auth/auth.ts               # login / registro / sesión
│   ├── habits/
│   │   ├── api.ts                 # acceso a datos (CRUD + registros)
│   │   └── dashboard.ts           # tablero: tabla, gráficas y acciones
│   ├── charts/
│   │   ├── daily.ts               # gráfica de dona (hoy)
│   │   └── weekly.ts              # gráfica de barras (semana)
│   ├── ui/
│   │   ├── dom.ts                 # helpers de DOM
│   │   ├── icons.ts               # iconos SVG
│   │   ├── modal.ts               # modales (crear/editar, confirmar)
│   │   └── toast.ts               # notificaciones
│   ├── styles/main.css            # tema y estilos
│   └── main.ts                    # punto de entrada y enrutado
├── supabase/schema.sql            # esquema de base de datos
├── .env.example
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## Cómo usar la app

1. Crea una cuenta o inicia sesión.
2. Pulsa **Hábito** para agregar tu primer hábito y elige un color.
3. Marca las casillas de los días en que lo cumpliste. Cada cambio se guarda solo.
4. Observa el progreso de hoy en la dona, el resumen de la semana en las barras y tu racha de días consecutivos.
5. Usa las flechas para moverte entre semanas; **Hoy** te devuelve a la semana actual.

---

## Notas

- En el plan gratuito de Supabase, un proyecto se pausa tras un periodo de inactividad; con el uso diario de la app esto no ocurre, y si llegara a pausarse se reactiva desde el panel de Supabase.
- El bundle incluye Chart.js y el SDK de Supabase; es perfectamente adecuado para una app personal.

Licencia MIT.
