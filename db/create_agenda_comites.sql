-- =============================================================
--  AGENDA DE COMITÉS — AIFA OPERACIONES
--  Ejecutar en: Supabase > SQL Editor
--  Fecha: 2026-04-22
-- =============================================================
--
--  Áreas / Roles que pueden gestionar su propia información:
--    operaciones     → Comités de Operaciones / COyH / Demoras
--    control_fauna   → GSO / Fauna y Vida Silvestre
--    servicio_medico → Servicio Médico
--    abordadores     → Abordadores Mecánicos
--    colab_editor    → Colaboradores / RH
--    admin / editor  → Acceso total (lectura + escritura en todo)
--    viewer          → Solo lectura en todo
--
-- =============================================================

-- ─────────────────────────────────────────────────────────────
-- 0. AMPLIAR EL CONSTRAINT DE ROLES (añade 'operaciones' y 'abordadores')
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.user_roles
    DROP CONSTRAINT IF EXISTS user_roles_role_check;

-- Normalizar cualquier valor fuera de la lista nueva
UPDATE public.user_roles
SET role = 'viewer'
WHERE role IS NULL
   OR role NOT IN (
        'admin', 'editor', 'superadmin', 'viewer',
        'operaciones', 'control_fauna', 'servicio_medico',
        'abordadores', 'colab_viewer', 'colab_editor'
      );

ALTER TABLE public.user_roles
    ADD CONSTRAINT user_roles_role_check
    CHECK (role IN (
        'admin',
        'editor',
        'superadmin',
        'viewer',
        'operaciones',     -- Área de Operaciones / COyH
        'control_fauna',   -- GSO / Fauna
        'servicio_medico', -- Servicio Médico
        'abordadores',     -- Abordadores Mecánicos
        'colab_viewer',    -- Colaboradores / RH (solo lectura)
        'colab_editor'     -- Colaboradores / RH (lectura + edición)
    ));


