-- ============================================================
-- EJECUTAR EN SUPABASE SQL EDITOR
-- Paso 1: Actualizar constraint para incluir todos los roles
-- Paso 2: Crear función SECURITY DEFINER para cambio seguro de roles
-- ============================================================

-- 1. Actualizar CHECK constraint con todos los roles del sistema
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;
ALTER TABLE public.user_roles
ADD CONSTRAINT user_roles_role_check
CHECK (role IN (
    'admin',
    'editor',
    'viewer',
    'colab_viewer',
    'colab_editor',
    'control_fauna',
    'servicio_medico',
    'superadmin'
));

-- 2. Función segura para que el admin cambie el rol de cualquier usuario
--    SECURITY DEFINER = corre con permisos del owner (bypasea RLS)
--    La función verifica internamente que el llamante sea admin
CREATE OR REPLACE FUNCTION public.admin_update_user_role(
    p_user_id   UUID,
    p_role      TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    caller_role TEXT;
BEGIN
    -- Verificar que quien llama es admin
    SELECT role INTO caller_role
    FROM public.user_roles
    WHERE user_id = auth.uid();

    IF caller_role IS DISTINCT FROM 'admin' THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Acceso denegado: solo admin puede cambiar roles');
    END IF;

    -- Validar que el rol solicitado sea uno permitido
    IF p_role NOT IN ('admin','editor','viewer','colab_viewer','colab_editor','control_fauna','servicio_medico','superadmin') THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Rol inválido: ' || p_role);
    END IF;

    -- Upsert manteniendo permissions existentes
    INSERT INTO public.user_roles (user_id, role, permissions)
    VALUES (p_user_id, p_role, '{}'::jsonb)
    ON CONFLICT (user_id)
    DO UPDATE SET role = EXCLUDED.role;

    RETURN jsonb_build_object('ok', true);
END;
$$;

-- 3. Dar acceso de ejecución a usuarios autenticados
GRANT EXECUTE ON FUNCTION public.admin_update_user_role(UUID, TEXT) TO authenticated;
