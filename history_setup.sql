-- Create table for tracking changes
CREATE TABLE IF NOT EXISTS change_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    user_email TEXT, -- Snapshot of email for easier display
    action_type TEXT NOT NULL, -- 'CREAR', 'EDITAR', 'ELIMINAR'
    entity_type TEXT NOT NULL, -- 'Operación', 'Vuelo', etc.
    record_id TEXT, -- ID of the affected record
    details JSONB, -- Details of the change (old/new values)
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE change_history ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read history (as requested "everyone... can be seen")
CREATE POLICY "Enable read access for all users" ON change_history
    FOR SELECT USING (true);

-- Policy: Authenticated users can insert history
CREATE POLICY "Enable insert access for authenticated users" ON change_history
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');
