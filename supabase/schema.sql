-- ============================================================
--  Rastreador de Hábitos — Esquema de base de datos (Supabase)
-- ============================================================
--  Pega TODO este archivo en:  Supabase Dashboard -> SQL Editor -> New query -> Run
--  Crea las tablas, los índices y las políticas de seguridad por fila (RLS).
--  El RLS es OBLIGATORIO: garantiza que cada usuario solo acceda a SUS datos.
-- ============================================================

-- ----------------------------------------------------------------
-- Tabla de hábitos
-- ----------------------------------------------------------------
create table if not exists public.habits (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null,
  color       text not null default '#5b5bd6',
  position    int  not null default 0,
  created_at  timestamptz not null default now()
);

-- ----------------------------------------------------------------
-- Registros de cumplimiento: un registro por hábito y por día.
-- La restricción UNIQUE permite usar UPSERT al marcar/desmarcar.
-- ----------------------------------------------------------------
create table if not exists public.habit_logs (
  id          uuid primary key default gen_random_uuid(),
  habit_id    uuid not null references public.habits (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  log_date    date not null,
  completed   boolean not null default true,
  created_at  timestamptz not null default now(),
  unique (habit_id, log_date)
);

-- Índice para consultar rápido los registros de un usuario por rango de fechas.
create index if not exists habit_logs_user_date_idx
  on public.habit_logs (user_id, log_date);

-- ----------------------------------------------------------------
-- Seguridad por fila (Row Level Security)
-- ----------------------------------------------------------------
alter table public.habits     enable row level security;
alter table public.habit_logs enable row level security;

-- Cada usuario gestiona únicamente sus propios hábitos.
drop policy if exists "habits: solo el dueño" on public.habits;
create policy "habits: solo el dueño"
  on public.habits
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Cada usuario gestiona únicamente sus propios registros.
drop policy if exists "habit_logs: solo el dueño" on public.habit_logs;
create policy "habit_logs: solo el dueño"
  on public.habit_logs
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ----------------------------------------------------------------
-- Metas (corto / mediano / largo plazo)
-- ----------------------------------------------------------------
create table if not exists public.goals (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  title        text not null,
  description  text,
  term         text not null check (term in ('short', 'medium', 'long')),
  start_date   date,
  end_date     date,
  completed    boolean not null default false,
  created_at   timestamptz not null default now()
);

-- Migración desde una versión anterior de este esquema que solo tenía
-- `target_date`: agrega `start_date` y renombra `target_date` -> `end_date`.
-- Es seguro volver a correr este bloque las veces que quieras.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'goals' and column_name = 'start_date'
  ) then
    alter table public.goals add column start_date date;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'goals' and column_name = 'target_date'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'goals' and column_name = 'end_date'
  ) then
    alter table public.goals rename column target_date to end_date;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'goals' and column_name = 'end_date'
  ) then
    alter table public.goals add column end_date date;
  end if;
end $$;

create index if not exists goals_user_term_idx
  on public.goals (user_id, term);

alter table public.goals enable row level security;

drop policy if exists "goals: solo el dueño" on public.goals;
create policy "goals: solo el dueño"
  on public.goals
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ----------------------------------------------------------------
-- Eliminar mi cuenta
-- ----------------------------------------------------------------
-- Un usuario autenticado no tiene permiso para borrar filas de auth.users
-- directamente (con razón: eso lo maneja Supabase Auth). Esta función corre
-- con los privilegios de quien la crea (security definer), así que SÍ puede
-- borrar auth.users, pero SOLO la fila del propio usuario que la invoca
-- (auth.uid(), tomado de su sesión — no se puede falsificar ni recibe un id
-- como parámetro). Al borrar auth.users, los "on delete cascade" de habits,
-- habit_logs y goals se encargan de borrar todo lo demás automáticamente.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;
