-- ============================================================================
--  AIFA · Plano Interactivo — funciones RPC para lectura y escritura
--  Ejecutar en Supabase → SQL Editor DESPUÉS de haber corrido
--  aifa_supabase_schema.sql (que crea la tabla instalaciones).
-- ============================================================================

-- 1) LEER TODAS LAS INSTALACIONES COMO GEOJSON (incluyendo hidden=false)
--    Uso (cliente JS):  await sb.rpc('get_all_instalaciones_geojson')
-- ----------------------------------------------------------------------------
create or replace function public.get_all_instalaciones_geojson()
returns jsonb language sql stable security invoker as $$
  select jsonb_build_object(
    'type', 'FeatureCollection',
    'features', coalesce(jsonb_agg(
      jsonb_build_object(
        'type',     'Feature',
        'geometry', case when i.geom is not null then st_asgeojson(i.geom)::jsonb else null end,
        'properties', jsonb_build_object(
          'id',           i.clave,
          'etiqueta',     i.etiqueta,
          'nombre',       i.nombre,
          'nombre_corto', i.nombre_corto,
          'categoria',    i.categoria,
          'tipo',         i.tipo,
          'estado',       i.estado,
          'nivel_acceso', i.nivel_acceso,
          'lado',         i.lado,
          'descripcion',  i.descripcion,
          'datos_clave',  i.datos_clave,
          'color',        i.color,
          'visible',      i.visible
        )
      )
    ), '[]'::jsonb)
  )
  from public.instalaciones i;
$$;

-- Lectura anónima permitida (el plano es público)
grant execute on function public.get_all_instalaciones_geojson() to anon, authenticated;

-- Asegura también el acceso a la vista del esquema base
grant select on public.instalaciones_geojson to anon, authenticated;
grant select on public.instalaciones         to anon, authenticated;
grant select on public.categorias            to anon, authenticated;


-- 2) UPSERT DE UNA INSTALACIÓN (punto o zona) usando GeoJSON como texto
--    Uso (cliente JS):
--      await sb.rpc('upsert_instalacion', {
--        p_clave: 'torre-control', p_nombre: '...', p_categoria: 'operacion',
--        p_tipo: 'punto', p_geojson_geom: '{"type":"Point","coordinates":[-99.01,19.74]}',
--        ...
--      })
-- ----------------------------------------------------------------------------
create or replace function public.upsert_instalacion(
  p_clave        text,
  p_nombre       text,
  p_categoria    text,
  p_tipo         text,
  p_geojson_geom text,                          -- GeoJSON geometry como string
  p_etiqueta     text    default null,
  p_nombre_corto text    default null,
  p_estado       text    default 'operativo',
  p_nivel_acceso text    default 'publico',
  p_lado         text    default null,
  p_descripcion  text    default null,
  p_datos_clave  text    default '[]',        -- JSON string; se castea a jsonb dentro
  p_color        text    default null,
  p_visible      boolean default true
) returns uuid language plpgsql security definer as $$
declare
  v_id uuid;
  v_geom geometry;
begin
  -- Parsear geometría; si el string es nulo/vacío deja geom como NULL
  if p_geojson_geom is not null and trim(p_geojson_geom) <> '' then
    v_geom := st_setsrid(st_geomfromgeojson(p_geojson_geom), 4326);
  end if;

  insert into public.instalaciones
    (clave, nombre, categoria, tipo, etiqueta, nombre_corto, estado,
     nivel_acceso, lado, descripcion, datos_clave, color, visible, geom)
  values
    (p_clave, p_nombre, p_categoria, p_tipo, p_etiqueta, p_nombre_corto, p_estado,
     p_nivel_acceso, p_lado, p_descripcion, coalesce(p_datos_clave,'[]')::jsonb, p_color, p_visible, v_geom)
  on conflict (clave) do update set
    nombre       = excluded.nombre,
    categoria    = excluded.categoria,
    tipo         = excluded.tipo,
    etiqueta     = excluded.etiqueta,
    nombre_corto = excluded.nombre_corto,
    estado       = excluded.estado,
    nivel_acceso = excluded.nivel_acceso,
    lado         = excluded.lado,
    descripcion  = excluded.descripcion,
    datos_clave  = coalesce(excluded.datos_clave, '[]'),
    color        = excluded.color,
    visible      = excluded.visible,
    geom         = excluded.geom
  returning id into v_id;

  return v_id;
end;
$$;

-- Solo usuarios autenticados pueden escribir
grant execute on function public.upsert_instalacion(
  text, text, text, text, text, text, text, text, text, text, text, text, text, boolean
) to anon, authenticated;


-- 3) ELIMINAR UNA INSTALACIÓN POR CLAVE (security definer → evita RLS para anon)
-- ---------------------------------------------------------------------------
create or replace function public.delete_instalacion(p_clave text)
returns void language plpgsql security definer as $$
begin
  delete from public.instalaciones where clave = p_clave;
end;
$$;

grant execute on function public.delete_instalacion(text) to anon, authenticated;


-- 3) POLÍTICA DELETE (complementa la política "escritura autenticados" ya existente)
--    Si ya existe "escritura autenticados" con "for all", esto es redundante pero seguro.
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'instalaciones'
      and policyname = 'eliminar autenticados'
  ) then
    execute $pol$
      create policy "eliminar autenticados"
        on public.instalaciones for delete
        to authenticated
        using (true);
    $pol$;
  end if;
end $$;
