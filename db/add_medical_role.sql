-- Add 'servicio_medico' role to user_roles check constraint

ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;

ALTER TABLE public.user_roles 
ADD CONSTRAINT user_roles_role_check 
CHECK (role IN ('admin', 'editor', 'superadmin', 'control_fauna', 'servicio_medico', 'viewer'));
