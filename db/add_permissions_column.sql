-- Add permissions column to user_roles
ALTER TABLE public.user_roles 
ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}'::jsonb;

-- Comment
COMMENT ON COLUMN public.user_roles.permissions IS 'JSON object with allowed sections, e.g. {"allowed_sections": ["inicio", "frecuencias"]}';

-- Verify access (policies usually cover SELECT *)
