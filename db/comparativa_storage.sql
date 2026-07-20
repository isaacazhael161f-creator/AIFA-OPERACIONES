-- Script para configurar el almacenamiento (Storage) para el PDF de Comparativa
-- Ejecuta este script en el Editor SQL de Supabase

-- 1. Crear el bucket 'comparativa' si no existe
INSERT INTO storage.buckets (id, name, public)
VALUES ('comparativa', 'comparativa', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Políticas de ACCESO (Lectura)
-- Permitir a CUALQUIERA ver los archivos
DROP POLICY IF EXISTS "Public Access Comparativa" ON storage.objects;
CREATE POLICY "Public Access Comparativa"
ON storage.objects FOR SELECT
USING ( bucket_id = 'comparativa' );

-- 3. Políticas de SUBIDA (Insert)
-- Permitir a usuarios AUTENTICADOS y ANONIMOS (por simplicidad en este caso, o restringir a authenticated si ya tienen auth) subir archivos
DROP POLICY IF EXISTS "Public Upload Comparativa" ON storage.objects;
CREATE POLICY "Public Upload Comparativa"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'comparativa' );

-- 4. Políticas de ACTUALIZACIÓN (Update)
DROP POLICY IF EXISTS "Public Update Comparativa" ON storage.objects;
CREATE POLICY "Public Update Comparativa"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'comparativa' );

-- 5. Políticas de ELIMINACIÓN (Delete)
DROP POLICY IF EXISTS "Public Delete Comparativa" ON storage.objects;
CREATE POLICY "Public Delete Comparativa"
ON storage.objects FOR DELETE
USING ( bucket_id = 'comparativa' );
