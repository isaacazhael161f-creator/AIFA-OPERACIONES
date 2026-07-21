-- ============================================================================
-- AIFA-OPERACIONES · Endurecimiento de RLS (Row Level Security)
-- Ejecutar en: Supabase → SQL Editor.  Es IDEMPOTENTE (se puede re-ejecutar).
-- ----------------------------------------------------------------------------
-- PROBLEMA detectado (auditoría 2026-07-20):
--   ~54 tablas en 'public' tenían RLS DESACTIVADO y el rol 'anon' con permisos
--   totales (INSERT/UPDATE/DELETE/TRUNCATE). Cualquiera con la anon key podía
--   escribir o borrar datos operativos, manifiestos, médicos, usuarios, etc.
--
-- ESTRATEGIA (sin romper la app):
--   1) Revocar a 'anon' la ESCRITURA directa en todo el esquema. Importante:
--      TRUNCATE NO lo gobierna RLS, sólo el privilegio GRANT → hay que revocarlo.
--   2) Activar RLS + políticas. 'authenticated' conserva acceso (la app usa
--      sesión Supabase tras login), así que index.html sigue funcionando.
--   3) Catálogos/tablas de referencia: lectura pública (anon) + escritura auth.
--   4) Tablas operativas/sensibles: sólo 'authenticated'.
--   5) Las páginas públicas (FIDS, mapa) sólo leen 'flights' e 'instalaciones',
--      que YA tienen RLS → no se ven afectadas.
--
-- NOTA: spatial_ref_sys (tabla de sistema PostGIS) se OMITE a propósito.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- PASO 1 · Revocar ESCRITURA directa a 'anon' en todo public (incluye TRUNCATE).
--          Se conserva SELECT para 'anon' (páginas públicas de sólo lectura).
--          El loop ignora tablas sobre las que no se tenga privilegio (p.ej.
--          spatial_ref_sys), sin abortar el script.
-- ----------------------------------------------------------------------------
do $$
declare r record;
begin
  for r in select tablename from pg_tables where schemaname = 'public' loop
    begin
      execute format('revoke insert, update, delete, truncate on public.%I from anon', r.tablename);
    exception when others then
      raise notice 'Revoke omitido en %: %', r.tablename, sqlerrm;
    end;
  end loop;
end;
$$;

-- ----------------------------------------------------------------------------
-- PASO 2 · Helper idempotente: activa RLS y crea políticas estándar.
--   p_public_read = true  → SELECT para anon+authenticated (catálogos/display)
--   p_public_read = false → SELECT sólo authenticated (operativo/sensible)
--   Escritura (INSERT/UPDATE/DELETE) siempre sólo 'authenticated'.
--   Sólo toca sus propias políticas (rls_*); no elimina políticas existentes.
-- ----------------------------------------------------------------------------
create or replace function public._rls_apply(p_table text, p_public_read boolean)
returns void language plpgsql as $$
begin
  execute format('alter table public.%I enable row level security', p_table);

  execute format('drop policy if exists rls_sel on public.%I', p_table);
  if p_public_read then
    execute format('create policy rls_sel on public.%I for select to anon, authenticated using (true)', p_table);
  else
    execute format('create policy rls_sel on public.%I for select to authenticated using (true)', p_table);
  end if;

  execute format('drop policy if exists rls_ins on public.%I', p_table);
  execute format('create policy rls_ins on public.%I for insert to authenticated with check (true)', p_table);

  execute format('drop policy if exists rls_upd on public.%I', p_table);
  execute format('create policy rls_upd on public.%I for update to authenticated using (true) with check (true)', p_table);

  execute format('drop policy if exists rls_del on public.%I', p_table);
  execute format('create policy rls_del on public.%I for delete to authenticated using (true)', p_table);
end;
$$;

