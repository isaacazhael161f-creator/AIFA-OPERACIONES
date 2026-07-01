-- ============================================================
--  PORTAL DE MANIFIESTOS DIGITALES — AIFA
--  Adaptación para usar la tabla existente "Conciliación Manifiestos"
--  Ejecutar en Supabase SQL Editor
-- ============================================================

-- ──────────────────────────────────────────────────────────────
--  1. AÑADIR COLUMNAS DE PORTAL A "Conciliación Manifiestos"
--     Permiten al portal rastrear: quién capturó, estatus de
--     revisión AIFA, y fecha ISO para filtros del portal.
-- ──────────────────────────────────────────────────────────────
ALTER TABLE "Conciliación Manifiestos"
    ADD COLUMN IF NOT EXISTS "_portal_user_id"      UUID,
    ADD COLUMN IF NOT EXISTS "_portal_company"      TEXT,
    ADD COLUMN IF NOT EXISTS "_portal_flight_date"  DATE,
    ADD COLUMN IF NOT EXISTS "_portal_status"       TEXT DEFAULT 'pendiente',
    ADD COLUMN IF NOT EXISTS "_portal_review_notes" TEXT,
    ADD COLUMN IF NOT EXISTS "_portal_reviewed_by"  UUID,
    ADD COLUMN IF NOT EXISTS "_portal_reviewed_at"  TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS "_portal_created_at"   TIMESTAMPTZ DEFAULT NOW();

-- ──────────────────────────────────────────────────────────────
--  2. ÍNDICES PARA PERFORMANCE DEL PORTAL
-- ──────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_cm_portal_user
    ON "Conciliación Manifiestos" ("_portal_user_id");

CREATE INDEX IF NOT EXISTS idx_cm_portal_status
    ON "Conciliación Manifiestos" ("_portal_status");

CREATE INDEX IF NOT EXISTS idx_cm_portal_created
    ON "Conciliación Manifiestos" ("_portal_created_at" DESC);

CREATE INDEX IF NOT EXISTS idx_cm_portal_date
    ON "Conciliación Manifiestos" ("_portal_flight_date");

-- ──────────────────────────────────────────────────────────────
--  3. ROW LEVEL SECURITY
--     (Solo si no existen las políticas — usa DO $$ para evitar
--      error si ya estaban creadas.)
-- ──────────────────────────────────────────────────────────────
ALTER TABLE "Conciliación Manifiestos" ENABLE ROW LEVEL SECURITY;

-- Todos los autenticados pueden leer
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'Conciliación Manifiestos'
      AND policyname = 'cm_select_authenticated'
  ) THEN
    EXECUTE $p$
      CREATE POLICY cm_select_authenticated
      ON "Conciliación Manifiestos"
      FOR SELECT USING (auth.role() = 'authenticated');
    $p$;
  END IF;
END $$;

-- Solo prestadores autenticados pueden insertar
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'Conciliación Manifiestos'
      AND policyname = 'cm_insert_portal'
  ) THEN
    EXECUTE $p$
      CREATE POLICY cm_insert_portal
      ON "Conciliación Manifiestos"
      FOR INSERT WITH CHECK (auth.role() = 'authenticated');
    $p$;
  END IF;
END $$;

-- Usuarios autenticados pueden actualizar (admin usa esto para revisión)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'Conciliación Manifiestos'
      AND policyname = 'cm_update_authenticated'
  ) THEN
    EXECUTE $p$
      CREATE POLICY cm_update_authenticated
      ON "Conciliación Manifiestos"
      FOR UPDATE USING (auth.role() = 'authenticated');
    $p$;
  END IF;
END $$;

-- ──────────────────────────────────────────────────────────────
--  4. STORAGE BUCKET para PDFs (crea si no existe)
-- ──────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('manifiestos_pdfs', 'manifiestos_pdfs', true)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename  = 'objects'
      AND policyname = 'storage_upload_authenticated'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "storage_upload_authenticated"
      ON storage.objects FOR INSERT
      WITH CHECK (
        bucket_id = 'manifiestos_pdfs'
        AND auth.role() = 'authenticated'
      );
    $p$;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename  = 'objects'
      AND policyname = 'storage_select_public'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "storage_select_public"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'manifiestos_pdfs');
    $p$;
  END IF;
END $$;

-- ──────────────────────────────────────────────────────────────
--  5. VERIFICACIÓN
-- ──────────────────────────────────────────────────────────────
-- Confirmar columnas añadidas:
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'Conciliación Manifiestos'
--   AND column_name LIKE '_portal_%'
-- ORDER BY ordinal_position;

