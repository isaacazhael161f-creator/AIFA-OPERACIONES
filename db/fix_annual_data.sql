-- Script de corrección para datos anuales
-- Copia y pega todo este contenido en el SQL Editor de Supabase y ejecútalo.

-- 1. Asegurar que la tabla existe
CREATE TABLE IF NOT EXISTS annual_operations (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  year INTEGER NOT NULL UNIQUE,
  comercial_ops_total BIGINT DEFAULT 0,
  comercial_pax_total BIGINT DEFAULT 0,
  general_ops_total BIGINT DEFAULT 0,
  general_pax_total BIGINT DEFAULT 0,
  carga_ops_total BIGINT DEFAULT 0,
  carga_tons_total NUMERIC(18,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- 2. Configurar permisos (RLS) para asegurar que la app pueda leer los datos
ALTER TABLE annual_operations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lectura publica annual_operations" ON annual_operations;
CREATE POLICY "Lectura publica annual_operations" ON annual_operations FOR SELECT USING (true);

-- 3. Insertar los datos históricos (2022-2025)
INSERT INTO annual_operations (year, comercial_ops_total, comercial_pax_total, general_ops_total, general_pax_total, carga_ops_total, carga_tons_total, updated_at)
VALUES
(2022, 8996, 912415, 458, 1385, 8, 5.19, now()),
(2023, 23211, 2631261, 2212, 8160, 5578, 186319.83, now()),
(2024, 51734, 6318454, 2777, 29637, 13219, 447341.17, now()),
(2025, 49160, 6547109, 2891, 20577, 11168, 377761.43, now())
ON CONFLICT (year) DO UPDATE
  SET comercial_ops_total = EXCLUDED.comercial_ops_total,
      comercial_pax_total = EXCLUDED.comercial_pax_total,
      general_ops_total = EXCLUDED.general_ops_total,
      general_pax_total = EXCLUDED.general_pax_total,
      carga_ops_total = EXCLUDED.carga_ops_total,
      carga_tons_total = EXCLUDED.carga_tons_total,
      updated_at = now();

-- 4. Verificar los datos insertados
SELECT * FROM annual_operations ORDER BY year DESC;
