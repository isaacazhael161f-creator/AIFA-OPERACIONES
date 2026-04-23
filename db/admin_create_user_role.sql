-- ============================================================
-- EJECUTAR EN SUPABASE SQL EDITOR
-- Función SECURITY DEFINER para que el admin cree usuarios
-- (bypasea RLS en user_roles al insertar el rol inicial)
-- ============================================================

-- Eliminar versión anterior para evitar sobrecarga de funciones
DROP FUNCTION IF EXISTS public.admin_create_user_role(UUID, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.admin_create_user_role(
    p_user_id          UUID,
    p_role             TEXT,
    p_dir_id           TEXT    DEFAULT NULL,
    p_subdir_id        TEXT    DEFAULT NULL,
    p_allowed_sections TEXT[]  DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    caller_role TEXT;
    perms       JSONB;
BEGIN
    -- Solo admin puede ejecutar esto
    SELECT role INTO caller_role
    FROM public.user_roles
    WHERE user_id = auth.uid();

    IF caller_role IS DISTINCT FROM 'admin' THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Acceso denegado: solo admin puede crear roles');
    END IF;

    -- Validar rol
    IF p_role NOT IN ('admin','editor','viewer','colab_viewer','colab_editor','control_fauna','servicio_medico','superadmin') THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Rol inválido: ' || p_role);
    END IF;

    -- Construir permissions JSON
    perms := '{}'::jsonb;
    IF p_dir_id IS NOT NULL AND p_dir_id <> '' THEN
        perms := perms || jsonb_build_object('direccion_id', p_dir_id);
    END IF;
    IF p_subdir_id IS NOT NULL AND p_subdir_id <> '' THEN
        perms := perms || jsonb_build_object('subdireccion_id', p_subdir_id);
    END IF;
    IF p_allowed_sections IS NOT NULL THEN
        perms := perms || jsonb_build_object('allowed_sections', to_jsonb(p_allowed_sections));
    END IF;

    INSERT INTO public.user_roles (user_id, role, permissions)
    VALUES (p_user_id, p_role, perms)
    ON CONFLICT (user_id)
    DO UPDATE SET role = EXCLUDED.role, permissions = EXCLUDED.permissions;

    RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_create_user_role(UUID, TEXT, TEXT, TEXT, TEXT[]) TO authenticated;
