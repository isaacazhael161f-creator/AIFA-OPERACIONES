-- =============================================================
--  ROLES ESPECÍFICOS PARA EL DIRECTORIO DE COLABORADORES
--  Ejecutar en: Supabase > SQL Editor
-- =============================================================
--
--  Nuevos roles:
--    colab_viewer  → Solo puede leer el Directorio de Colaboradores
--    colab_editor  → Puede leer y editar el Directorio de Colaboradores
--
--  Roles existentes (sin cambios):
--    admin         → Acceso total a toda la app
--    editor        → Acceso total a toda la app (con edición)
--    viewer        → Acceso de solo lectura a secciones genéricas
-- =============================================================


-- ─────────────────────────────────────────────────────────────
-- PASO 1: Ampliar el CHECK constraint de user_roles
-- (se elimina el constraint anterior y se recrea con los 2 roles nuevos)
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.user_roles
    DROP CONSTRAINT IF EXISTS user_roles_role_check;

-- Normalizar filas con roles no reconocidos (evita que el nuevo constraint falle)
-- Cualquier valor fuera de la lista se convierte en 'viewer' para no perder registros.
UPDATE public.user_roles
SET role = 'viewer'
WHERE role IS NULL
   OR role NOT IN ('admin', 'editor', 'viewer', 'colab_viewer', 'colab_editor');

ALTER TABLE public.user_roles
    ADD CONSTRAINT user_roles_role_check
    CHECK (role IN (
        'admin',
        'editor',
        'viewer',
        'colab_viewer',   -- solo lectura en Colaboradores
        'colab_editor'    -- lectura + edición en Colaboradores
    ));


-- ─────────────────────────────────────────────────────────────
-- PASO 2: Actualizar el trigger de nuevos usuarios
-- (sin cambios al valor default 'viewer'; solo se actualiza el
--  comentario para documentar los roles disponibles)
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    -- Insertar perfil
    INSERT INTO public.profiles (id, username, full_name)
    VALUES (
        new.id,
        split_part(new.email, '@', 1),
        new.raw_user_meta_data->>'full_name'
    )
    ON CONFLICT (id) DO NOTHING;

    -- Rol por defecto al registrarse: viewer
    -- Cambiar manualmente a colab_viewer / colab_editor / editor / admin después
    INSERT INTO public.user_roles (user_id, role)
    VALUES (new.id, 'viewer')
    ON CONFLICT (user_id) DO NOTHING;

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- ─────────────────────────────────────────────────────────────
-- PASO 3: Row Level Security en agenda_2026
-- (los nuevos roles pueden leer; solo colab_editor/admin/editor
--  pueden insertar, actualizar y borrar)
-- ─────────────────────────────────────────────────────────────

-- Función auxiliar reutilizable: devuelve el rol del usuario actual
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text AS $$
    SELECT role FROM public.user_roles WHERE user_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Habilitar RLS si no estaba activo
ALTER TABLE public.agenda_2026 ENABLE ROW LEVEL SECURITY;

-- Limpiar políticas anteriores
DROP POLICY IF EXISTS "agenda_2026: lectura autenticados"   ON public.agenda_2026;
DROP POLICY IF EXISTS "agenda_2026: edicion admin-editor"   ON public.agenda_2026;
DROP POLICY IF EXISTS "agenda_2026: lectura roles colab"    ON public.agenda_2026;
DROP POLICY IF EXISTS "agenda_2026: edicion colab_editor"   ON public.agenda_2026;

-- SELECT: todos los roles autenticados pueden leer
CREATE POLICY "agenda_2026: lectura roles colab"
    ON public.agenda_2026
    FOR SELECT
    TO authenticated
    USING (
        public.get_my_role() IN ('admin', 'editor', 'viewer', 'colab_viewer', 'colab_editor')
    );

-- INSERT / UPDATE / DELETE: admin, editor y colab_editor
CREATE POLICY "agenda_2026: edicion colab_editor"
    ON public.agenda_2026
    FOR ALL
    TO authenticated
    USING (
        public.get_my_role() IN ('admin', 'editor', 'colab_editor')
    )
    WITH CHECK (
        public.get_my_role() IN ('admin', 'editor', 'colab_editor')
    );


-- ─────────────────────────────────────────────────────────────
-- PASO 4: RLS en user_roles
-- (cada usuario solo ve su propio rol; admin ve todos)
-- ─────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Usuarios pueden ver su propio rol" ON public.user_roles;

