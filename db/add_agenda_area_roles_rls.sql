-- =================================================================
--  AGENDA DE COMITÉS — ROLES POR ÁREA Y POLÍTICAS RLS  (v2)
--  Ejecutar en: Supabase > SQL Editor
--
--  Estrategia: el campo `role` en user_roles puede ser:
--    a) Un rol global: admin | superadmin | editor | viewer |
--                      colab_viewer | colab_editor
--    b) La clave exacta de cualquier área del organigrama:
--       DO, DPE, DCS, DA, DJ, GSO, GC, UT, SD-SO, SD-SA,
--       SD-ING, SD-SC, SD-RH, SD-RM, SD-RF, SD-SIS, GSD, etc.
--       → el rol ES el área, sin mapeo intermedio
--
--  Ventaja: funciona para las 33+ áreas actuales y cualquier área
--  futura sin necesidad de cambiar código ni constraints.
-- =================================================================


-- ─────────────────────────────────────────────────────────────────
-- 1. Eliminar el constraint rígido y reemplazar con trigger
--    que valida contra la tabla `areas` en tiempo real
-- ─────────────────────────────────────────────────────────────────
ALTER TABLE public.user_roles
    DROP CONSTRAINT IF EXISTS user_roles_role_check;

-- Función del trigger de validación
CREATE OR REPLACE FUNCTION public._validate_user_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    _global_roles TEXT[] := ARRAY[
        'admin', 'superadmin', 'editor', 'viewer',
        'colab_viewer', 'colab_editor'
    ];
BEGIN
    -- Roles globales: siempre válidos
    IF NEW.role = ANY(_global_roles) THEN
        RETURN NEW;
    END IF;

    -- Roles de área: debe existir en la tabla areas como clave activa
    IF EXISTS (
        SELECT 1 FROM public.areas
        WHERE clave = NEW.role
          AND estado = 'ACTIVO'
    ) THEN
        RETURN NEW;
    END IF;

    -- También aceptar claves legacy de nombre-rol por compatibilidad
    IF NEW.role IN (
        'operacion', 'administracion', 'planeacion',
        'comercial', 'seguridad_op', 'transparencia', 'calidad'
    ) THEN
        RETURN NEW;
    END IF;

    RAISE EXCEPTION
        'Rol inválido: "%". Debe ser un rol global (admin/editor/viewer…) '
        'o la clave exacta de un área activa del organigrama (DO, GSO, SD-SO, etc.).',
        NEW.role;
END;
$$;

-- Vincular trigger a user_roles
DROP TRIGGER IF EXISTS trg_validate_user_role ON public.user_roles;
CREATE TRIGGER trg_validate_user_role
    BEFORE INSERT OR UPDATE OF role ON public.user_roles
    FOR EACH ROW EXECUTE FUNCTION public._validate_user_role();


-- ─────────────────────────────────────────────────────────────────
-- 2. Función helper: obtener el área del usuario autenticado
--
--    Prioridad:
--      1. permissions->>'area'  (asignación explícita, override)
--      2. role = clave de área  (nuevo esquema: el rol ES el área)
--      3. mapeo legacy de nombres descriptivos → clave
--      → NULL si el usuario es admin/editor/viewer (sin área)
-- ─────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_user_agenda_area()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT
        CASE
            -- Override explícito en permissions
            WHEN (permissions->>'area') IS NOT NULL
                THEN (permissions->>'area')
            -- El rol es directamente la clave del área (esquema v2)
            WHEN role NOT IN (
                'admin','superadmin','editor','viewer',
                'colab_viewer','colab_editor',
                'operacion','administracion','planeacion',
                'comercial','seguridad_op','transparencia','calidad'
            ) THEN role
            -- Compatibilidad hacia atrás con roles de nombre descriptivo
            WHEN role = 'operacion'      THEN 'DO'
            WHEN role = 'administracion' THEN 'DA'
            WHEN role = 'planeacion'     THEN 'DPE'
            WHEN role = 'comercial'      THEN 'DCS'
            WHEN role = 'seguridad_op'   THEN 'GSO'
            WHEN role = 'transparencia'  THEN 'UT'
            WHEN role = 'calidad'        THEN 'GC'
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

-- INSERT / UPDATE / DELETE: usuario de área solo edita SU área
DROP POLICY IF EXISTS "agenda_comites: área edita su área" ON public.agenda_comites;
CREATE POLICY "agenda_comites: área edita su área"
    ON public.agenda_comites
    FOR ALL
    USING  (area = public.get_user_agenda_area())
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

-- INSERT / UPDATE / DELETE: usuario de área solo edita SU área
DROP POLICY IF EXISTS "agenda_reuniones: área edita su área" ON public.agenda_reuniones;
CREATE POLICY "agenda_reuniones: área edita su área"
    ON public.agenda_reuniones
    FOR ALL
    USING  (area = public.get_user_agenda_area())
    WITH CHECK (area = public.get_user_agenda_area());


-- ─────────────────────────────────────────────────────────────────
-- 5. Cómo asignar un rol de área a un usuario
--
--    Opción A (recomendada): usar la clave del área como role
--      UPDATE public.user_roles
--      SET role = 'GSO'
--      WHERE user_id = '<uuid>';
--
--    Opción B: override explícito en permissions (sin cambiar role)
--      UPDATE public.user_roles
--      SET permissions = jsonb_set(COALESCE(permissions,'{}'), '{area}', '"SD-SO"')
--      WHERE user_id = '<uuid>';
--
--    Claves válidas: cualquier clave en public.areas donde estado='ACTIVO'
--    Ejemplos: DG, DO, DPE, DCS, DA, DJ, GSO, GC, UT, GPE, SMS,
--              SD-SO, SD-SA, SD-ING, SD-SC, SD-CE, SD-PROY, SD-SCPE,
--              SD-CYS, SD-SAYC, SD-MYC, SD-RH, SD-RM, SD-RF, SD-SIS,
--              SD-CONS, SD-CONT, SD-ACORP  (y las que se agreguen)
-- ─────────────────────────────────────────────────────────────────
