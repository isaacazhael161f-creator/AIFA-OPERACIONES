-- ============================================================================
--  AIFA · Plano Interactivo — permisos mínimos para lectura anónima
--  Ejecutar en: Supabase → SQL Editor → New query → Run
--  Solo es necesario si al cargar el mapa aparece:
--  "Error al cargar desde Supabase — usando datos locales"
-- ============================================================================

-- Acceso de lectura para usuarios anónimos y autenticados
grant select on public.instalaciones         to anon, authenticated;
grant select on public.instalaciones_geojson to anon, authenticated;
grant select on public.categorias            to anon, authenticated;

-- Confirmar
select 'Permisos aplicados correctamente.' as resultado;
