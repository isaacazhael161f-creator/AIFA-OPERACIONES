-- Persistencia del detalle del manifiesto de salida digital.
-- Guarda las filas dinámicas de embarque y sus totales en el registro existente.
ALTER TABLE "Conciliación Manifiestos"
  ADD COLUMN IF NOT EXISTS "_portal_manifest_data" JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_cm_portal_manifest_data
  ON "Conciliación Manifiestos" USING GIN ("_portal_manifest_data");