-- ─────────────────────────────────────────────────────────────
-- 1. TABLA: agenda_comites
--    Catálogo de comités (cada comité pertenece a un área)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.agenda_comites (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre          TEXT        NOT NULL,
    descripcion     TEXT,
    area            TEXT        NOT NULL,   -- operaciones | control_fauna | servicio_medico | abordadores | colab_editor
    frecuencia      TEXT,                   -- Ej: "Mensual", "Bimestral", "Según convocatoria"
    presidente      TEXT,                   -- Quien preside
    participantes   TEXT[],                 -- Lista de áreas/cargos participantes
    activo          BOOLEAN     NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.agenda_comites IS 'Catálogo de comités por área';
COMMENT ON COLUMN public.agenda_comites.area IS 'Área dueña del comité: operaciones, control_fauna, servicio_medico, abordadores, colab_editor';


-- ─────────────────────────────────────────────────────────────
-- 2. TABLA: agenda_reuniones
--    Cada sesión/reunión de un comité
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.agenda_reuniones (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    comite_id       UUID        NOT NULL REFERENCES public.agenda_comites(id) ON DELETE CASCADE,
    area            TEXT        NOT NULL,   -- espejo del área del comité (para RLS eficiente)
    numero_sesion   TEXT,                   -- Ej: "Sesión Ordinaria 03/2026"
    fecha_sesion    DATE        NOT NULL,
    hora_inicio     TIME,
    hora_fin        TIME,
    lugar           TEXT        DEFAULT 'Sala de Juntas AIFA',
    modalidad       TEXT        DEFAULT 'Presencial',  -- Presencial | Virtual | Mixta
    estatus         TEXT        NOT NULL DEFAULT 'Programada'  -- Programada | Celebrada | Cancelada | Pospuesta
                    CHECK (estatus IN ('Programada','Celebrada','Cancelada','Pospuesta')),
    convocatoria    TEXT,                   -- Texto libre con el orden del día previo
    observaciones   TEXT,
    created_by      UUID        REFERENCES auth.users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.agenda_reuniones IS 'Sesiones/reuniones de cada comité';
CREATE INDEX IF NOT EXISTS idx_agenda_reuniones_comite    ON public.agenda_reuniones(comite_id);
CREATE INDEX IF NOT EXISTS idx_agenda_reuniones_area      ON public.agenda_reuniones(area);
CREATE INDEX IF NOT EXISTS idx_agenda_reuniones_fecha     ON public.agenda_reuniones(fecha_sesion);


-- ─────────────────────────────────────────────────────────────
-- 3. TABLA: agenda_temas
--    Puntos del orden del día de una reunión
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.agenda_temas (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    reunion_id      UUID        NOT NULL REFERENCES public.agenda_reuniones(id) ON DELETE CASCADE,
    area            TEXT        NOT NULL,   -- espejo del área de la reunión
    numero_punto    INTEGER     NOT NULL DEFAULT 1,
    titulo          TEXT        NOT NULL,
    descripcion     TEXT,
    responsable     TEXT,
    estatus         TEXT        NOT NULL DEFAULT 'Pendiente'
                    CHECK (estatus IN ('Pendiente','En proceso','Concluido','Diferido')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.agenda_temas IS 'Puntos del orden del día de cada sesión';
CREATE INDEX IF NOT EXISTS idx_agenda_temas_reunion ON public.agenda_temas(reunion_id);


-- ─────────────────────────────────────────────────────────────
-- 4. TABLA: agenda_acuerdos
--    Acuerdos y compromisos tomados en una reunión
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.agenda_acuerdos (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    reunion_id      UUID        NOT NULL REFERENCES public.agenda_reuniones(id) ON DELETE CASCADE,
    tema_id         UUID        REFERENCES public.agenda_temas(id) ON DELETE SET NULL,
    area            TEXT        NOT NULL,
    numero_acuerdo  TEXT,                   -- Ej: "ACU-01/03-2026"
    descripcion     TEXT        NOT NULL,
    responsable     TEXT,
    fecha_limite    DATE,
    estatus         TEXT        NOT NULL DEFAULT 'Pendiente'
                    CHECK (estatus IN ('Pendiente','En proceso','Cumplido','Cancelado')),
    evidencia_url   TEXT,                   -- Enlace a documento/evidencia en Supabase Storage
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.agenda_acuerdos IS 'Acuerdos y compromisos derivados de las reuniones';
CREATE INDEX IF NOT EXISTS idx_agenda_acuerdos_reunion ON public.agenda_acuerdos(reunion_id);
CREATE INDEX IF NOT EXISTS idx_agenda_acuerdos_area    ON public.agenda_acuerdos(area);


-- ─────────────────────────────────────────────────────────────
-- 5. TRIGGER: updated_at automático
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_comites_updated_at') THEN
        CREATE TRIGGER trg_comites_updated_at
            BEFORE UPDATE ON public.agenda_comites
            FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_reuniones_updated_at') THEN
        CREATE TRIGGER trg_reuniones_updated_at
            BEFORE UPDATE ON public.agenda_reuniones
            FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_temas_updated_at') THEN
        CREATE TRIGGER trg_temas_updated_at
            BEFORE UPDATE ON public.agenda_temas
            FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_acuerdos_updated_at') THEN
        CREATE TRIGGER trg_acuerdos_updated_at
            BEFORE UPDATE ON public.agenda_acuerdos
            FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
    END IF;
END $$;


-- ─────────────────────────────────────────────────────────────
-- 6. ROW LEVEL SECURITY (RLS)
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.agenda_comites   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agenda_reuniones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agenda_temas     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agenda_acuerdos  ENABLE ROW LEVEL SECURITY;

-- ── Helper: obtener el rol del usuario actual ──
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
    SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;


-- ── Función helper: ¿puede el usuario gestionar una área dada? ──
-- Reglas:
--   admin / editor / superadmin  → puede con CUALQUIER área
--   operaciones                  → solo área 'operaciones'
--   control_fauna                → solo área 'control_fauna'
--   servicio_medico              → solo área 'servicio_medico'
--   abordadores                  → solo área 'abordadores'
--   colab_editor                 → solo área 'colab_editor'
--   viewer / colab_viewer        → solo lectura (nunca escritura)

CREATE OR REPLACE FUNCTION public.agenda_puede_editar(p_area TEXT)
RETURNS BOOLEAN AS $$
DECLARE v_role TEXT;
BEGIN
    v_role := public.get_user_role();
    RETURN v_role IN ('admin', 'editor', 'superadmin')
        OR (v_role = 'operaciones'     AND p_area = 'operaciones')
        OR (v_role = 'control_fauna'   AND p_area = 'control_fauna')
        OR (v_role = 'servicio_medico' AND p_area = 'servicio_medico')
        OR (v_role = 'abordadores'     AND p_area = 'abordadores')
        OR (v_role = 'colab_editor'    AND p_area = 'colab_editor');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;


-- ── POLÍTICAS: agenda_comites ──

DROP POLICY IF EXISTS "agenda_comites_select" ON public.agenda_comites;
CREATE POLICY "agenda_comites_select"
    ON public.agenda_comites FOR SELECT
    USING (
        public.get_user_role() IS NOT NULL   -- cualquier usuario autenticado con rol puede leer
    );

DROP POLICY IF EXISTS "agenda_comites_insert" ON public.agenda_comites;
CREATE POLICY "agenda_comites_insert"
    ON public.agenda_comites FOR INSERT
    WITH CHECK (
        public.agenda_puede_editar(area)
    );

DROP POLICY IF EXISTS "agenda_comites_update" ON public.agenda_comites;
CREATE POLICY "agenda_comites_update"
    ON public.agenda_comites FOR UPDATE
    USING (public.agenda_puede_editar(area))
    WITH CHECK (public.agenda_puede_editar(area));

DROP POLICY IF EXISTS "agenda_comites_delete" ON public.agenda_comites;
CREATE POLICY "agenda_comites_delete"
    ON public.agenda_comites FOR DELETE
    USING (public.agenda_puede_editar(area));


-- ── POLÍTICAS: agenda_reuniones ──

DROP POLICY IF EXISTS "agenda_reuniones_select" ON public.agenda_reuniones;
CREATE POLICY "agenda_reuniones_select"
    ON public.agenda_reuniones FOR SELECT
    USING (public.get_user_role() IS NOT NULL);

DROP POLICY IF EXISTS "agenda_reuniones_insert" ON public.agenda_reuniones;
CREATE POLICY "agenda_reuniones_insert"
    ON public.agenda_reuniones FOR INSERT
    WITH CHECK (public.agenda_puede_editar(area));

DROP POLICY IF EXISTS "agenda_reuniones_update" ON public.agenda_reuniones;
CREATE POLICY "agenda_reuniones_update"
    ON public.agenda_reuniones FOR UPDATE
    USING (public.agenda_puede_editar(area))
    WITH CHECK (public.agenda_puede_editar(area));

DROP POLICY IF EXISTS "agenda_reuniones_delete" ON public.agenda_reuniones;
CREATE POLICY "agenda_reuniones_delete"
    ON public.agenda_reuniones FOR DELETE
    USING (public.agenda_puede_editar(area));


-- ── POLÍTICAS: agenda_temas ──

DROP POLICY IF EXISTS "agenda_temas_select" ON public.agenda_temas;
CREATE POLICY "agenda_temas_select"
    ON public.agenda_temas FOR SELECT
    USING (public.get_user_role() IS NOT NULL);

DROP POLICY IF EXISTS "agenda_temas_insert" ON public.agenda_temas;
CREATE POLICY "agenda_temas_insert"
    ON public.agenda_temas FOR INSERT
    WITH CHECK (public.agenda_puede_editar(area));

DROP POLICY IF EXISTS "agenda_temas_update" ON public.agenda_temas;
CREATE POLICY "agenda_temas_update"
    ON public.agenda_temas FOR UPDATE
    USING (public.agenda_puede_editar(area))
    WITH CHECK (public.agenda_puede_editar(area));

DROP POLICY IF EXISTS "agenda_temas_delete" ON public.agenda_temas;
CREATE POLICY "agenda_temas_delete"
    ON public.agenda_temas FOR DELETE
    USING (public.agenda_puede_editar(area));


-- ── POLÍTICAS: agenda_acuerdos ──

DROP POLICY IF EXISTS "agenda_acuerdos_select" ON public.agenda_acuerdos;
CREATE POLICY "agenda_acuerdos_select"
    ON public.agenda_acuerdos FOR SELECT
    USING (public.get_user_role() IS NOT NULL);

DROP POLICY IF EXISTS "agenda_acuerdos_insert" ON public.agenda_acuerdos;
CREATE POLICY "agenda_acuerdos_insert"
    ON public.agenda_acuerdos FOR INSERT
    WITH CHECK (public.agenda_puede_editar(area));

DROP POLICY IF EXISTS "agenda_acuerdos_update" ON public.agenda_acuerdos;
CREATE POLICY "agenda_acuerdos_update"
    ON public.agenda_acuerdos FOR UPDATE
    USING (public.agenda_puede_editar(area))
    WITH CHECK (public.agenda_puede_editar(area));

DROP POLICY IF EXISTS "agenda_acuerdos_delete" ON public.agenda_acuerdos;
CREATE POLICY "agenda_acuerdos_delete"
    ON public.agenda_acuerdos FOR DELETE
    USING (public.agenda_puede_editar(area));


-- ─────────────────────────────────────────────────────────────
-- 7. DATOS INICIALES — Comités pre-cargados de las áreas existentes
-- ─────────────────────────────────────────────────────────────

INSERT INTO public.agenda_comites (nombre, descripcion, area, frecuencia, presidente, participantes)
VALUES
(
    'Comité de Operación y Horarios (COyH)',
    'Órgano colegiado que sesiona al menos una vez al mes. Determina responsables de demoras y cancelaciones, propone acciones de mejora y aprueba el reglamento interno. Presidido por el Administrador del aeropuerto.',
    'operaciones',
    'Mensual',
    'Administrador del aeropuerto',
    ARRAY['Comandante del aeropuerto','Autoridades civiles y militares','Transportistas aéreos','Prestadores de servicios aeroportuarios','SENEAM']
),
(
    'Subcomité de Demoras',
    'Subcomité del COyH presidido por el Comandante. Analiza causas de demoras y cancelaciones y establece responsabilidades.',
    'operaciones',
    'Mensual (dentro del COyH)',
    'Comandante del aeropuerto',
    ARRAY['Aerolíneas','Handling','Control de tránsito aéreo','Aduana','Migración']
),
(
    'Comité de Control de Fauna y Vida Silvestre',
    'Supervisa el programa de control de fauna en el aeropuerto, evalúa incidentes/impactos y actualiza el Manual de Gestión de Riesgo Aviario.',
    'control_fauna',
    'Bimestral',
    'Jefe de GSO',
    ARRAY['GSO','Operaciones','Mantenimiento','Torre de Control (SENEAM)']
),
(
    'Comité de Servicio Médico',
    'Revisa estadísticas de atención médica, protocolos de emergencia, equipamiento y coordinación con hospitales externos.',
    'servicio_medico',
    'Bimestral',
    'Médico Coordinador',
    ARRAY['Servicio Médico','Operaciones','Seguridad']
),
(
    'Comité de Abordadores Mecánicos',
    'Revisa el estado del equipo de abordadores mecánicos (PBB), mantenimiento preventivo y correctivo, incidentes y acciones correctivas.',
    'abordadores',
    'Mensual',
    'Jefe de Abordadores',
    ARRAY['Abordadores Mecánicos','Mantenimiento','Operaciones','Aerolíneas']
),
(
    'Comité de Recursos Humanos / Colaboradores',
    'Revisa temas de personal, capacitación, evaluaciones, reconocimientos y gestión documental de colaboradores.',
    'colab_editor',
    'Mensual',
    'Jefe de Recursos Humanos',
    ARRAY['RH','Dirección','Operaciones']
)
ON CONFLICT DO NOTHING;
