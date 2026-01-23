
-- Garantizar permisos en la tabla change_history
ALTER TABLE change_history ENABLE ROW LEVEL SECURITY;

-- 1. Política de Lectura (Todos pueden ver)
DROP POLICY IF EXISTS "Enable read access for all users" ON change_history;
CREATE POLICY "Enable read access for all users" ON change_history
    FOR SELECT USING (true);

-- 2. Política de Inserción (Usuarios autenticados pueden registrar cambios)
--    Esto es crucial para que Admin, Servicio Médico y Control de Fauna puedan dejar rastro.
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON change_history;
CREATE POLICY "Enable insert access for authenticated users" ON change_history
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 3. Permisos explícitos (Grant)
GRANT ALL ON change_history TO authenticated;
GRANT ALL ON change_history TO service_role;
