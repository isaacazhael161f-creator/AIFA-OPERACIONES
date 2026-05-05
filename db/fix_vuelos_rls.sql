-- Asegurar que la tabla existe con la estructura correcta
-- NOTA: Si la tabla ya existe, este comando no la modifica, solo asegura su existencia.
CREATE TABLE IF NOT EXISTS public.vuelos_parte_operaciones (
    date DATE PRIMARY KEY, -- La columna clave es 'date'
    data JSONB DEFAULT '[]'::jsonb
);

-- Habilitar seguridad a nivel de fila (RLS)
ALTER TABLE public.vuelos_parte_operaciones ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas anteriores para evitar conflictos
DROP POLICY IF EXISTS "Permitir gestión total de vuelos" ON public.vuelos_parte_operaciones;
DROP POLICY IF EXISTS "Enable all operations for authenticated users only" ON public.vuelos_parte_operaciones;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.vuelos_parte_operaciones;

-- Crear una política PERMISIVA que permite leer, insertar y actualizar a CUALQUIER usuario (incluido anónimo)
-- Esto solucionará el error "new row violates row-level security policy"
CREATE POLICY "Permitir gestión total de vuelos"
ON public.vuelos_parte_operaciones
FOR ALL
TO public
USING (true)
WITH CHECK (true);
