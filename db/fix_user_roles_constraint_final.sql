-- Fix User Roles Constraint
-- Run this script BEFORE trying to assign the role.

-- 1. Remove the old constraint that restricts roles
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;

-- 2. Add the new constraint allowing 'control_fauna'
ALTER TABLE public.user_roles 
ADD CONSTRAINT user_roles_role_check 
CHECK (role IN ('admin', 'editor', 'superadmin', 'control_fauna', 'viewer'));

-- 3. (Optional) Assign the role immediately if you want to here.
-- Uncomment and change email if you want to do it in one step.
/*
DO $$
DECLARE
  target_email TEXT := 'correo@ejemplo.com'; 
  target_user_id UUID;
BEGIN
  SELECT id INTO target_user_id FROM auth.users WHERE email = target_email;
  IF target_user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (target_user_id, 'control_fauna')
    ON CONFLICT (user_id) 
    DO UPDATE SET role = 'control_fauna';
  END IF;
END $$;
*/
