-- ============================================================================
--  PORTAL DE MANIFIESTOS · AIFA
--  Configuración de la tabla `perfiles` para el panel de Administración de
--  Usuarios.
--
--  ¿DÓNDE SE GUARDAN LOS USUARIOS?
--  Las cuentas (correo + contraseña) las administra **Supabase Auth** en la
--  tabla interna `auth.users`. Esa tabla NO se puede consultar ni modificar
--  directamente desde el navegador por seguridad. Por eso creamos una tabla
--  pública `perfiles` que refleja cada cuenta y guarda su ROL y ESTADO. El
--  portal lee y administra los usuarios desde `perfiles`.
--
--  CÓMO USAR: abre Supabase → SQL Editor → pega TODO este archivo → Run.
--  Solo se ejecuta una vez.
-- ============================================================================

-- 1) Tabla de perfiles (1 fila por cuenta de auth.users) -------------------
create table if not exists public.perfiles (
    id         uuid primary key references auth.users(id) on delete cascade,
    email      text,
    company    text,
    full_name  text,
    role       text        not null default 'aerolinea',  -- aerolinea | aifa | afac | admin
    activo     boolean     not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- 2) Poblar con los usuarios que YA existen -------------------------------
insert into public.perfiles (id, email, company, full_name, role)
select u.id,
       u.email,
       coalesce(u.raw_user_meta_data->>'company', ''),
       coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'company', ''),
       coalesce(nullif(u.raw_user_meta_data->>'role', ''), 'aerolinea')
from auth.users u
on conflict (id) do nothing;

-- 3) Disparador: crea el perfil automáticamente al registrarse -----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.perfiles (id, email, company, full_name, role)
    values (new.id,
            new.email,
            coalesce(new.raw_user_meta_data->>'company', ''),
            coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'company', ''),
            coalesce(nullif(new.raw_user_meta_data->>'role', ''), 'aerolinea'))
    on conflict (id) do nothing;
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

-- 4) Helper para saber si el usuario actual es admin (evita recursión RLS) --
create or replace function public.es_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
    select exists (
        select 1 from public.perfiles
        where id = auth.uid() and role = 'admin' and activo
    );
$$;

-- 5) Seguridad a nivel de fila (RLS) --------------------------------------
alter table public.perfiles enable row level security;

-- Cada usuario puede leer su propio perfil; los admins leen todos
drop policy if exists perfiles_select on public.perfiles;
create policy perfiles_select on public.perfiles
    for select using (auth.uid() = id or public.es_admin());

-- Solo los admins pueden modificar roles / estado
drop policy if exists perfiles_update on public.perfiles;
create policy perfiles_update on public.perfiles
    for update using (public.es_admin()) with check (public.es_admin());

-- Solo los admins pueden insertar manualmente (el disparador usa SECURITY DEFINER)
drop policy if exists perfiles_insert on public.perfiles;
create policy perfiles_insert on public.perfiles
    for insert with check (public.es_admin());

-- ============================================================================
--  6) IMPORTANTE — Promueve a tu PRIMER administrador
--     Ajusta el correo y ejecuta esta línea (sin ella nadie sería admin):
-- ============================================================================
-- update public.perfiles set role = 'admin' where email = 'tu-correo@aifa.operaciones';
