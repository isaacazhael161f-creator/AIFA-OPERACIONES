-- ================================================================
-- AIFA OPERACIONES — FIDS (Flight Information Display System)
-- Tabla de vuelos para el tablero de información de vuelos de respaldo
-- Ejecutar en el SQL Editor de Supabase
-- ================================================================

-- 1. TABLA PRINCIPAL
-- ================================================================
CREATE TABLE IF NOT EXISTS public.fids_vuelos (
  id             uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  fecha          date        NOT NULL DEFAULT CURRENT_DATE,
  tipo           varchar(10) NOT NULL DEFAULT 'llegada'
                             CHECK (tipo IN ('llegada', 'salida')),
  aerolinea      varchar(100) NOT NULL,
  codigo_iata    varchar(10),                 -- e.g. VB, AM, Y4, 4O
  numero_vuelo   varchar(20) NOT NULL,
  origen_destino varchar(100) NOT NULL,       -- Ciudad de origen (llegadas) o destino (salidas)
  hora_programada time        NOT NULL,
  hora_estimada  time,                        -- NULL = igual a programada
  hora_real      time,                        -- NULL = aún no aterriza/despega
  estado         varchar(50) NOT NULL DEFAULT 'A tiempo',
  puerta         varchar(20),
  terminal       varchar(20) DEFAULT 'T1',
  activo         boolean     NOT NULL DEFAULT true,
  orden          integer,                     -- control de orden en pantalla
  notas          text,
  created_by     uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by     uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- 2. ÍNDICES
-- ================================================================
CREATE INDEX IF NOT EXISTS fids_vuelos_fecha_idx  ON public.fids_vuelos(fecha);
CREATE INDEX IF NOT EXISTS fids_vuelos_tipo_idx   ON public.fids_vuelos(tipo);
CREATE INDEX IF NOT EXISTS fids_vuelos_activo_idx ON public.fids_vuelos(activo);

-- 3. TRIGGER: actualizar updated_at automáticamente
-- ================================================================
CREATE OR REPLACE FUNCTION public.fids_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS fids_vuelos_set_updated_at ON public.fids_vuelos;
CREATE TRIGGER fids_vuelos_set_updated_at
  BEFORE UPDATE ON public.fids_vuelos
  FOR EACH ROW EXECUTE FUNCTION public.fids_set_updated_at();

-- 4. HABILITAR RLS
-- ================================================================
ALTER TABLE public.fids_vuelos ENABLE ROW LEVEL SECURITY;

-- 4a. Lectura pública (para la pantalla FIDS visible en el aeropuerto)
CREATE POLICY "fids_public_select"
  ON public.fids_vuelos FOR SELECT
  TO anon, authenticated
  USING (activo = true);

-- 4b. Inserción solo para usuarios autenticados
CREATE POLICY "fids_auth_insert"
  ON public.fids_vuelos FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 4c. Actualización solo para usuarios autenticados
CREATE POLICY "fids_auth_update"
  ON public.fids_vuelos FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 4d. Eliminación (soft delete via activo=false) solo autenticados
CREATE POLICY "fids_auth_delete"
  ON public.fids_vuelos FOR DELETE
  TO authenticated
  USING (true);

-- 5. HABILITAR REALTIME (para actualizaciones en vivo en la pantalla)
-- ================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.fids_vuelos;

-- ================================================================
-- FIN DEL SCRIPT
-- Después de correrlo, importa vuelos desde la vista Admin del sistema
-- ================================================================
