-- 1. Limpiar políticas anteriores para evitar conflictos
DROP POLICY IF EXISTS "Allow public read access" ON public.daily_operations;
DROP POLICY IF EXISTS "Allow public insert access" ON public.daily_operations;
DROP POLICY IF EXISTS "Allow public update access" ON public.daily_operations;
DROP POLICY IF EXISTS "Allow public delete access" ON public.daily_operations;

-- Asegurarse de que RLS está activo
ALTER TABLE public.daily_operations ENABLE ROW LEVEL SECURITY;

-- 2. REGLA DE LECTURA: Pública (Cualquiera puede ver el tablero)
CREATE POLICY "Public Read Access"
ON public.daily_operations
FOR SELECT
USING (true);

-- 3. REGLAS DE ESCRITURA: Solo usuarios AUTENTICADOS (Editores/Admins)
-- Solo un usuario que haya iniciado sesión (auth.role() = 'authenticated') podrá realizar cambios

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
