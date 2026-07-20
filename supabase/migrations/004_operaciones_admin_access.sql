-- Funciones requeridas por la administración de AIFA Operaciones.
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
