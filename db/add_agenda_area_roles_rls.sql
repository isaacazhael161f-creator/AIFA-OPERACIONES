-- =================================================================
--  AGENDA DE COMITÉS — ROLES POR ÁREA Y POLÍTICAS RLS
--  Ejecutar en: Supabase > SQL Editor
--  Propósito:
--    1. Ampliar el constraint de user_roles con los roles de área
--    2. Crear función helper get_user_agenda_area()
--    3. Agregar políticas RLS en agenda_comites y agenda_reuniones
--       para que cada área solo pueda editar SUS comités/sesiones
-- =================================================================


-- ─────────────────────────────────────────────────────────────────
-- 1. Ampliar el constraint de user_roles
-- ─────────────────────────────────────────────────────────────────
ALTER TABLE public.user_roles
    DROP CONSTRAINT IF EXISTS user_roles_role_check;

ALTER TABLE public.user_roles
    ADD CONSTRAINT user_roles_role_check CHECK (role IN (
        -- Roles globales (sin área)
        'admin',
        'superadmin',
        'editor',
        'viewer',
        'colab_viewer',
        'colab_editor',
        -- Roles de área (con permiso de edición en su área)
        'operacion',       -- DO  — Dirección de Operación
        'administracion',  -- DA  — Dirección de Administración
        'planeacion',      -- DPE — Dirección de Planeación Estratégica
        'comercial',       -- DCS — Dirección Comercial y de Servicios
        'seguridad_op',    -- GSO — Gerencia de Seguridad Operacional
        'transparencia',   -- UT  — Unidad de Transparencia
        'calidad'          -- GC  — Gestión de Calidad
    ));


-- ─────────────────────────────────────────────────────────────────
-- 2. Función helper: obtener el área del usuario autenticado
--    Busca primero permissions->>'area' (asignación explícita),
--    luego infiere el área desde el nombre del rol.
-- ─────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_user_agenda_area()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT
        CASE
            WHEN (permissions->>'area') IS NOT NULL THEN (permissions->>'area')
            WHEN role = 'operacion'     THEN 'DO'
            WHEN role = 'administracion' THEN 'DA'
            WHEN role = 'planeacion'    THEN 'DPE'
            WHEN role = 'comercial'     THEN 'DCS'
            WHEN role = 'seguridad_op'  THEN 'GSO'
            WHEN role = 'transparencia' THEN 'UT'
            WHEN role = 'calidad'       THEN 'GC'
            ELSE NULL
        END
    FROM public.user_roles
    WHERE user_id = auth.uid()
    LIMIT 1;
$$;


-- ─────────────────────────────────────────────────────────────────
-- 3. RLS en agenda_comites
-- ─────────────────────────────────────────────────────────────────
ALTER TABLE public.agenda_comites ENABLE ROW LEVEL SECURITY;

-- SELECT: todos los autenticados pueden leer
DROP POLICY IF EXISTS "agenda_comites: lectura" ON public.agenda_comites;
CREATE POLICY "agenda_comites: lectura"
    ON public.agenda_comites
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- INSERT / UPDATE / DELETE: admin/editor/superadmin escriben todo
DROP POLICY IF EXISTS "agenda_comites: admin escribe todo" ON public.agenda_comites;
CREATE POLICY "agenda_comites: admin escribe todo"
    ON public.agenda_comites
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid()
              AND role IN ('admin', 'superadmin', 'editor')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid()
              AND role IN ('admin', 'superadmin', 'editor')
        )
    );

-- INSERT / UPDATE / DELETE: roles de área solo editan su propia área
DROP POLICY IF EXISTS "agenda_comites: área edita su área" ON public.agenda_comites;
CREATE POLICY "agenda_comites: área edita su área"
    ON public.agenda_comites
    FOR ALL
    USING (area = public.get_user_agenda_area())
    WITH CHECK (area = public.get_user_agenda_area());


-- ─────────────────────────────────────────────────────────────────
-- 4. RLS en agenda_reuniones
-- ─────────────────────────────────────────────────────────────────
ALTER TABLE public.agenda_reuniones ENABLE ROW LEVEL SECURITY;

-- SELECT: todos los autenticados pueden leer
DROP POLICY IF EXISTS "agenda_reuniones: lectura" ON public.agenda_reuniones;
CREATE POLICY "agenda_reuniones: lectura"
    ON public.agenda_reuniones
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- INSERT / UPDATE / DELETE: admin/editor/superadmin escriben todo
DROP POLICY IF EXISTS "agenda_reuniones: admin escribe todo" ON public.agenda_reuniones;
CREATE POLICY "agenda_reuniones: admin escribe todo"
    ON public.agenda_reuniones
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid()
              AND role IN ('admin', 'superadmin', 'editor')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid()
              AND role IN ('admin', 'superadmin', 'editor')
        )
    );

-- INSERT / UPDATE / DELETE: roles de área solo editan su área
DROP POLICY IF EXISTS "agenda_reuniones: área edita su área" ON public.agenda_reuniones;
CREATE POLICY "agenda_reuniones: área edita su área"
    ON public.agenda_reuniones
    FOR ALL
    USING (area = public.get_user_agenda_area())
    WITH CHECK (area = public.get_user_agenda_area());


-- ─────────────────────────────────────────────────────────────────
-- 5. (Opcional) Asignar un área concreta desde permissions.area
--    sin cambiar el role. Ejemplo:
--      UPDATE public.user_roles
--      SET permissions = jsonb_set(COALESCE(permissions,'{}'), '{area}', '"GSO"')
--      WHERE user_id = '<uuid del usuario>';
-- ─────────────────────────────────────────────────────────────────
