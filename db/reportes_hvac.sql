-- ═══════════════════════════════════════════════════════════════════
--  TABLA: reportes_hvac
--  Bitácora de Reportes de Mantenimiento HVAC (sincronizada desde AppSheet
--  vía Google Sheets + Apps Script).
--  Ejecuta TODO este bloque en: Supabase → SQL Editor → Run
-- ═══════════════════════════════════════════════════════════════════

-- 1) Tabla -----------------------------------------------------------
create table if not exists public.reportes_hvac (
  pk                       bigserial primary key,
  reporte_id               text unique not null,     -- clave de negocio (AppSheet "Reporte ID")
  fecha                    date,
  quien_elabora            text,
  id_registro              text,                      -- columna "ID" de AppSheet
  modulo                   text,
  nivel                    text,
  equipo                   text,
  tag                      text,
  no_serie                 text,
  direccion_solicitante    text,
  subdireccion_solicitante text,
  gerencia_solicitante     text,
  motivo_atencion          text,
  revision                 text,
  mantenimiento            text,
  estado                   text,
  observaciones            text,
  firma                    text,
  updated_at               timestamptz default now()
);

-- 2) Row Level Security ----------------------------------------------
alter table public.reportes_hvac enable row level security;

-- Lectura para usuarios autenticados (dashboard)
drop policy if exists "hvac_select_auth" on public.reportes_hvac;
create policy "hvac_select_auth" on public.reportes_hvac
  for select to authenticated using (true);

-- Escritura/Upsert para el rol de servicio (Apps Script usa service_role key).
-- service_role omite RLS, pero dejamos una policy explícita por claridad.
drop policy if exists "hvac_write_auth" on public.reportes_hvac;
create policy "hvac_write_auth" on public.reportes_hvac
  for all to authenticated using (true) with check (true);

-- 3) Habilitar Realtime para esta tabla ------------------------------
--    (para que js/realtime.js reciba los postgres_changes)
alter publication supabase_realtime add table public.reportes_hvac;

-- 4) Índices útiles para las gráficas --------------------------------
create index if not exists idx_hvac_fecha  on public.reportes_hvac (fecha);
create index if not exists idx_hvac_estado on public.reportes_hvac (estado);
create index if not exists idx_hvac_equipo on public.reportes_hvac (equipo);
