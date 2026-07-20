-- ============================================================
--  BUCKET: employee-photos
--  Fotos de empleados nombradas por número de empleado
--  Ejemplos: 1551.png, 1612.jpg, 1614.jpg
--  Ejecutar en: Supabase -> SQL Editor
-- ============================================================

-- 1. Crear el bucket público
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'employee-photos',
  'employee-photos',
  true,
  5242880,                              -- límite 5 MB por foto
  ARRAY['image/jpeg','image/png','image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 2. Lectura pública (cualquiera puede ver las fotos)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename  = 'objects'
      AND policyname = 'employee_photos_select_public'
  ) THEN
    CREATE POLICY "employee_photos_select_public"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'employee-photos');
  END IF;
END $$;

-- 3. Subida pública (anon y authenticated) — necesario para el script de carga masiva
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename  = 'objects'
      AND policyname = 'employee_photos_insert_auth'
  ) THEN
    CREATE POLICY "employee_photos_insert_auth"
      ON storage.objects FOR INSERT
      WITH CHECK (bucket_id = 'employee-photos');
  END IF;
END $$;

-- 4. Actualización sólo para usuarios autenticados
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename  = 'objects'
      AND policyname = 'employee_photos_update_auth'
  ) THEN
    CREATE POLICY "employee_photos_update_auth"
      ON storage.objects FOR UPDATE
      USING (
        bucket_id = 'employee-photos'
        AND auth.role() = 'authenticated'
      );
  END IF;
END $$;

-- 5. Eliminación sólo para usuarios autenticados
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename  = 'objects'
      AND policyname = 'employee_photos_delete_auth'
  ) THEN
    CREATE POLICY "employee_photos_delete_auth"
      ON storage.objects FOR DELETE
      USING (
        bucket_id = 'employee-photos'
        AND auth.role() = 'authenticated'
      );
  END IF;
END $$;

-- ============================================================
--  URL pública de una foto (referencia):
--  https://<PROJECT_REF>.supabase.co/storage/v1/object/public/employee-photos/1612.jpg
-- ============================================================
