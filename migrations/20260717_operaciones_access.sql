-- AIFA Operaciones: aislamiento de acceso por aplicativo.
-- No crea filas al registrar usuarios. La asignación histórica se hace una sola vez abajo.

create unique index if not exists usuarios_aplicaciones_usuario_app_uq
  on public.usuarios_aplicaciones (usuario_id, aplicacion_id);

create or replace function public.has_operaciones_access(p_user_id uuid default auth.uid())
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.usuarios_aplicaciones ua
    join public.aplicaciones a on a.id = ua.aplicacion_id
    where ua.usuario_id = p_user_id
      and a.clave = 'OPERACIONES'
      and ua.estado = 'ACTIVO'
  ) or exists (
    select 1 from public.user_roles ur
    where ur.user_id = p_user_id
      and lower(ur.role) in ('superuser', 'superadmin')
  );
$$;

revoke all on function public.has_operaciones_access(uuid) from public;
grant execute on function public.has_operaciones_access(uuid) to authenticated;

alter table public.usuarios_aplicaciones enable row level security;
drop policy if exists "usuarios_aplicaciones_self_operaciones" on public.usuarios_aplicaciones;
create policy "usuarios_aplicaciones_self_operaciones"
  on public.usuarios_aplicaciones for select to authenticated
  using (usuario_id = auth.uid());

-- Conserva el acceso de usuarios que ya tenían identidad interna en esta aplicación.
-- No incluye altas futuras ni usuarios creados desde MHR sin asignación explícita.
-- No hacer INSERT automático desde user_roles: esa tabla también contiene usuarios de MHR.
-- La asignación histórica debe hacerse únicamente con UUIDs aprobados explícitamente.

comment on function public.has_operaciones_access(uuid) is
  'Guardia central de AIFA Operaciones; roles normales salen exclusivamente de usuarios_aplicaciones.';

create or replace function public.admin_list_operaciones_user_ids()
returns table(user_id uuid)
language sql stable security definer set search_path = public, auth
as $$
  select distinct u.id
  from auth.users u
  where exists (
    select 1 from public.usuarios_aplicaciones ua
    join public.aplicaciones a on a.id = ua.aplicacion_id
    where ua.usuario_id = u.id and a.clave = 'OPERACIONES' and ua.estado = 'ACTIVO'
  ) or exists (
    select 1 from public.user_roles ur
    where ur.user_id = u.id and lower(ur.role) in ('superuser', 'superadmin')
  );
$$;
revoke all on function public.admin_list_operaciones_user_ids() from public;
grant execute on function public.admin_list_operaciones_user_ids() to authenticated;

create or replace function public.admin_assign_operaciones_access(
  p_user_id uuid, p_role text, p_permissions jsonb default '{}'::jsonb
) returns void language plpgsql security definer set search_path = public
as $$
declare app_id uuid;
begin
  select id into app_id from public.aplicaciones where clave = 'OPERACIONES' limit 1;
  if app_id is null then raise exception 'Aplicación OPERACIONES no existe'; end if;
  insert into public.usuarios_aplicaciones(usuario_id, aplicacion_id, rol, permisos, estado)
  values (p_user_id, app_id, p_role, coalesce(p_permissions, '{}'::jsonb), 'ACTIVO')
  on conflict (usuario_id, aplicacion_id) do update
    set rol = excluded.rol, permisos = excluded.permisos, estado = 'ACTIVO';
end; $$;
revoke all on function public.admin_assign_operaciones_access(uuid, text, jsonb) from public;
grant execute on function public.admin_assign_operaciones_access(uuid, text, jsonb) to authenticated;