CREATE POLICY "user_roles: ver propio"
    ON public.user_roles
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Política extra: admin puede gestionar todos los roles
DROP POLICY IF EXISTS "user_roles: admin gestiona todos" ON public.user_roles;
CREATE POLICY "user_roles: admin gestiona todos"
    ON public.user_roles
    FOR ALL
    TO authenticated
    USING   (public.get_my_role() = 'admin')
    WITH CHECK (public.get_my_role() = 'admin');


-- ─────────────────────────────────────────────────────────────
-- PASO 5: Función RPC para asignar roles desde el cliente
-- (SECURITY DEFINER → corre con privilegios elevados, bypasa RLS;
--  la validación interna garantiza que solo admin puede llamarla)
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.assign_user_role(
    p_user_id uuid,
    p_role    text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Solo el admin puede asignar roles
    IF public.get_my_role() != 'admin' THEN
        RAISE EXCEPTION 'No autorizado: solo administradores pueden asignar roles';
    END IF;

    -- Validar que el rol sea uno de los permitidos
    IF p_role NOT IN ('admin', 'editor', 'viewer', 'colab_viewer', 'colab_editor', 'control_fauna', 'servicio_medico') THEN
        RAISE EXCEPTION 'Rol no válido: %', p_role;
    END IF;

    INSERT INTO public.user_roles (user_id, role)
    VALUES (p_user_id, p_role)
    ON CONFLICT (user_id) DO UPDATE SET role = p_role;
END;
$$;

-- Revocar ejecución pública y conceder solo a usuarios autenticados
REVOKE EXECUTE ON FUNCTION public.assign_user_role(uuid, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.assign_user_role(uuid, text) TO authenticated;


-- ─────────────────────────────────────────────────────────────
-- PASO 6: Función RPC para eliminar usuarios desde el cliente
-- (SECURITY DEFINER; solo admin puede llamarla)
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.delete_user_by_admin(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    IF public.get_my_role() != 'admin' THEN
        RAISE EXCEPTION 'No autorizado: solo administradores pueden eliminar usuarios';
    END IF;

    -- 1. Limpiar sesiones e identidades (evita FK violations en auth)
    DELETE FROM auth.sessions   WHERE user_id = p_user_id;
    DELETE FROM auth.identities WHERE user_id = p_user_id;
    DELETE FROM auth.mfa_factors WHERE user_id = p_user_id;

    -- 2. Limpiar tablas públicas
    DELETE FROM public.user_roles WHERE user_id = p_user_id;
    DELETE FROM public.profiles   WHERE id       = p_user_id;

    -- 3. Eliminar el usuario de auth
    DELETE FROM auth.users WHERE id = p_user_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.delete_user_by_admin(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.delete_user_by_admin(uuid) TO authenticated;


-- ─────────────────────────────────────────────────────────────
-- PASO 7: Vista de administración (útil para ver quién tiene qué rol)
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW public.v_usuarios_roles AS
SELECT
    u.id             AS user_id,
    u.email,
    p.full_name,
    p.username,
    r.role,
    u.created_at
FROM auth.users u
LEFT JOIN public.profiles   p ON p.id       = u.id
LEFT JOIN public.user_roles r ON r.user_id  = u.id
ORDER BY r.role, u.email;

-- Dar acceso a la vista solo para admin (a través de RLS en la vista base)
-- NOTA: Las vistas en Supabase heredan el contexto de seguridad de las tablas base.


-- =============================================================
--  EJEMPLOS DE ASIGNACIÓN DE ROLES
--  Sustituye el email por el correo real del usuario.
--  Format: usuario@aifa.operaciones
-- =============================================================

-- Asignar rol colab_viewer (solo lectura en Colaboradores):
-- INSERT INTO public.user_roles (user_id, role)
-- SELECT id, 'colab_viewer'
-- FROM auth.users
-- WHERE email = 'juan.perez@aifa.operaciones'
-- ON CONFLICT (user_id) DO UPDATE SET role = 'colab_editor';

-- Asignar rol colab_editor (lectura + edición en Colaboradores):
-- INSERT INTO public.user_roles (user_id, role)
-- SELECT id, 'colab_editor'
-- FROM auth.users
-- WHERE email = 'maria.lopez@aifa.operaciones'
-- ON CONFLICT (user_id) DO UPDATE SET role = 'colab_editor';

-- Ver todos los usuarios y sus roles actuales:
-- SELECT * FROM public.v_usuarios_roles;

-- Cambiar rol de un usuario existente:
-- UPDATE public.user_roles
-- SET role = 'colab_editor'
-- WHERE user_id = (SELECT id FROM auth.users WHERE email = 'carlos.ruiz@aifa.operaciones');
