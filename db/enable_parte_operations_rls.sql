-- Enable RLS on parte_operations
ALTER TABLE IF EXISTS public.parte_operations ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Permitir lectura a todos" ON public.parte_operations;
DROP POLICY IF EXISTS "Permitir todo a usuarios autenticados" ON public.parte_operations;

-- Create policy to allow read access to everyone (since it was previously a public JSON)
-- Or restrict to authenticated users if that's the requirement. 
-- Given the context of the other table, let's allow authenticated users full access and maybe public read?
-- For now, let's mirror the custom_parte_operaciones policy: "Permitir todo a usuarios autenticados"

CREATE POLICY "Permitir todo a usuarios autenticados" 
ON public.parte_operations 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- If unauthenticated users need to see this (e.g. public dashboard), uncomment the following:
-- CREATE POLICY "Permitir lectura a anonimos" 
-- ON public.parte_operations 
-- FOR SELECT 
-- TO anon 
-- USING (true);
