-- ============================================================
-- EJECUTAR EN SUPABASE SQL EDITOR
-- Función SECURITY DEFINER para que el admin elimine usuarios
-- Elimina de auth.users en cascada (user_roles se elimina por FK)
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_delete_user(
    p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    caller_role TEXT;
BEGIN
    -- Solo admin puede ejecutar esto
    SELECT role INTO caller_role
    FROM public.user_roles
    WHERE user_id = auth.uid();

    IF caller_role IS DISTINCT FROM 'admin' THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Acceso denegado: solo admin puede eliminar usuarios');
    END IF;

    -- No permitir auto-eliminarse
    IF p_user_id = auth.uid() THEN
        RETURN jsonb_build_object('ok', false, 'error', 'No puedes eliminar tu propia cuenta');
    END IF;

    -- Eliminar en orden para respetar FKs
    DELETE FROM public.user_roles WHERE user_id = p_user_id;
    DELETE FROM public.profiles WHERE id = p_user_id;

    -- Eliminar de auth.users (debe ser lo último)
    DELETE FROM auth.users WHERE id = p_user_id;

    RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_delete_user(UUID) TO authenticated;
