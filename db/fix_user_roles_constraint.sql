-- Fix for: ERROR: 23514: new row for relation "user_roles" violates check constraint "user_roles_role_check"

-- The existing check constraint likely only allows 'admin', 'editor', 'superadmin'.
-- We need to drop it and recreate it to include 'control_fauna'.

ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;

ALTER TABLE public.user_roles 
ADD CONSTRAINT user_roles_role_check 
CHECK (role IN ('admin', 'editor', 'superadmin', 'control_fauna', 'viewer'));
