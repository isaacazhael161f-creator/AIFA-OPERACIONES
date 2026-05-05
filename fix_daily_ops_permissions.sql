-- 1. Permisos Básicos (GRANTS)
-- Esto asegura que los roles de Supabase tengan permiso de tocar la tabla
GRANT SELECT ON public.daily_operations TO anon, authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON public.daily_operations TO authenticated, service_role;

-- 2. Asegurar RLS activado
ALTER TABLE public.daily_operations ENABLE ROW LEVEL SECURITY;

-- 3. Limpieza total de políticas previas (para evitar duplicados o conflictos)
DROP POLICY IF EXISTS "Allow public read access" ON public.daily_operations;
DROP POLICY IF EXISTS "Allow public insert access" ON public.daily_operations;
DROP POLICY IF EXISTS "Allow public update access" ON public.daily_operations;
DROP POLICY IF EXISTS "Allow public delete access" ON public.daily_operations;
DROP POLICY IF EXISTS "Public Read Access" ON public.daily_operations;
DROP POLICY IF EXISTS "Authenticated Insert Access" ON public.daily_operations;
DROP POLICY IF EXISTS "Authenticated Update Access" ON public.daily_operations;
DROP POLICY IF EXISTS "Authenticated Delete Access" ON public.daily_operations;

-- 4. Nueva Política de LECTURA PÚBLICA (CRÍTICA para que veas la tabla)
CREATE POLICY "Public Read Access"
ON public.daily_operations
FOR SELECT
USING (true);

-- 5. Políticas de ESCRITURA (Solo Autenticados)
CREATE POLICY "Authenticated Insert Access"
ON public.daily_operations
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated Update Access"
ON public.daily_operations
FOR UPDATE
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated Delete Access"
ON public.daily_operations
FOR DELETE
USING (auth.role() = 'authenticated');
