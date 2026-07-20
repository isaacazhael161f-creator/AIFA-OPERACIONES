-- ============================================================
-- RLS · ENFORCEMENT DE NIVEL read / capture / edit (WRITE-LEVELS)
-- EJECUTAR EN SUPABASE SQL EDITOR
-- ------------------------------------------------------------
-- PROBLEMA QUE RESUELVE
--   El archivo db/rls_section_permissions.sql protege las
--   escrituras con public.user_can_access_section(), que SOLO
--   verifica si el usuario TIENE la sección (visibilidad).
--   NO distingue entre "solo ver", "capturar" y "editar".
--   Resultado: un usuario marcado como "Solo ver" en un módulo
--   (p.ej. Hidráulicas) SÍ podía guardar datos a nivel de base
--   de datos, aunque el frontend lo bloqueara.
--
-- QUÉ HACE ESTE ARCHIVO
--   Endurece (o crea) las políticas de ESCRITURA de las tablas
--   de captura para que respeten el nivel por módulo:
--     · INSERT / UPDATE  ->  user_can_capture_section(sec)
--       (nivel capture, edit o admin; permite UPSERT de capturistas)
--     · DELETE           ->  user_can_edit_section(sec)
--       (solo nivel edit o admin)
--   Las LECTURAS no se restringen aquí (SELECT abierto a
--   'authenticated') para no romper dashboards ni consumos
--   cruzados entre módulos. Donde ya existía política de SELECT
--   por sección (fauna, abordadores) se conserva intacta.
--
-- REQUISITO PREVIO (ejecutar ANTES que este archivo):
--   db/rbac_roles_v2.sql  -> crea las funciones:
--     public.user_can_capture_section(TEXT)
--     public.user_can_edit_section(TEXT)
--   (SECURITY DEFINER, GRANT a authenticated). Si no existen,
--   este script fallará con "function ... does not exist".
--
-- SEGURIDAD / IDEMPOTENCIA
--   · Todo usa DROP POLICY IF EXISTS + CREATE (re-ejecutable).
--   · admin/superadmin siempre pasan (dentro de los helpers).
--   · service_role (server.js) IGNORA RLS: no se ve afectado.
--   · Solo afecta tablas de módulos detrás de login (rol
--     'authenticated'). No toca tablas de displays públicos
--     (fids_vuelos, tv_notas, etc.).
-- ============================================================

-- Verificación temprana: las funciones helper deben existir.
DO $$
BEGIN
    IF to_regprocedure('public.user_can_capture_section(text)') IS NULL
       OR to_regprocedure('public.user_can_edit_section(text)') IS NULL THEN
        RAISE EXCEPTION
            'Faltan los helpers user_can_capture_section / user_can_edit_section. Ejecuta primero db/rbac_roles_v2.sql (sección 6).';
    END IF;
END $$;


-- ════════════════════════════════════════════════════════════
-- Helper local para no repetir bloques: crea las 3 políticas de
-- escritura (INSERT+UPDATE = capture, DELETE = edit) sobre una
-- tabla, más una política de SELECT permisiva a authenticated
-- si la tabla aún no tiene ninguna. p_prefix debe ser único.
-- ════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public._rls_apply_write_levels(
    p_table   regclass,
    p_section text,
    p_prefix  text,
    p_add_select boolean DEFAULT true
) RETURNS void
LANGUAGE plpgsql
AS $fn$
BEGIN
    EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', p_table);

    -- SELECT permisivo (solo si se pide; no rompe lecturas cruzadas)
    IF p_add_select THEN
        EXECUTE format('DROP POLICY IF EXISTS %I ON %s', p_prefix || '_select', p_table);
        EXECUTE format(
            'CREATE POLICY %I ON %s FOR SELECT TO authenticated USING (true)',
            p_prefix || '_select', p_table);
    END IF;

    -- INSERT -> capture
    EXECUTE format('DROP POLICY IF EXISTS %I ON %s', p_prefix || '_insert', p_table);
    EXECUTE format(
        'CREATE POLICY %I ON %s FOR INSERT TO authenticated WITH CHECK (public.user_can_capture_section(%L))',
        p_prefix || '_insert', p_table, p_section);

    -- UPDATE -> capture (permite corregir/UPSERT del mismo capturista)
    EXECUTE format('DROP POLICY IF EXISTS %I ON %s', p_prefix || '_update', p_table);
    EXECUTE format(
        'CREATE POLICY %I ON %s FOR UPDATE TO authenticated USING (public.user_can_capture_section(%L)) WITH CHECK (public.user_can_capture_section(%L))',
        p_prefix || '_update', p_table, p_section, p_section);

    -- DELETE -> edit
    EXECUTE format('DROP POLICY IF EXISTS %I ON %s', p_prefix || '_delete', p_table);
    EXECUTE format(
        'CREATE POLICY %I ON %s FOR DELETE TO authenticated USING (public.user_can_edit_section(%L))',
        p_prefix || '_delete', p_table, p_section);
