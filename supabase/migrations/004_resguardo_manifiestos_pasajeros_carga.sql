-- Resguardo independiente de manifiestos por tipo de operación.
-- Ejecutar en Supabase SQL Editor (o con `supabase db push`).

CREATE TABLE IF NOT EXISTS public.manifiestos_pasajeros (
  id                    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  legacy_manifest_id    TEXT UNIQUE,
  direccion             TEXT NOT NULL CHECK (direccion IN ('llegada', 'salida')),
  tipo_manifesto        TEXT NOT NULL CHECK (tipo_manifesto IN ('Llegada PAX', 'Salida PAX')),
  fecha_vuelo           DATE NOT NULL,
  folio                 TEXT,
  aerolinea_codigo      TEXT,
  aerolinea_nombre      TEXT,
  numero_vuelo          TEXT NOT NULL,
  aeronave              TEXT,
  matricula             TEXT,
  aeropuerto_referencia TEXT,
  total_pasajeros       NUMERIC NOT NULL DEFAULT 0,
  total_equipaje_kg     NUMERIC NOT NULL DEFAULT 0,
  total_carga_kg        NUMERIC NOT NULL DEFAULT 0,
  total_correo_kg       NUMERIC NOT NULL DEFAULT 0,
  user_id               UUID,
  empresa               TEXT,
  estado                TEXT NOT NULL DEFAULT 'pendiente',
  datos                 JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.manifiestos_carga (
  id                    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  legacy_manifest_id    TEXT UNIQUE,
  direccion             TEXT NOT NULL CHECK (direccion IN ('llegada', 'salida')),
  tipo_manifesto        TEXT NOT NULL CHECK (tipo_manifesto IN ('Llegada Carga', 'Salida Carga')),
  fecha_vuelo           DATE NOT NULL,
  folio                 TEXT,
  aerolinea_codigo      TEXT,
  aerolinea_nombre      TEXT,
  numero_vuelo          TEXT NOT NULL,
  aeronave              TEXT,
  matricula             TEXT,
  aeropuerto_referencia TEXT,
  total_pasajeros       NUMERIC NOT NULL DEFAULT 0,
  total_equipaje_kg     NUMERIC NOT NULL DEFAULT 0,
  total_carga_kg        NUMERIC NOT NULL DEFAULT 0,
  total_correo_kg       NUMERIC NOT NULL DEFAULT 0,
  user_id               UUID,
  empresa               TEXT,
  estado                TEXT NOT NULL DEFAULT 'pendiente',
  datos                 JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- Compatibilidad: si las tablas fueron creadas anteriormente con menos
-- columnas, CREATE TABLE IF NOT EXISTS no las modifica. Estas sentencias
-- completan la estructura sin eliminar registros existentes.
ALTER TABLE public.manifiestos_pasajeros
  ADD COLUMN IF NOT EXISTS legacy_manifest_id    TEXT,
  ADD COLUMN IF NOT EXISTS direccion             TEXT,
  ADD COLUMN IF NOT EXISTS tipo_manifesto        TEXT,
  ADD COLUMN IF NOT EXISTS fecha_vuelo           DATE,
  ADD COLUMN IF NOT EXISTS folio                 TEXT,
  ADD COLUMN IF NOT EXISTS aerolinea_codigo      TEXT,
  ADD COLUMN IF NOT EXISTS aerolinea_nombre      TEXT,
  ADD COLUMN IF NOT EXISTS numero_vuelo          TEXT,
  ADD COLUMN IF NOT EXISTS aeronave              TEXT,
  ADD COLUMN IF NOT EXISTS matricula             TEXT,
  ADD COLUMN IF NOT EXISTS aeropuerto_referencia TEXT,
  ADD COLUMN IF NOT EXISTS total_pasajeros       NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_equipaje_kg     NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_carga_kg        NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_correo_kg       NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS user_id               UUID,
  ADD COLUMN IF NOT EXISTS empresa               TEXT,
  ADD COLUMN IF NOT EXISTS estado                TEXT DEFAULT 'pendiente',
  ADD COLUMN IF NOT EXISTS datos                 JSONB DEFAULT '{}'::jsonb;

ALTER TABLE public.manifiestos_carga
  ADD COLUMN IF NOT EXISTS legacy_manifest_id    TEXT,
  ADD COLUMN IF NOT EXISTS direccion             TEXT,
  ADD COLUMN IF NOT EXISTS tipo_manifesto        TEXT,
  ADD COLUMN IF NOT EXISTS fecha_vuelo           DATE,
  ADD COLUMN IF NOT EXISTS folio                 TEXT,
  ADD COLUMN IF NOT EXISTS aerolinea_codigo      TEXT,
  ADD COLUMN IF NOT EXISTS aerolinea_nombre      TEXT,
  ADD COLUMN IF NOT EXISTS numero_vuelo          TEXT,
  ADD COLUMN IF NOT EXISTS aeronave              TEXT,
  ADD COLUMN IF NOT EXISTS matricula             TEXT,
  ADD COLUMN IF NOT EXISTS aeropuerto_referencia TEXT,
  ADD COLUMN IF NOT EXISTS total_pasajeros       NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_equipaje_kg     NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_carga_kg        NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_correo_kg       NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS user_id               UUID,
  ADD COLUMN IF NOT EXISTS empresa               TEXT,
  ADD COLUMN IF NOT EXISTS estado                TEXT DEFAULT 'pendiente',
  ADD COLUMN IF NOT EXISTS datos                 JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_mp_direccion_fecha ON public.manifiestos_pasajeros (direccion, fecha_vuelo DESC);
CREATE INDEX IF NOT EXISTS idx_mc_direccion_fecha ON public.manifiestos_carga (direccion, fecha_vuelo DESC);
CREATE INDEX IF NOT EXISTS idx_mp_datos ON public.manifiestos_pasajeros USING GIN (datos);
CREATE INDEX IF NOT EXISTS idx_mc_datos ON public.manifiestos_carga USING GIN (datos);

ALTER TABLE public.manifiestos_pasajeros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manifiestos_carga ENABLE ROW LEVEL SECURITY;

-- El portal ya exige sesión para guardar y utiliza las tablas de conciliación
-- para las revisiones; estas políticas mantienen el mismo acceso autenticado.
DROP POLICY IF EXISTS "mp_select_authenticated" ON public.manifiestos_pasajeros;
DROP POLICY IF EXISTS "mp_insert_authenticated" ON public.manifiestos_pasajeros;
DROP POLICY IF EXISTS "mc_select_authenticated" ON public.manifiestos_carga;
DROP POLICY IF EXISTS "mc_insert_authenticated" ON public.manifiestos_carga;
CREATE POLICY "mp_select_authenticated" ON public.manifiestos_pasajeros
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "mp_insert_authenticated" ON public.manifiestos_pasajeros
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "mc_select_authenticated" ON public.manifiestos_carga
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "mc_insert_authenticated" ON public.manifiestos_carga
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
