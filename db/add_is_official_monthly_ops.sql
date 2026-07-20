-- Añadir columna is_official a monthly_operations
-- TRUE  = Cifras oficiales/definitivas (publicadas por AFAC u organismo oficial)
-- FALSE = Cifras preliminares (mes en curso, suma de registros diarios)

ALTER TABLE monthly_operations
  ADD COLUMN IF NOT EXISTS is_official BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN monthly_operations.is_official IS
  'TRUE = cifras oficiales cerradas. FALSE = cifras preliminares (acumulado diario o pendiente de confirmar).';

-- Marcar el mes en curso (Junio 2026) como preliminar si ya existe un registro:
-- UPDATE monthly_operations SET is_official = FALSE WHERE year = 2026 AND month = 6;