END;
$fn$;


-- ════════════════════════════════════════════════════════════
-- HIDRÁULICAS  (caso reportado)  · sección 'hidraulicas'
-- Nombres con acentos/mayúsculas -> requieren comillas dobles.
-- ════════════════════════════════════════════════════════════
SELECT public._rls_apply_write_levels('public."Extracción_agua_diaria"',  'hidraulicas', 'hidra_agua');
SELECT public._rls_apply_write_levels('public."Suministro_paap_diario"',  'hidraulicas', 'hidra_paap');
SELECT public._rls_apply_write_levels('public."Tratamiento_ptar_diario"', 'hidraulicas', 'hidra_ptar');


-- ════════════════════════════════════════════════════════════
-- COMBUSTIBLES · sección 'combustibles'
-- ════════════════════════════════════════════════════════════
SELECT public._rls_apply_write_levels('public.combustible_aviacion', 'combustibles', 'comb');


-- ════════════════════════════════════════════════════════════
-- (EXCLUIDOS A PROPÓSITO) SSEI e Ingeniería Civil
--   atencion_derrames, emergencias_pista, vidrios_etp, filtraciones_etp
--   Sus escritores usan roles de DOMINIO ('ssei', 'ingenieria') que
--   public.user_access_level() mapea a 'read' (caen en el ELSE). Aplicar
--   aquí gating por user_can_capture_section los BLOQUEARÍA de escribir
--   su propio módulo. Se protegen del lado cliente (canEdit respeta el
--   override explícito "solo ver") hasta reconciliar el mapeo de roles.
-- ════════════════════════════════════════════════════════════


-- ════════════════════════════════════════════════════════════
-- GTRANS · Preventivos · sección 'gtrans-preventivos'
-- (Escritores: solo admin/superadmin/editor -> roles centrales; seguro)
-- ════════════════════════════════════════════════════════════
SELECT public._rls_apply_write_levels('public.gtrans_preventivo_mensual', 'gtrans-preventivos', 'gtp_prev');


-- ════════════════════════════════════════════════════════════
-- GTRANS · Energía · sección 'gtrans-energia'
-- ════════════════════════════════════════════════════════════
SELECT public._rls_apply_write_levels('public.gtrans_mantenimientos_bt', 'gtrans-energia', 'gte_bt');
SELECT public._rls_apply_write_levels('public.gtrans_meta_anual',        'gtrans-energia', 'gte_meta');


-- ════════════════════════════════════════════════════════════
-- GGEN · Energía · sección 'ggen-energia'
-- ════════════════════════════════════════════════════════════
SELECT public._rls_apply_write_levels('public.ggen_energia_electrica', 'ggen-energia', 'gge_elec');
SELECT public._rls_apply_write_levels('public.ggen_energia_termica',   'ggen-energia', 'gge_term');
SELECT public._rls_apply_write_levels('public.ggen_consumo_gas',       'ggen-energia', 'gge_gas');


