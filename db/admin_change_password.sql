-- ──────────────────────────────────────────────────────────────────────────────
-- admin_change_user_password
-- Cambia la contraseña de cualquier usuario de auth.users.
-- Solo puede ser invocada por un usuario con rol 'superadmin'.
-- ──────────────────────────────────────────────────────────────────────────────

-- Requiere pgcrypto para crypt() / gen_salt()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.admin_change_user_password(
    p_user_id    uuid,
    p_new_password text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller_role text;
BEGIN
    -- 1. Verificar que el llamador tiene rol superadmin
    SELECT role INTO v_caller_role
    FROM public.user_roles
    WHERE user_id = auth.uid()
    LIMIT 1;

    IF v_caller_role IS DISTINCT FROM 'superadmin' THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Acceso denegado: se requiere rol superadmin');
    END IF;

    -- 2. Validar longitud mínima (segunda capa de seguridad)
    IF length(p_new_password) < 8 THEN
        RETURN jsonb_build_object('ok', false, 'error', 'La contraseña debe tener al menos 8 caracteres');
    END IF;

    -- 3. Verificar que el usuario objetivo existe
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Usuario no encontrado');
    END IF;

    -- 4. Actualizar la contraseña cifrada
    UPDATE auth.users
    SET
        encrypted_password = crypt(p_new_password, gen_salt('bf')),
        updated_at         = now()
    WHERE id = p_user_id;

    RETURN jsonb_build_object('ok', true);
END;
$$;

-- Solo los usuarios autenticados pueden llamar esta función
-- (la verificación de superadmin se hace dentro)
REVOKE ALL ON FUNCTION public.admin_change_user_password(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_change_user_password(uuid, text) TO authenticated;
