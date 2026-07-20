-- ---------------------------------------------------------------------------
-- Script para asignar el rol 'control_fauna' a un usuario por su email
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  -- PON AQUÍ EL EMAIL DEL USUARIO QUE QUIERES AUTORIZAR:
  target_email TEXT := 'correo@ejemplo.com'; 
  
  target_user_id UUID;
BEGIN
  -- 1. Buscar el UUID del usuario en la tabla de autenticación
  SELECT id INTO target_user_id 
  FROM auth.users 
  WHERE email = target_email;

  -- 2. Verificar si existe
  IF target_user_id IS NOT NULL THEN
    
    -- 3. Insertar o actualizar el rol en public.user_roles
    -- OJO: Asumimos que la tabla user_roles tiene 'user_id' como clave única.
    -- Si no existe la tabla, asegúrate de crearla primero.
    
    INSERT INTO public.user_roles (user_id, role)
    VALUES (target_user_id, 'control_fauna')
    ON CONFLICT (user_id) 
    DO UPDATE SET role = 'control_fauna';
    
    RAISE NOTICE '✅ Rol control_fauna asignado exitosamente a %', target_email;
  ELSE
    RAISE NOTICE '❌ El usuario con email % no fue encontrado en auth.users', target_email;
  END IF;
END $$;
