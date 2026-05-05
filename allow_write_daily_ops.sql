-- Habilitar permisos de ESCRITURA (Insertar, Actualizar, Borrar) para daily_operations

-- Política para permitir INSERTAR registros
CREATE POLICY "Allow public insert access"
ON public.daily_operations
FOR INSERT
WITH CHECK (true);

-- Política para permitir ACTUALIZAR registros
CREATE POLICY "Allow public update access"
ON public.daily_operations
FOR UPDATE
USING (true);

-- Política para permitir BORRAR registros
CREATE POLICY "Allow public delete access"
ON public.daily_operations
FOR DELETE
USING (true);