-- ════════════════════════════════════════════════════════════
-- FAUNA · sección 'fauna'
-- Ya tenía políticas de escritura por user_can_access_section en
-- db/rls_section_permissions.sql. Aquí las REEMPLAZAMOS por
-- políticas por nivel. SELECT se conserva (no se toca).
-- ════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "fauna_section_insert" ON public.wildlife_strikes;
DROP POLICY IF EXISTS "fauna_section_update" ON public.wildlife_strikes;
DROP POLICY IF EXISTS "fauna_section_delete" ON public.wildlife_strikes;
SELECT public._rls_apply_write_levels('public.wildlife_strikes', 'fauna', 'fauna_lvl', false);

DROP POLICY IF EXISTS "fauna_rescued_insert" ON public.rescued_wildlife;
DROP POLICY IF EXISTS "fauna_rescued_update" ON public.rescued_wildlife;
DROP POLICY IF EXISTS "fauna_rescued_delete" ON public.rescued_wildlife;
SELECT public._rls_apply_write_levels('public.rescued_wildlife', 'fauna', 'fauna_resc_lvl', false);


-- ════════════════════════════════════════════════════════════
-- NOTAS / NO INCLUIDAS DELIBERADAMENTE (revisar caso por caso):
--   · SSEI (atencion_derrames, emergencias_pista) e Ingeniería Civil
--     (vidrios_etp, filtraciones_etp) -> escritores con roles de
--     DOMINIO ('ssei','ingenieria') que user_access_level() manda a
--     'read'. Gating por nivel los bloquearía. Protección: cliente
--     (canEdit respeta override "solo ver"). Para RLS real habría que
--     reconciliar user_access_level (añadir esos roles) primero.
--   · abordadores (ordenes_servicio_aerocares,
--     registros_servicio_aeropasillos) -> rol de dominio desconocido;
--     se dejan con su RLS por acceso de rls_section_permissions.sql
--     hasta confirmar quién escribe.
--   · catalogo_vehiculos  -> ya tiene RLS admin-only en
--     db/create_catalogo_vehiculos.sql (sección 'coord-auditoria').
--     Es más estricto (solo admin escribe); no se modifica.
--   · agenda_* / parte_operations / custom_parte_operaciones /
--     medical_* -> conservan su RLS por acceso de
--     rls_section_permissions.sql (flujos propios, p.ej. agenda
--     usa lógica por área). No se endurecen aquí para no romperlos.
--   · Demoras -> escrita por 2 secciones (demoras y
--     analisis-operaciones); mapeo ambiguo, requiere decisión.
--   · fids_vuelos / tv_notas -> displays potencialmente públicos
--     (rol anon); habilitar RLS podría romperlos. NO tocar sin
--     confirmar que no se leen sin sesión.
--   · weekly_frequencies* / airlines / Aerolíneas /
--     daily_flights_ops / manifiestos* -> data-management.js
--     (genérico, multi-sección); requiere mapeo fino aparte.
-- ════════════════════════════════════════════════════════════


-- ── Limpieza: eliminar el helper temporal ───────────────────
DROP FUNCTION IF EXISTS public._rls_apply_write_levels(regclass, text, text, boolean);


-- ════════════════════════════════════════════════════════════
-- VERIFICACIÓN (opcional): lista las políticas resultantes.
-- ════════════════════════════════════════════════════════════
-- SELECT schemaname, tablename, policyname, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename IN (
--   'Extracción_agua_diaria','Suministro_paap_diario','Tratamiento_ptar_diario',
--   'combustible_aviacion','gtrans_preventivo_mensual',
--   'gtrans_mantenimientos_bt','gtrans_meta_anual',
--   'ggen_energia_electrica','ggen_energia_termica','ggen_consumo_gas',
--   'wildlife_strikes','rescued_wildlife'
-- )
-- ORDER BY tablename, cmd;