-- ----------------------------------------------------------------------------
-- PASO 3 · Aplicar por grupos.
-- ----------------------------------------------------------------------------
do $$
declare
  t text;

  -- Catálogos / referencia / display: lectura pública + escritura autenticada.
  public_read text[] := array[
    'aeropuertos','Paises','route_catalog','areas',
    'catalogo_aerolineas','catalogo_aeropuertos','catalogo_causas_demora',
    'catalogo_clase','catalogo_demoras','catalogo_destino','catalogo_especie',
    'catalogo_partes_avion',
    -- Ya tenían política de lectura pública (se preserva; sólo se activa RLS
    -- y se añade escritura autenticada donde faltaba):
    'airlines','Aerolíneas','fids_vuelos',
    'weekly_frequencies','weekly_frequencies_int','weekly_frequencies_cargo',
    'Manifiestos Junio 2026'
  ];

  -- Operativo / interno / sensible: sólo authenticated (sin anon).
  auth_only text[] := array[
    'Demoras','annual_operations','monthly_operations','parte_operations',
    'punctuality_stats','delays','weekly_flights_detailed',
    'Manifiestos','Base de datos Manifiestos 2025',
    'Base de Datos Manifiestos Febrero 2026','Base de Manifiestos Carga Febrero 2026',
    'Aerocares','Operadores Aerocares','Posiciones Aerocares',
    'fauna_reports','atencion_derrames','avance_anual_hectareas',
    'mantenimientos_electrogenos','reporte_pistas','personal_capacitado',
    'vehiculos_area_operacional','report_items','item_photos','reports','reportes_hvac',
    'biblioteca_tecnica_pdf',
    -- ⚠️ SENSIBLES (ver NOTAS al final para endurecer por rol tras probar):
    'medical_attentions','medical_directory','medical_types','valoraciones_medicas',
    'app_usuarios','app_roles','app_modulos',
    'instalaciones_geo_backup_20260608'
  ];
begin
  foreach t in array public_read loop perform public._rls_apply(t, true);  end loop;
  foreach t in array auth_only  loop perform public._rls_apply(t, false); end loop;
end;
$$;

-- ----------------------------------------------------------------------------
-- PASO 4 · Limpieza.
-- ----------------------------------------------------------------------------
drop function if exists public._rls_apply(text, boolean);

-- ----------------------------------------------------------------------------
-- VERIFICACIÓN (re-ejecutar para confirmar que no quedan tablas expuestas):
-- ----------------------------------------------------------------------------
-- select c.relname as tabla, c.relrowsecurity as rls
-- from pg_class c join pg_namespace n on n.oid=c.relnamespace
-- where n.nspname='public' and c.relkind='r' and not c.relrowsecurity
-- order by tabla;   -- Debe devolver sólo spatial_ref_sys (o vacío).

-- ============================================================================
-- NOTAS / ENDURECIMIENTO POSTERIOR (aplicar SÓLO tras validar en la app):
-- ----------------------------------------------------------------------------
-- 1) Tablas MÉDICAS: hoy quedan con lectura/escritura para cualquier usuario
--    autenticado. Para limitarlas a quienes acceden al módulo 'medicas'
--    (helper existente user_can_access_section), reemplazar sus políticas:
--
--    do $$ declare t text; begin
--      foreach t in array array['medical_attentions','medical_directory',
--        'medical_types','valoraciones_medicas'] loop
--        execute format('drop policy if exists rls_sel on public.%I', t);
--        execute format('create policy rls_sel on public.%I for select to authenticated using (public.user_can_access_section(''medicas''))', t);
--        execute format('drop policy if exists rls_ins on public.%I', t);
--        execute format('create policy rls_ins on public.%I for insert to authenticated with check (public.user_can_access_section(''medicas''))', t);
--        execute format('drop policy if exists rls_upd on public.%I', t);
--        execute format('create policy rls_upd on public.%I for update to authenticated using (public.user_can_access_section(''medicas'')) with check (public.user_can_access_section(''medicas''))', t);
--        execute format('drop policy if exists rls_del on public.%I', t);
--        execute format('create policy rls_del on public.%I for delete to authenticated using (public.user_can_access_section(''medicas''))', t);
--      end loop;
--    end $$;
--
-- 2) Tablas app_usuarios / app_roles / app_modulos: si NO las escribe la app
--    (la RBAC real vive en user_roles), limitar ESCRITURA a admin/superadmin:
--
--    do $$ declare t text; begin
--      foreach t in array array['app_usuarios','app_roles','app_modulos'] loop
--        execute format('drop policy if exists rls_ins on public.%I', t);
--        execute format('drop policy if exists rls_upd on public.%I', t);
--        execute format('drop policy if exists rls_del on public.%I', t);
--        execute format('create policy rls_wr on public.%I for all to authenticated using (exists (select 1 from public.user_roles ur where ur.user_id=auth.uid() and ur.role in (''admin'',''superadmin'''))) with check (exists (select 1 from public.user_roles ur where ur.user_id=auth.uid() and ur.role in (''admin'',''superadmin'''))) ', t);
--      end loop;
--    end $$;
--
-- 3) Manifiestos/Demoras: si NO deben ser legibles por todo autenticado, mover
--    a políticas por rol o por sección (user_can_access_section).
-- ============================================================================
