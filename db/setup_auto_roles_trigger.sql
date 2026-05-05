-- SETUP SCRIPT: AUTO-ASSIGN ROLES ON SIGNUP
-- Ejecuta este script UNA VEZ en el Editor SQL de Supabase.
-- Permitirá que al crear un usuario desde test-connection.html, se asignen automáticamente sus permisos.

-- 1. Función manejadora del Trigger
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
DECLARE
  v_role TEXT;
  v_permissions JSONB;
BEGIN
  -- Extraer rol y permisos de los metadatos del usuario (enviados desde el JS)
  v_role := new.raw_user_meta_data->>'role';
  
  -- Si no viene el rol en metadatos, no hacemos nada (o podríamos asignar default)
  -- En este caso, asumimos 'viewer' por defecto si es nulo, para seguridad.
  IF v_role IS NULL THEN
    v_role := 'viewer';
  END IF;

  -- Extraer permisos (si existen)
  BEGIN
    v_permissions := (new.raw_user_meta_data->>'permissions')::jsonb;
  EXCEPTION WHEN OTHERS THEN
    v_permissions := NULL;
  END;
  
  IF v_permissions IS NULL THEN
    v_permissions := '{"allowed_sections": []}'::jsonb;
  END IF;

  -- Insertar en la tabla pública user_roles
  -- Usamos SECURITY DEFINER para que la función tenga permisos de escribir en public.user_roles
  INSERT INTO public.user_roles (user_id, role, permissions)
  VALUES (new.id, v_role, v_permissions)
  ON CONFLICT (user_id) DO UPDATE SET
    role = EXCLUDED.role,
    permissions = EXCLUDED.permissions;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Crear el Trigger en auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Confirmación
SELECT 'Trigger configurado exitosamente. Ahora los usuarios creados recibirán sus roles automáticamente.' as status;
