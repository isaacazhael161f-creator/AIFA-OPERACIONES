-- 002_annual_operations_real.sql
-- DDL y datos anuales reales para annual_operations
-- Ejecutar en Supabase -> Database -> SQL editor

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

CREATE INDEX IF NOT EXISTS idx_annual_operations_year ON annual_operations (year);

-- Inserts/Upsert con los totales reales (2022-2025)
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

-- Opcional: vista que calcula los totales desde monthly_operations (si prefieres no persistir)
CREATE OR REPLACE VIEW view_annual_operations_from_monthly AS
SELECT
  year,
  SUM(COALESCE(comercial_ops,0))::bigint AS comercial_ops_total,
  SUM(COALESCE(comercial_pax,0))::bigint AS comercial_pax_total,
  SUM(COALESCE(general_ops,0))::bigint AS general_ops_total,
  SUM(COALESCE(general_pax,0))::bigint AS general_pax_total,
  SUM(COALESCE(carga_ops,0))::bigint AS carga_ops_total,
  SUM(COALESCE(carga_tons,0))::numeric(18,2) AS carga_tons_total
FROM monthly_operations
GROUP BY year
ORDER BY year DESC;

-- Fin del fichero
