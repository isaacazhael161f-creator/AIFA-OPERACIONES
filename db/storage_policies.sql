-- Script para configurar el almacenamiento (Storage) para los PDFs
-- Ejecuta este script en el Editor SQL de Supabase

-- 1. Crear el bucket 'parte-operaciones' si no existe
INSERT INTO storage.buckets (id, name, public)
VALUES ('parte-operaciones', 'parte-operaciones', true)
ON CONFLICT (id) DO NOTHING;

-- 2. (Omitido) No intentamos alterar la tabla storage.objects ya que requiere permisos de superusuario/dueño
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de ACCESO (Lectura)
-- Permitir a CUALQUIERA ver los archivos (necesario para que el dashboard público los muestre)
DROP POLICY IF EXISTS "Public Access Parte Operaciones" ON storage.objects;
CREATE POLICY "Public Access Parte Operaciones"
ON storage.objects FOR SELECT
USING ( bucket_id = 'parte-operaciones' );

-- 4. Políticas de SUBIDA (Insert)
-- Permitir a usuarios AUTENTICADOS subir archivos
DROP POLICY IF EXISTS "Authenticated Upload Parte Operaciones" ON storage.objects;
CREATE POLICY "Authenticated Upload Parte Operaciones"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'parte-operaciones' );

-- (OPCIONAL) Permitir a usuarios ANONIMOS subir archivos (Útil para pruebas si no has iniciado sesión)
-- Descomenta las siguientes lineas si tienes problemas subiendo sin estar logueado:
DROP POLICY IF EXISTS "Anon Upload Parte Operaciones" ON storage.objects;
CREATE POLICY "Anon Upload Parte Operaciones"
ON storage.objects FOR INSERT
TO anon
WITH CHECK ( bucket_id = 'parte-operaciones' );

-- 5. Políticas de ACTUALIZACIÓN (Update)
DROP POLICY IF EXISTS "Authenticated Update Parte Operaciones" ON storage.objects;
CREATE POLICY "Authenticated Update Parte Operaciones"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'parte-operaciones' );

-- 6. Políticas de ELIMINACIÓN (Delete)
DROP POLICY IF EXISTS "Authenticated Delete Parte Operaciones" ON storage.objects;
CREATE POLICY "Authenticated Delete Parte Operaciones"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'parte-operaciones' );
