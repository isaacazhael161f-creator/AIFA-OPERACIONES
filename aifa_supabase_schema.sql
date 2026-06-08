-- ============================================================================
--  AIFA · Plano Interactivo de Instalaciones
--  Esquema Supabase  (PostgreSQL + PostGIS)
--  ---------------------------------------------------------------------------
--  Cómo usarlo:  Supabase → SQL Editor → New query → pega TODO esto → Run.
--
--  Crea:
--    • Extensión PostGIS (geometría espacial real).
--    • Catálogo de categorías (con su color para el mapa).
--    • Tabla principal "instalaciones" con geometría (punto o zona),
--      atributos operativos completos, lat/lng derivadas e índices.
--    • Trigger de updated_at, políticas RLS y una VISTA GeoJSON lista para
--      consumir directo desde el mapa Leaflet (L.geoJSON).
--
--  Mapeo con el JSON del plano:
--    clave        ← "id"        |  etiqueta ← "n"     |  categoria ← "cat"
--    tipo         ← "tipo"      |  estado   ← "estado"|  descripcion ← "desc"
--    datos_clave  ← "datos"     |  geom     ← "coords"
-- ============================================================================


-- 1) EXTENSIONES --------------------------------------------------------------
create extension if not exists postgis;     -- soporte geoespacial (tipo geometry)
-- gen_random_uuid() ya viene en PostgreSQL 13+ (Supabase lo incluye).


-- 2) CATÁLOGO DE CATEGORÍAS ---------------------------------------------------
create table if not exists public.categorias (
  clave   text primary key,                  -- 'operacion', 'terminal', ...
  nombre  text not null,                      -- etiqueta visible
  color   text not null default '#38bdf8',    -- color HEX usado en el mapa
  orden   int  not null default 0
);

insert into public.categorias (clave, nombre, color, orden) values
  ('operacion', 'Operación aérea',                  '#38bdf8', 1),
  ('terminal',  'Terminal y pasajeros',             '#fbbf24', 2),
  ('carga',     'Carga y logística',                '#a855f7', 3),
  ('servicios', 'Servicios e infraestructura',      '#22c55e', 4),
  ('comercial', 'Comercial / Ciudad aeroportuaria', '#ec4899', 5),
  ('militar',   'Zona militar (FAM / SEDENA)',       '#ef4444', 6),
  ('accesos',   'Accesos y vialidad',               '#f97316', 7)
on conflict (clave) do update
  set nombre = excluded.nombre,
      color  = excluded.color,
      orden  = excluded.orden;


-- 3) TABLA PRINCIPAL: INSTALACIONES ------------------------------------------
create table if not exists public.instalaciones (
  id             uuid primary key default gen_random_uuid(),
  clave          text unique not null,         -- id estable / slug  (mapa: "id")
  etiqueta       text,                          -- número del plano: '1','7a','A','★'
  nombre         text not null,
  nombre_corto   text,

  categoria      text not null
                   references public.categorias(clave) on update cascade,
  tipo           text not null default 'punto'
                   check (tipo in ('punto','zona')),
  estado         text not null default 'operativo'
                   check (estado in ('operativo','construccion','proyecto',
                                     'mantenimiento','cerrado','restringido')),
  nivel_acceso   text not null default 'publico'
                   check (nivel_acceso in ('publico','restringido','privado','militar')),
  lado           text check (lado in ('aire','tierra','mixto')),

  descripcion    text,
  datos_clave    jsonb   not null default '[]'::jsonb,   -- [["Campo","Valor"], ...]
  etiquetas      text[]  not null default '{}',          -- tags libres

  -- Presentación en el mapa
  color          text,                          -- HEX opcional (sobrescribe categoría)
  icono          text,                          -- nombre de icono opcional
  visible        boolean not null default true,
  orden          int     not null default 0,

  -- Atributos operativos (todos opcionales)
  superficie_m2     numeric,
  capacidad         text,
  responsable       text,
  area_responsable  text,
  telefono          text,
  horario           text,
  fotos             text[] not null default '{}',
  url_referencia    text,
  notas             text,

  -- Geometría: Point (para 'punto') o Polygon (para 'zona'), WGS84 / EPSG:4326
  geom           geometry(Geometry, 4326),

  -- Latitud / longitud derivadas (solo puntos) — cómodas para consultar/filtrar
  lat double precision generated always as
        (case when geom is not null and geometrytype(geom) = 'POINT'
              then st_y(geom) end) stored,
  lng double precision generated always as
        (case when geom is not null and geometrytype(geom) = 'POINT'
              then st_x(geom) end) stored,

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

comment on table public.instalaciones is
  'Instalaciones del AIFA para el plano interactivo. geom: Point (punto) o Polygon (zona) en EPSG:4326.';


-- 4) ÍNDICES ------------------------------------------------------------------
create index if not exists instalaciones_geom_gix      on public.instalaciones using gist (geom);
create index if not exists instalaciones_categoria_ix  on public.instalaciones (categoria);
create index if not exists instalaciones_tipo_ix       on public.instalaciones (tipo);
create index if not exists instalaciones_visible_ix    on public.instalaciones (visible);


