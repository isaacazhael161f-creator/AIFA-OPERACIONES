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

-- 1c. Datos detallados del formato digital. Conserva los campos que no
-- caben en las columnas de conciliación: origen, horarios de salida,
-- desglose nacional/internacional, PAX DNI y embarque por estación.
ALTER TABLE "Conciliación Manifiestos"
    ADD COLUMN IF NOT EXISTS "_portal_manifest_data" JSONB NOT NULL DEFAULT '{}'::jsonb;

-- ──────────────────────────────────────────────────────────────
--  1b. DOBLE APROBACIÓN — AIFA (aeropuerto) + AFAC (autoridad)
--     Un manifiesto queda APROBADO solo cuando ambas partes aprueban.
--     El campo "_portal_status" es el estatus GENERAL derivado:
--       · rechazado  → si cualquiera rechaza
--       · aprobado   → si AMBOS aprueban
--       · en_revision→ si una parte ya aprobó   falta la otra
--       · pendiente  → sin revisiones
-- ──────────────────────────────────────────────────────────────
ALTER TABLE "Conciliación Manifiestos"
    -- Aprobación AIFA (aeropuerto)
    ADD COLUMN IF NOT EXISTS "_portal_aprob_aifa"   TEXT DEFAULT 'pendiente',
    ADD COLUMN IF NOT EXISTS "_portal_aifa_by"      UUID,
    ADD COLUMN IF NOT EXISTS "_portal_aifa_by_name" TEXT,
    ADD COLUMN IF NOT EXISTS "_portal_aifa_at"      TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS "_portal_aifa_notes"   TEXT,
    -- Aprobación AFAC (autoridad aeronáutica)
    ADD COLUMN IF NOT EXISTS "_portal_aprob_afac"   TEXT DEFAULT 'pendiente',
    ADD COLUMN IF NOT EXISTS "_portal_afac_by"      UUID,
    ADD COLUMN IF NOT EXISTS "_portal_afac_by_name" TEXT,
    ADD COLUMN IF NOT EXISTS "_portal_afac_at"      TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS "_portal_afac_notes"   TEXT;

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

CREATE INDEX IF NOT EXISTS idx_cm_portal_manifest_data
    ON "Conciliación Manifiestos" USING GIN ("_portal_manifest_data");

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
--  6. ROLES Y CREACIÓN DE USUARIOS
-- ──────────────────────────────────────────────────────────────
--  El portal maneja 4 roles, identificados por "role" en el
--  User Metadata (raw_user_meta_data) del usuario en Supabase Auth:
--
--    · aerolinea → captura manifiestos (se auto-registran en el portal)
--    · aifa      → aprueba por parte del AEROPUERTO (AIFA)
--    · afac      → aprueba por parte de la AUTORIDAD (AFAC)
--    · admin     → superusuario: puede aprobar por AIFA y por AFAC
--
--  AEROLÍNEAS: se crean SOLAS desde el portal (botón "Crear cuenta").
--  Se registran siempre con role='aerolinea'.
--
--  AIFA / AFAC / ADMIN: se crean manualmente en el dashboard de
--  Supabase → Authentication → Users → Add user. En "User Metadata"
--  (JSON) agrega, por ejemplo:
--       { "role": "aifa",  "full_name": "Operaciones AIFA" }
--       { "role": "afac",  "full_name": "Autoridad AFAC" }
--       { "role": "admin", "full_name": "Administrador" }
--
--  También se reconoce el rol por el correo si contiene:
--       "afac"  → autoridad AFAC
--       "aifa.admin" o "admin@" → AIFA / admin
--
--  Para asignar/actualizar el rol de un usuario ya existente por SQL:
--
--  UPDATE auth.users
--     SET raw_user_meta_data =
--         COALESCE(raw_user_meta_data, '{}'::jsonb)
--         || '{"role":"afac","full_name":"Autoridad AFAC"}'::jsonb
--   WHERE email = 'afac@aifa.operaciones';
-- ──────────────────────────────────────────────────────────────
