-- ============================================================
-- EJECUTAR EN SUPABASE SQL EDITOR
-- RLS basado en allowed_sections del usuario
-- Protege tablas sensibles a nivel de base de datos:
-- aunque alguien bypasee el frontend, no puede leer datos
-- de secciones a las que no tiene acceso.
-- ============================================================

-- ── Función auxiliar ─────────────────────────────────────────
-- Devuelve TRUE si el usuario actual tiene acceso a la sección.
-- Reglas:
--   1. admin / superadmin: siempre TRUE
--   2. Sin allowed_sections (NULL o vacío): TRUE (sin restricción)
--   3. Con allowed_sections: solo si contiene la sección pedida
CREATE OR REPLACE FUNCTION public.user_can_access_section(p_section TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
    v_role       TEXT;
    v_sections   JSONB;
BEGIN
    SELECT role, permissions->'allowed_sections'
    INTO v_role, v_sections
    FROM public.user_roles
    WHERE user_id = auth.uid();

    -- Sin registro: denegar
    IF v_role IS NULL THEN RETURN FALSE; END IF;

    -- Admin/superadmin: acceso total siempre
    IF v_role IN ('admin', 'superadmin') THEN RETURN TRUE; END IF;

    -- Sin allowed_sections configurado: acceso total
    IF v_sections IS NULL OR jsonb_array_length(v_sections) = 0 THEN RETURN TRUE; END IF;

    -- Verificar si la sección está en la lista
    RETURN v_sections ? p_section;
END;
$$;

GRANT EXECUTE ON FUNCTION public.user_can_access_section(TEXT) TO authenticated;


-- ════════════════════════════════════════════════════════════
-- GSO / Control Fauna
-- ════════════════════════════════════════════════════════════

ALTER TABLE public.wildlife_strikes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rescued_wildlife  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fauna_section_select" ON public.wildlife_strikes;
CREATE POLICY "fauna_section_select"
    ON public.wildlife_strikes FOR SELECT TO authenticated
    USING (public.user_can_access_section('fauna'));

DROP POLICY IF EXISTS "fauna_section_insert" ON public.wildlife_strikes;
CREATE POLICY "fauna_section_insert"
    ON public.wildlife_strikes FOR INSERT TO authenticated
    WITH CHECK (public.user_can_access_section('fauna'));

DROP POLICY IF EXISTS "fauna_section_update" ON public.wildlife_strikes;
CREATE POLICY "fauna_section_update"
    ON public.wildlife_strikes FOR UPDATE TO authenticated
    USING (public.user_can_access_section('fauna'));

DROP POLICY IF EXISTS "fauna_section_delete" ON public.wildlife_strikes;
CREATE POLICY "fauna_section_delete"
    ON public.wildlife_strikes FOR DELETE TO authenticated
    USING (public.user_can_access_section('fauna'));

-- Rescued wildlife
DROP POLICY IF EXISTS "fauna_rescued_select" ON public.rescued_wildlife;
CREATE POLICY "fauna_rescued_select"
    ON public.rescued_wildlife FOR SELECT TO authenticated
    USING (public.user_can_access_section('fauna'));

DROP POLICY IF EXISTS "fauna_rescued_insert" ON public.rescued_wildlife;
CREATE POLICY "fauna_rescued_insert"
    ON public.rescued_wildlife FOR INSERT TO authenticated
    WITH CHECK (public.user_can_access_section('fauna'));

DROP POLICY IF EXISTS "fauna_rescued_update" ON public.rescued_wildlife;
CREATE POLICY "fauna_rescued_update"
    ON public.rescued_wildlife FOR UPDATE TO authenticated
    USING (public.user_can_access_section('fauna'));

DROP POLICY IF EXISTS "fauna_rescued_delete" ON public.rescued_wildlife;
CREATE POLICY "fauna_rescued_delete"
    ON public.rescued_wildlife FOR DELETE TO authenticated
    USING (public.user_can_access_section('fauna'));


-- ════════════════════════════════════════════════════════════
-- Servicio Médico
-- ════════════════════════════════════════════════════════════

ALTER TABLE public.medical_history   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_attentions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "medicas_select" ON public.medical_history;
CREATE POLICY "medicas_select"
    ON public.medical_history FOR SELECT TO authenticated
    USING (public.user_can_access_section('medicas'));

DROP POLICY IF EXISTS "medicas_insert" ON public.medical_history;
CREATE POLICY "medicas_insert"
    ON public.medical_history FOR INSERT TO authenticated
    WITH CHECK (public.user_can_access_section('medicas'));

DROP POLICY IF EXISTS "medicas_update" ON public.medical_history;
CREATE POLICY "medicas_update"
    ON public.medical_history FOR UPDATE TO authenticated
    USING (public.user_can_access_section('medicas'));

DROP POLICY IF EXISTS "medicas_delete" ON public.medical_history;
CREATE POLICY "medicas_delete"
    ON public.medical_history FOR DELETE TO authenticated
    USING (public.user_can_access_section('medicas'));

DROP POLICY IF EXISTS "medicas_attentions_select" ON public.medical_attentions;
CREATE POLICY "medicas_attentions_select"
    ON public.medical_attentions FOR SELECT TO authenticated
    USING (public.user_can_access_section('medicas'));

DROP POLICY IF EXISTS "medicas_attentions_insert" ON public.medical_attentions;
CREATE POLICY "medicas_attentions_insert"
    ON public.medical_attentions FOR INSERT TO authenticated
    WITH CHECK (public.user_can_access_section('medicas'));

DROP POLICY IF EXISTS "medicas_attentions_update" ON public.medical_attentions;
CREATE POLICY "medicas_attentions_update"
    ON public.medical_attentions FOR UPDATE TO authenticated
    USING (public.user_can_access_section('medicas'));


-- ════════════════════════════════════════════════════════════
-- Abordadores Mecánicos
-- ════════════════════════════════════════════════════════════

ALTER TABLE public.ordenes_servicio_aerocares       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registros_servicio_aeropasillos  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "abordadores_select" ON public.ordenes_servicio_aerocares;
CREATE POLICY "abordadores_select"
    ON public.ordenes_servicio_aerocares FOR SELECT TO authenticated
    USING (public.user_can_access_section('abordadores-mecanicos'));

DROP POLICY IF EXISTS "abordadores_insert" ON public.ordenes_servicio_aerocares;
CREATE POLICY "abordadores_insert"
    ON public.ordenes_servicio_aerocares FOR INSERT TO authenticated
    WITH CHECK (public.user_can_access_section('abordadores-mecanicos'));

DROP POLICY IF EXISTS "abordadores_update" ON public.ordenes_servicio_aerocares;
CREATE POLICY "abordadores_update"
    ON public.ordenes_servicio_aerocares FOR UPDATE TO authenticated
    USING (public.user_can_access_section('abordadores-mecanicos'));

DROP POLICY IF EXISTS "aeropasillos_select" ON public.registros_servicio_aeropasillos;
CREATE POLICY "aeropasillos_select"
    ON public.registros_servicio_aeropasillos FOR SELECT TO authenticated
    USING (public.user_can_access_section('abordadores-mecanicos'));

DROP POLICY IF EXISTS "aeropasillos_insert" ON public.registros_servicio_aeropasillos;
CREATE POLICY "aeropasillos_insert"
    ON public.registros_servicio_aeropasillos FOR INSERT TO authenticated
    WITH CHECK (public.user_can_access_section('abordadores-mecanicos'));

DROP POLICY IF EXISTS "aeropasillos_update" ON public.registros_servicio_aeropasillos;
CREATE POLICY "aeropasillos_update"
    ON public.registros_servicio_aeropasillos FOR UPDATE TO authenticated
    USING (public.user_can_access_section('abordadores-mecanicos'));


-- ════════════════════════════════════════════════════════════
-- Agenda de Comités
-- ════════════════════════════════════════════════════════════

ALTER TABLE public.agenda_comites   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agenda_reuniones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agenda_acuerdos  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agenda_temas     ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agenda_comites_select" ON public.agenda_comites;
CREATE POLICY "agenda_comites_select"
    ON public.agenda_comites FOR SELECT TO authenticated
    USING (public.user_can_access_section('agenda'));

DROP POLICY IF EXISTS "agenda_comites_write" ON public.agenda_comites;
CREATE POLICY "agenda_comites_write"
    ON public.agenda_comites FOR ALL TO authenticated
    USING (public.user_can_access_section('agenda'))
    WITH CHECK (public.user_can_access_section('agenda'));

DROP POLICY IF EXISTS "agenda_reuniones_select" ON public.agenda_reuniones;
CREATE POLICY "agenda_reuniones_select"
    ON public.agenda_reuniones FOR SELECT TO authenticated
    USING (public.user_can_access_section('agenda'));

DROP POLICY IF EXISTS "agenda_reuniones_write" ON public.agenda_reuniones;
CREATE POLICY "agenda_reuniones_write"
    ON public.agenda_reuniones FOR ALL TO authenticated
    USING (public.user_can_access_section('agenda'))
    WITH CHECK (public.user_can_access_section('agenda'));

DROP POLICY IF EXISTS "agenda_acuerdos_select" ON public.agenda_acuerdos;
CREATE POLICY "agenda_acuerdos_select"
    ON public.agenda_acuerdos FOR SELECT TO authenticated
    USING (public.user_can_access_section('agenda'));

DROP POLICY IF EXISTS "agenda_acuerdos_write" ON public.agenda_acuerdos;
CREATE POLICY "agenda_acuerdos_write"
    ON public.agenda_acuerdos FOR ALL TO authenticated
    USING (public.user_can_access_section('agenda'))
    WITH CHECK (public.user_can_access_section('agenda'));

DROP POLICY IF EXISTS "agenda_temas_select" ON public.agenda_temas;
CREATE POLICY "agenda_temas_select"
    ON public.agenda_temas FOR SELECT TO authenticated
    USING (public.user_can_access_section('agenda'));

DROP POLICY IF EXISTS "agenda_temas_write" ON public.agenda_temas;
CREATE POLICY "agenda_temas_write"
    ON public.agenda_temas FOR ALL TO authenticated
    USING (public.user_can_access_section('agenda'))
    WITH CHECK (public.user_can_access_section('agenda'));


-- ════════════════════════════════════════════════════════════
-- Datos de Operaciones (parte_operations, custom_parte_operaciones)
-- Aplica para secciones de operaciones en general
-- ════════════════════════════════════════════════════════════

ALTER TABLE public.parte_operations         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_parte_operaciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "parte_ops_select" ON public.parte_operations;
CREATE POLICY "parte_ops_select"
    ON public.parte_operations FOR SELECT TO authenticated
    USING (public.user_can_access_section('parte-operaciones'));

DROP POLICY IF EXISTS "parte_ops_write" ON public.parte_operations;
CREATE POLICY "parte_ops_write"
    ON public.parte_operations FOR ALL TO authenticated
    USING (public.user_can_access_section('parte-operaciones'))
    WITH CHECK (public.user_can_access_section('parte-operaciones'));

DROP POLICY IF EXISTS "custom_parte_select" ON public.custom_parte_operaciones;
CREATE POLICY "custom_parte_select"
    ON public.custom_parte_operaciones FOR SELECT TO authenticated
    USING (public.user_can_access_section('parte-operaciones'));

DROP POLICY IF EXISTS "custom_parte_write" ON public.custom_parte_operaciones;
CREATE POLICY "custom_parte_write"
    ON public.custom_parte_operaciones FOR ALL TO authenticated
    USING (public.user_can_access_section('parte-operaciones'))
    WITH CHECK (public.user_can_access_section('parte-operaciones'));
