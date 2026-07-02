-- ============================================================================
--  PORTAL DE MANIFIESTOS · AIFA
--  Tabla `perfiles` para el panel de Administración de Usuarios DEL PORTAL.
--
--  ¿DÓNDE SE GUARDAN LOS USUARIOS?
--  Todas las cuentas (correo + contraseña) las administra **Supabase Auth** en
--  la tabla interna `auth.users`. El aplicativo "AIFA Operaciones" y el "Portal
--  de Manifiestos" comparten ese mismo `auth.users`.
--
--  SEPARACIÓN DE USUARIOS
--  Para que NO se revuelvan los usuarios internos de AIFA Operaciones con los
--  prestadores (aerolíneas) del portal, la tabla `perfiles` guarda ÚNICAMENTE
--  a los usuarios DEL PORTAL. Los usuarios internos de Operaciones siguen en su
--  propia tabla `user_roles` y NO aparecen en el panel del portal.
--
--    · Usuario de PORTAL      -> tiene `company` (o `role`/`app`) en metadatos.
--    · Usuario de OPERACIONES  -> solo tiene `full_name`; vive en `user_roles`.
--
--  CÓMO USAR: abre Supabase -> SQL Editor -> pega TODO este archivo -> Run.
--  Es seguro ejecutarlo varias veces (idempotente).
-- ============================================================================

-- 1) Tabla de perfiles (solo usuarios del portal) --------------------------
create table if not exists public.perfiles (
    id         uuid primary key references auth.users(id) on delete cascade,
    email      text,
    company    text,
    full_name  text,
    role       text        not null default 'aerolinea',  -- aerolinea | aifa | afac | admin
    activo     boolean     not null default true,
    origen     text        not null default 'portal',      -- siempre 'portal'
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Si la tabla ya existía sin la columna `origen`, la agregamos.
alter table public.perfiles add column if not exists origen text not null default 'portal';

-- 2) Poblar SOLO con los usuarios del portal que ya existen ----------------
--    (los que tienen company / role / app en sus metadatos de Auth)
insert into public.perfiles (id, email, company, full_name, role, origen)
select u.id,
       u.email,
       coalesce(u.raw_user_meta_data->>'company', ''),
       coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'company', ''),
       coalesce(nullif(u.raw_user_meta_data->>'role', ''), 'aerolinea'),
       'portal'
from auth.users u
where coalesce(u.raw_user_meta_data->>'app','') = 'portal'
   or coalesce(u.raw_user_meta_data->>'company','') <> ''
   or coalesce(u.raw_user_meta_data->>'role','') in ('aerolinea','aifa','afac','admin')
on conflict (id) do nothing;

-- 3) LIMPIEZA — quitar de `perfiles` a los usuarios INTERNOS de Operaciones
--    que una versión anterior de este script pudo haber insertado.
--    Solo borra filas "aerolinea" sin datos de portal; conserva cualquier
--    cuenta que ya hayas promovido manualmente (admin/aifa/afac).
delete from public.perfiles p
using auth.users u
where p.id = u.id
  and coalesce(p.role, 'aerolinea') = 'aerolinea'
  and coalesce(u.raw_user_meta_data->>'app','') <> 'portal'
  and coalesce(u.raw_user_meta_data->>'company','') = ''
  and coalesce(u.raw_user_meta_data->>'role','') not in ('aerolinea','aifa','afac','admin');

-- 4) Disparador: crea el perfil automáticamente SOLO para usuarios del portal
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    -- Solo se registra en `perfiles` si el alta viene del portal
    if coalesce(new.raw_user_meta_data->>'app','') = 'portal'
       or coalesce(new.raw_user_meta_data->>'company','') <> ''
       or coalesce(new.raw_user_meta_data->>'role','') in ('aerolinea','aifa','afac','admin')
    then
        insert into public.perfiles (id, email, company, full_name, role, origen)
        values (new.id,
                new.email,
                coalesce(new.raw_user_meta_data->>'company', ''),
                coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'company', ''),
                coalesce(nullif(new.raw_user_meta_data->>'role', ''), 'aerolinea'),
                'portal')
        on conflict (id) do nothing;
    end if;
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

-- 5) Helper para saber si el usuario actual es admin (evita recursión RLS) --
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

-- 6) Seguridad a nivel de fila (RLS) --------------------------------------
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
--  7) IMPORTANTE — Promueve a tu PRIMER administrador del PORTAL
--     Ajusta el correo y ejecuta esta línea (sin ella nadie sería admin):
-- ============================================================================
-- update public.perfiles set role = 'admin' where email = 'tu-correo@aifa.operaciones';
