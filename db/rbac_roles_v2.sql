-- ============================================================================
--  RBAC v2 — Roles de captura y control de vistas por módulo
--  Ejecutar UNA VEZ en: Supabase > SQL Editor
-- ----------------------------------------------------------------------------
--  ⚠ SEGURO PARA PRODUCCIÓN (local y prod comparten la misma BD):
--    · NO agrega, borra ni renombra columnas de user_roles.
--    · NO modifica el trigger existente `trg_validate_user_role`
--      (solo actualiza con CREATE OR REPLACE la función que ya usa).
--    · Reutiliza las columnas actuales: role (text) y permissions (jsonb),
--      con las MISMAS claves JSON que ya usa la app (allowed_sections,
--      estado, area, direccion_id, subdireccion_id, gerencia_id).
--    · Solo AMPLÍA la lista de roles válidos; el código viejo de producción
--      sigue funcionando (un usuario con rol nuevo queda como solo-lectura
--      hasta que se despliegue el código nuevo).
-- ----------------------------------------------------------------------------
--  MODELO
--    Tabla:  public.user_roles (user_id uuid PK, role text, permissions jsonb)
--
--    El ROL GLOBAL define el NIVEL DE ESCRITURA del usuario:
--      · admin       → acceso total (ignora la lista de vistas)
--      · superadmin  → acceso total (ignora la lista de vistas)
--      · editor      → agregar + modificar + borrar en los módulos visibles
--      · capturista  → SOLO agregar / capturar en los módulos visibles
--      · lector      → solo lectura en los módulos visibles
--
--    El JSON permissions.allowed_sections controla LA VISIBILIDAD por módulo
--    individual (data-section). Ejemplo:
--      {"allowed_sections": ["inicio","demoras","fauna"], "estado": "ACTIVO"}
--    · Lista vacía / ausente  = acceso a TODOS los módulos.
--    · admin / superadmin     = ven todo aunque la lista esté configurada.
--
--    El JSON permissions.section_levels permite un NIVEL DE ESCRITURA DISTINTO
--    POR MÓDULO (sobre-escribe el nivel del rol global solo en ese módulo).
--    Valores por módulo: 'read' | 'capture' | 'edit'. Ejemplo:
--      {"allowed_sections": ["demoras","fauna","medicas"],
--       "section_levels": {"demoras":"edit","fauna":"capture","medicas":"read"}}
--    · Un módulo SIN entrada en section_levels usa el nivel del rol global.
--    · admin / superadmin ignoran section_levels (siempre nivel total).
--    Así un mismo usuario puede ser editor en un módulo, capturista en otro
--    y lector en otro.
--
--    Roles legacy que se conservan por compatibilidad (no romper cuentas):
--      viewer (equivalente a lector), colab_viewer, colab_editor,
--      control_fauna, servicio_medico, y las claves de área (GSO, DPE, …).
-- ============================================================================

BEGIN;

-- ────────────────────────────────────────────────────────────────────────────
-- 1. Documentar la columna permissions
-- ────────────────────────────────────────────────────────────────────────────
COMMENT ON COLUMN public.user_roles.permissions IS
  'JSON de configuración del usuario. Claves: allowed_sections (array de data-section visibles; vacío = todos), section_levels (objeto data-section -> read|capture|edit que sobre-escribe el nivel del rol por módulo), estado (ACTIVO|INACTIVO), area/direccion_id/subdireccion_id/gerencia_id. El nivel de escritura global lo determina el campo role; section_levels lo afina por módulo.';

