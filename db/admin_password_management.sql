-- ============================================================================
-- Gestión de contraseñas — AIFA OPERACIONES
-- ============================================================================
-- Provee:
--   1. admin_reset_user_password(p_user_id, p_new_password)
--      → admin/superadmin fija una contraseña TEMPORAL a otro usuario y marca
--        permissions.must_change_password = true (el usuario deberá cambiarla
--        al iniciar sesión).
--   2. clear_my_must_change_password()
--      → el propio usuario limpia su bandera must_change_password tras cambiar
--        su contraseña (no puede tocar user_roles de otros por RLS, por eso se
--        usa una RPC SECURITY DEFINER limitada a auth.uid()).
--
-- El cambio de contraseña PROPIO se hace en el cliente con
-- supabaseClient.auth.updateUser({ password }); no requiere RPC.
--
-- Requiere pgcrypto (crypt / gen_salt). En Supabase vive en el esquema
-- `extensions`; por eso el search_path lo incluye.
--
-- Ejecutar en el SQL Editor de Supabase DESPUÉS de db/rbac_roles_v2.sql.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ────────────────────────────────────────────────────────────────────────────
-- 1. admin_reset_user_password
-- ────────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.admin_reset_user_password(UUID, TEXT);
CREATE OR REPLACE FUNCTION public.admin_reset_user_password(
    p_user_id      UUID,
    p_new_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
    caller_role TEXT;
    _rows       INT;
BEGIN
    SELECT role INTO caller_role FROM public.user_roles WHERE user_id = auth.uid();
    IF caller_role IS NULL OR caller_role NOT IN ('admin','superadmin') THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Acceso denegado: solo admin/superadmin puede restablecer contraseñas');
    END IF;

    IF p_new_password IS NULL OR length(p_new_password) < 6 THEN
        RETURN jsonb_build_object('ok', false, 'error', 'La contraseña temporal debe tener al menos 6 caracteres');
    END IF;

    -- Fijar la nueva contraseña (bcrypt, igual que GoTrue).
    UPDATE auth.users
       SET encrypted_password = crypt(p_new_password, gen_salt('bf')),
           updated_at         = now()
     WHERE id = p_user_id;
    GET DIAGNOSTICS _rows = ROW_COUNT;
    IF _rows = 0 THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Usuario no encontrado en auth.users');
    END IF;

    -- Marcar que debe cambiar la contraseña al iniciar sesión.
    UPDATE public.user_roles
       SET permissions = coalesce(permissions, '{}'::jsonb)
                         || jsonb_build_object('must_change_password', true)
     WHERE user_id = p_user_id;

    RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_reset_user_password(UUID, TEXT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.admin_reset_user_password(UUID, TEXT) TO authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- 2. clear_my_must_change_password
-- ────────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.clear_my_must_change_password();
CREATE OR REPLACE FUNCTION public.clear_my_must_change_password()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.user_roles
       SET permissions = coalesce(permissions, '{}'::jsonb) - 'must_change_password'
     WHERE user_id = auth.uid();

    RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.clear_my_must_change_password() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.clear_my_must_change_password() TO authenticated;
