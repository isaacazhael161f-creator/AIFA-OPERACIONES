
-- FIX: Enable history logging for ALL authenticated users (including service_medico)

-- 1. Ensure RLS is enabled
ALTER TABLE change_history ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing restrictive policies if any
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON change_history;
DROP POLICY IF EXISTS "Authenticated users can insert change_history" ON change_history;
DROP POLICY IF EXISTS "public_insert_history" ON change_history;

-- 3. Create a broad permissive policy for INSERT
-- This allows any logged-in user (admin, medical, fauna, etc.) to log their actions.
CREATE POLICY "Enable insert access for authenticated users" ON change_history
    FOR INSERT 
    TO authenticated
    WITH CHECK (true);

-- 4. Ensure SELECT is also allowed (so they can see the history tab)
DROP POLICY IF EXISTS "Enable read access for all users" ON change_history;
CREATE POLICY "Enable read access for all users" ON change_history
    FOR SELECT 
    TO authenticated
    USING (true);

-- 5. Force grant permissions just in case
GRANT ALL ON change_history TO authenticated;
GRANT ALL ON change_history TO service_role;