-- 5) TRIGGER: mantener updated_at --------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_instalaciones_updated on public.instalaciones;
create trigger trg_instalaciones_updated
  before update on public.instalaciones
  for each row execute function public.set_updated_at();


-- 6) SEGURIDAD A NIVEL DE FILA (RLS) -----------------------------------------
--    Supabase exige políticas explícitas. Ajusta a tu modelo de autenticación.
alter table public.instalaciones enable row level security;
alter table public.categorias    enable row level security;

-- Lectura pública (anon + autenticados). Si el plano es interno, cambia
-- 'using (true)' por la condición de tu auth (p. ej. auth.role() = 'authenticated').
drop policy if exists "lectura publica instalaciones" on public.instalaciones;
create policy "lectura publica instalaciones"
  on public.instalaciones for select using (true);

drop policy if exists "lectura publica categorias" on public.categorias;
create policy "lectura publica categorias"
  on public.categorias for select using (true);

-- Escritura (insert / update / delete) solo para usuarios autenticados.
drop policy if exists "escritura autenticados" on public.instalaciones;
create policy "escritura autenticados"
  on public.instalaciones for all
  to authenticated
  using (true) with check (true);


-- 7) VISTA GeoJSON  (FeatureCollection lista para Leaflet) -------------------
--    Uso desde el cliente:  select geojson from public.instalaciones_geojson;
create or replace view public.instalaciones_geojson as
select jsonb_build_object(
  'type', 'FeatureCollection',
  'features', coalesce(jsonb_agg(
    jsonb_build_object(
      'type', 'Feature',
      'geometry', st_asgeojson(i.geom)::jsonb,
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
) as geojson
from public.instalaciones i
where i.visible is true;


-- 8) FUNCIÓN DE AYUDA: upsert de un punto por clave (lat/lng) -----------------
create or replace function public.upsert_punto(
  p_clave text, p_nombre text, p_categoria text,
  p_lat double precision, p_lng double precision,
  p_etiqueta text default null, p_descripcion text default null,
  p_datos jsonb default '[]'::jsonb
) returns uuid language plpgsql as $$
declare v_id uuid;
begin
  insert into public.instalaciones
    (clave, nombre, categoria, tipo, etiqueta, descripcion, datos_clave, geom)
  values
    (p_clave, p_nombre, p_categoria, 'punto', p_etiqueta, p_descripcion, p_datos,
     st_setsrid(st_makepoint(p_lng, p_lat), 4326))
  on conflict (clave) do update
     set nombre = excluded.nombre, categoria = excluded.categoria,
         etiqueta = excluded.etiqueta, descripcion = excluded.descripcion,
         datos_clave = excluded.datos_clave, geom = excluded.geom
  returning id into v_id;
  return v_id;
end;
$$;


-- 9) EJEMPLOS (puedes borrarlos) ---------------------------------------------
-- Punto (torre de control). OJO: st_makepoint recibe (lng, lat):
insert into public.instalaciones
  (clave, etiqueta, nombre, categoria, tipo, estado, descripcion, geom)
values
  ('torre-control', '1', 'Torre de control de tráfico aéreo', 'operacion', 'punto',
   'operativo', 'Control de tránsito aéreo del aeródromo.',
   st_setsrid(st_makepoint(-99.0148, 19.7452), 4326))
on conflict (clave) do nothing;

-- Zona (edificio terminal): polígono cerrado (el último vértice repite el primero):
insert into public.instalaciones
  (clave, etiqueta, nombre, categoria, tipo, estado, descripcion, geom)
values
  ('terminal-pasajeros', '6', 'Edificio terminal de pasajeros', 'terminal', 'zona',
   'operativo', 'Terminal principal de pasajeros.',
   st_setsrid(st_geomfromtext(
     'POLYGON((-99.0168 19.7468, -99.0148 19.7468, -99.0148 19.7452, -99.0168 19.7452, -99.0168 19.7468))'
   ), 4326))
on conflict (clave) do nothing;

-- Prueba final:
--   select clave, nombre, tipo, lat, lng from public.instalaciones order by orden;
--   select geojson from public.instalaciones_geojson;
