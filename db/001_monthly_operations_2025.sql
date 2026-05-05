-- 001_monthly_operations_2025.sql
-- DDL y datos mensuales (2025) para la tabla monthly_operations
-- Ejecutar en Supabase -> Database -> SQL editor

CREATE TABLE IF NOT EXISTS monthly_operations (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  year INTEGER NOT NULL,
  month SMALLINT NOT NULL CHECK (month BETWEEN 1 AND 12),
  comercial_ops INTEGER DEFAULT 0,
  comercial_pax BIGINT DEFAULT 0,
  general_ops INTEGER DEFAULT 0,
  general_pax BIGINT DEFAULT 0,
  carga_ops INTEGER DEFAULT 0,
  carga_tons NUMERIC(14,2), -- Nullable para meses sin dato
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- Evita duplicados por año+mes
CREATE UNIQUE INDEX IF NOT EXISTS ux_monthly_operations_year_month ON monthly_operations (year, month);
CREATE INDEX IF NOT EXISTS idx_monthly_operations_year ON monthly_operations (year);

-- Inserts reales para 2025 (valores provistos).
-- Nota: se usa NULL para columnas donde no hay dato disponible (ej. mes 12 operaciones generales/peso).
INSERT INTO monthly_operations (year, month, comercial_ops, comercial_pax, general_ops, general_pax, carga_ops, carga_tons, updated_at)
VALUES
(2025, 1, 4488, 565716, 251, 2353, 880, 27764.47, now()),
(2025, 2, 4016, 488440, 242, 1348, 803, 26628.78, now()),
(2025, 3, 4426, 570097, 272, 1601, 916, 33154.97, now()),
(2025, 4, 4575, 621197, 249, 1840, 902, 30785.67, now()),
(2025, 5, 4443, 586299, 226, 1576, 1006, 34190.60, now()),
(2025, 6, 4129, 541400, 209, 3177, 1014, 37708.07, now()),
(2025, 7, 4430, 604758, 234, 1515, 1021, 35649.92, now()),
(2025, 8, 4500, 630952, 282, 3033, 1082, 35737.78, now()),
(2025, 9, 4135, 546457, 249, 948, 992, 31076.71, now()),
(2025, 10, 4291, 584629, 315, 1298, 1155, 37273.41, now()),
(2025, 11, 4458, 632853, 285, 1089, 1127, 38433.81, now()),
(2025, 12, NULL, 704718, NULL, NULL, NULL, NULL, now())
ON CONFLICT (year, month) DO UPDATE
  SET comercial_ops = COALESCE(EXCLUDED.comercial_ops, monthly_operations.comercial_ops),
      comercial_pax = COALESCE(EXCLUDED.comercial_pax, monthly_operations.comercial_pax),
      general_ops = COALESCE(EXCLUDED.general_ops, monthly_operations.general_ops),
      general_pax = COALESCE(EXCLUDED.general_pax, monthly_operations.general_pax),
      carga_ops = COALESCE(EXCLUDED.carga_ops, monthly_operations.carga_ops),
      carga_tons = COALESCE(EXCLUDED.carga_tons, monthly_operations.carga_tons),
      updated_at = now();

-- Fin del fichero