-- ────────────────────────────────────────────────────────────────────────────
-- 2. Actualizar SOLO la función de validación de roles (superset seguro).
--    · NO se toca la estructura de la tabla ni el trigger existente
--      `trg_validate_user_role`: ya apunta a esta función y seguirá usando
--      esta versión tras el CREATE OR REPLACE.
--    · Solo AMPLÍA la lista de roles válidos (superset).
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public._validate_user_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _global_roles TEXT[] := ARRAY[
        -- Roles principales v2
        'admin', 'superadmin', 'editor', 'capturista', 'lector',
        -- Legacy / especiales (compatibilidad)
        'viewer', 'colab_viewer', 'colab_editor',
        'control_fauna', 'servicio_medico'
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
    IF NEW.role IN ('operacion','administracion','planeacion','comercial','seguridad_op','transparencia','calidad') THEN
        RETURN NEW;
    END IF;

    -- Grandfather: cualquier rol que YA exista en la tabla se sigue aceptando
    -- (blinda datos de producción ante valores no contemplados en esta lista).
    IF EXISTS (SELECT 1 FROM public.user_roles WHERE role = NEW.role) THEN
        RETURN NEW;
    END IF;

    RAISE EXCEPTION 'Rol no válido: %', NEW.role;
END;
$$;

-- El trigger `trg_validate_user_role` NO se recrea: ya existe y apunta a esta
-- misma función, que acabamos de actualizar con CREATE OR REPLACE.

-- ────────────────────────────────────────────────────────────────────────────
-- 3. RPC: cambiar rol (usado por el módulo de Gestión de Usuarios)
--    Solo admin/superadmin puede ejecutarlo; conserva permissions existente.
-- ────────────────────────────────────────────────────────────────────────────
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
    _valid      BOOLEAN;
BEGIN
    SELECT role INTO caller_role
    FROM public.user_roles
    WHERE user_id = auth.uid();

    IF caller_role IS NULL OR caller_role NOT IN ('admin','superadmin') THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Acceso denegado: solo admin/superadmin puede cambiar roles');
    END IF;

    -- Validar rol (globales v2 + legacy + clave de área activa)
    _valid := p_role IN (
        'admin','superadmin','editor','capturista','lector',
        'viewer','colab_viewer','colab_editor','control_fauna','servicio_medico'
    ) OR EXISTS (SELECT 1 FROM public.areas WHERE clave = p_role AND estado = 'ACTIVO');

    IF NOT _valid THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Rol inválido: ' || p_role);
    END IF;

    INSERT INTO public.user_roles (user_id, role, permissions)
    VALUES (p_user_id, p_role, '{}'::jsonb)
    ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;

    RETURN jsonb_build_object('ok', true, 'role', p_role);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_update_user_role(UUID, TEXT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.admin_update_user_role(UUID, TEXT) TO authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- 4. RPC: crear rol inicial al alta de usuario (bypasa RLS)
--    Firma alineada con el cliente: (p_user_id, p_role, p_dir_id, p_subdir_id, p_allowed_sections)
-- ────────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.admin_create_user_role(UUID, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.admin_create_user_role(UUID, TEXT, TEXT, TEXT, TEXT[]);
DROP FUNCTION IF EXISTS public.admin_create_user_role(UUID, TEXT, TEXT, TEXT, TEXT[], JSONB);

CREATE OR REPLACE FUNCTION public.admin_create_user_role(
    p_user_id          UUID,
    p_role             TEXT,
    p_dir_id           TEXT    DEFAULT NULL,
    p_subdir_id        TEXT    DEFAULT NULL,
    p_allowed_sections TEXT[]  DEFAULT NULL,
    p_section_levels   JSONB   DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    caller_role TEXT;
    perms       JSONB;
    _valid      BOOLEAN;
BEGIN
    SELECT role INTO caller_role
    FROM public.user_roles
    WHERE user_id = auth.uid();

    IF caller_role IS NULL OR caller_role NOT IN ('admin','superadmin') THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Acceso denegado: solo admin/superadmin puede crear roles');
    END IF;

    _valid := p_role IN (
        'admin','superadmin','editor','capturista','lector',
        'viewer','colab_viewer','colab_editor','control_fauna','servicio_medico'
    ) OR EXISTS (SELECT 1 FROM public.areas WHERE clave = p_role AND estado = 'ACTIVO');

    IF NOT _valid THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Rol inválido: ' || p_role);
    END IF;

    perms := jsonb_build_object('estado', 'ACTIVO');
    IF p_dir_id    IS NOT NULL AND p_dir_id    <> '' THEN perms := perms || jsonb_build_object('direccion_id',    p_dir_id);    END IF;
    IF p_subdir_id IS NOT NULL AND p_subdir_id <> '' THEN perms := perms || jsonb_build_object('subdireccion_id', p_subdir_id); END IF;
    IF p_allowed_sections IS NOT NULL THEN
        perms := perms || jsonb_build_object('allowed_sections', to_jsonb(p_allowed_sections));
    END IF;
    IF p_section_levels IS NOT NULL AND p_section_levels <> '{}'::jsonb THEN
        perms := perms || jsonb_build_object('section_levels', p_section_levels);
    END IF;

    INSERT INTO public.user_roles (user_id, role, permissions)
    VALUES (p_user_id, p_role, perms)
    ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role, permissions = EXCLUDED.permissions;

    RETURN jsonb_build_object('ok', true, 'role', p_role);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_create_user_role(UUID, TEXT, TEXT, TEXT, TEXT[], JSONB) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.admin_create_user_role(UUID, TEXT, TEXT, TEXT, TEXT[], JSONB) TO authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- 5. RPC legacy assign_user_role (test-connection.html): ampliar validación
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.assign_user_role(
    p_user_id uuid,
    p_role    text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _caller TEXT;
BEGIN
    SELECT role INTO _caller FROM public.user_roles WHERE user_id = auth.uid();
    IF _caller IS NULL OR _caller NOT IN ('admin','superadmin') THEN
        RAISE EXCEPTION 'No autorizado: solo administradores pueden asignar roles';
    END IF;

    IF NOT (p_role IN (
        'admin','superadmin','editor','capturista','lector',
        'viewer','colab_viewer','colab_editor','control_fauna','servicio_medico'
    ) OR EXISTS (SELECT 1 FROM public.areas WHERE clave = p_role AND estado = 'ACTIVO')) THEN
        RAISE EXCEPTION 'Rol no válido: %', p_role;
    END IF;

    INSERT INTO public.user_roles (user_id, role)
    VALUES (p_user_id, p_role)
    ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.assign_user_role(uuid, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.assign_user_role(uuid, text) TO authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- 6. Helpers para RLS futura (mismos nombres que usará la app en cliente)
--    Nivel de acceso derivado del rol: admin | edit | capture | read
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.user_access_level()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT CASE
        WHEN r.role IN ('admin','superadmin')                        THEN 'admin'
        WHEN r.role IN ('editor','colab_editor',
                        'control_fauna','servicio_medico')           THEN 'edit'
        WHEN r.role = 'capturista'                                    THEN 'capture'
        ELSE 'read'   -- lector, viewer, colab_viewer, claves de área
    END
    FROM public.user_roles r
    WHERE r.user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.user_can_edit()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
    SELECT public.user_access_level() IN ('admin','edit');
$$;

CREATE OR REPLACE FUNCTION public.user_can_capture()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
    SELECT public.user_access_level() IN ('admin','edit','capture');
$$;

GRANT EXECUTE ON FUNCTION public.user_access_level() TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_can_edit()     TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_can_capture()  TO authenticated;

-- ── Nivel de acceso POR MÓDULO (considera permissions.section_levels) ────────
--    Devuelve: 'admin' | 'edit' | 'capture' | 'read' | 'none'
--      · admin/superadmin           → 'admin' en todo.
--      · módulo no visible          → 'none'  (allowed_sections lo excluye).
--      · override en section_levels → ese nivel ('read'|'capture'|'edit').
--      · sin override               → nivel del rol global (user_access_level).
CREATE OR REPLACE FUNCTION public.user_section_level(p_section TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
    _perms   JSONB;
    _base    TEXT;
    _allowed JSONB;
    _ovr     TEXT;
BEGIN
    _base := public.user_access_level();
    IF _base IS NULL THEN
        RETURN 'none';
    END IF;
    IF _base = 'admin' THEN
        RETURN 'admin';   -- admin/superadmin: acceso total, ignora listas
    END IF;

    SELECT permissions INTO _perms FROM public.user_roles WHERE user_id = auth.uid();

    -- Visibilidad: si hay allowed_sections no vacío y NO incluye la sección → none
    _allowed := _perms -> 'allowed_sections';
    IF _allowed IS NOT NULL
       AND jsonb_typeof(_allowed) = 'array'
       AND jsonb_array_length(_allowed) > 0
       AND NOT (_allowed ? p_section) THEN
        RETURN 'none';
    END IF;

    -- Override por módulo
    _ovr := _perms #>> ARRAY['section_levels', p_section];
    IF _ovr IN ('read','capture','edit') THEN
        RETURN _ovr;
    END IF;

    RETURN _base;   -- sin override: nivel del rol global
END;
$$;

CREATE OR REPLACE FUNCTION public.user_can_edit_section(p_section TEXT)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
    SELECT public.user_section_level(p_section) IN ('admin','edit');
$$;

CREATE OR REPLACE FUNCTION public.user_can_capture_section(p_section TEXT)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
    SELECT public.user_section_level(p_section) IN ('admin','edit','capture');
$$;

CREATE OR REPLACE FUNCTION public.user_can_view_section(p_section TEXT)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
    SELECT public.user_section_level(p_section) <> 'none';
$$;

GRANT EXECUTE ON FUNCTION public.user_section_level(TEXT)      TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_can_edit_section(TEXT)   TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_can_capture_section(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_can_view_section(TEXT)   TO authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- 7. Gestión de user_roles: permitir a superadmin (además de admin)
--    ADITIVO Y SEGURO: solo AMPLÍA de 'admin' a 'admin'+'superadmin'.
--    Necesario porque el módulo de gestión guarda permissions (vistas/área/baja)
--    con UPDATE directo sobre user_roles, sujeto a esta política RLS.
--    Si un superadmin no está incluido, esos guardados fallarían en silencio.
-- ────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "user_roles: admin gestiona todos" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles: admin y superadmin gestionan" ON public.user_roles;
CREATE POLICY "user_roles: admin y superadmin gestionan"
    ON public.user_roles
    FOR ALL
    TO authenticated
    USING   (public.get_my_role() IN ('admin','superadmin'))
    WITH CHECK (public.get_my_role() IN ('admin','superadmin'));

-- ────────────────────────────────────────────────────────────────────────────
-- 7b. RPC admin_update_user_permissions — guardar el objeto `permissions`
--     (vistas/área/nivel/baja) de forma CONFIABLE, sin depender de la política
--     RLS de UPDATE. SECURITY DEFINER: valida admin/superadmin internamente y
--     reemplaza el jsonb completo. Devuelve ok + filas afectadas para que el
--     cliente detecte fallos (antes, un UPDATE bloqueado por RLS devolvía 0
--     filas SIN error → el guardado fallaba en silencio).
-- ────────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.admin_update_user_permissions(UUID, JSONB);
CREATE OR REPLACE FUNCTION public.admin_update_user_permissions(
    p_user_id     UUID,
    p_permissions JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    caller_role TEXT;
    _rows       INT;
BEGIN
    SELECT role INTO caller_role FROM public.user_roles WHERE user_id = auth.uid();
    IF caller_role IS NULL OR caller_role NOT IN ('admin','superadmin') THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Acceso denegado: solo admin/superadmin puede guardar permisos');
    END IF;
    IF p_permissions IS NULL OR jsonb_typeof(p_permissions) <> 'object' THEN
        RETURN jsonb_build_object('ok', false, 'error', 'permissions inválidas (se espera un objeto JSON)');
    END IF;

    UPDATE public.user_roles
       SET permissions = p_permissions
     WHERE user_id = p_user_id;
    GET DIAGNOSTICS _rows = ROW_COUNT;
    IF _rows = 0 THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Usuario no encontrado en user_roles');
    END IF;

    RETURN jsonb_build_object('ok', true, 'permissions', p_permissions);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_update_user_permissions(UUID, JSONB) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.admin_update_user_permissions(UUID, JSONB) TO authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- 8. (Opcional) Migrar cuentas 'viewer' a 'lector' — descomentar si se desea
--    unificar la nomenclatura. 'viewer' seguirá funcionando si no se migra.
-- ────────────────────────────────────────────────────────────────────────────
-- UPDATE public.user_roles SET role = 'lector' WHERE role = 'viewer';

COMMIT;

-- Verificación rápida:
--   SELECT role, count(*) FROM public.user_roles GROUP BY role ORDER BY role;
--   SELECT public.user_access_level();
