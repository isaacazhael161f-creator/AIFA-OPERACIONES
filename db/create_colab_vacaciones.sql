-- =====================================================================
-- TABLA: colab_vacaciones
-- Registra los períodos de vacaciones de los colaboradores.
-- 20 días/año divididos en hasta 4 períodos de 5 días naturales cada uno.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.colab_vacaciones (
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    num_empleado    text        NOT NULL,
    nombre_colaborador text,
    anio            integer     NOT NULL,
    periodo_num     integer     CHECK (periodo_num BETWEEN 1 AND 4),
    fecha_inicio    date        NOT NULL,
    fecha_fin       date        NOT NULL,
    dias_totales    integer     GENERATED ALWAYS AS (fecha_fin - fecha_inicio + 1) STORED,
    estado          text        NOT NULL DEFAULT 'programado'
                                CHECK (estado IN ('programado', 'disfrutado', 'cancelado')),
    observaciones   text,
    creado_por      text,
    creado_en       timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT chk_vacaciones_fechas CHECK (fecha_fin >= fecha_inicio),
    CONSTRAINT chk_vacaciones_max5   CHECK (fecha_fin - fecha_inicio + 1 <= 5)
);

-- Índices para búsquedas frecuentes
CREATE INDEX IF NOT EXISTS idx_vac_empleado_anio ON public.colab_vacaciones (num_empleado, anio);
CREATE INDEX IF NOT EXISTS idx_vac_fechas        ON public.colab_vacaciones (fecha_inicio, fecha_fin);

-- =====================================================================
-- ROW LEVEL SECURITY
-- =====================================================================
ALTER TABLE public.colab_vacaciones ENABLE ROW LEVEL SECURITY;

-- Lectura: cualquier usuario autenticado puede ver todas las vacaciones
CREATE POLICY "vac_select" ON public.colab_vacaciones
    FOR SELECT TO authenticated
    USING (true);

-- Insertar: solo admin, editor, colab_editor
-- (el rol se guarda en la tabla user_roles, no en el JWT de Supabase,
--  así que la validación real se hace desde la aplicación y aquí
--  solo requerimos que el usuario esté autenticado)
CREATE POLICY "vac_insert" ON public.colab_vacaciones
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- Actualizar y eliminar: solo autenticados
CREATE POLICY "vac_update" ON public.colab_vacaciones
    FOR UPDATE TO authenticated
    USING (true) WITH CHECK (true);

CREATE POLICY "vac_delete" ON public.colab_vacaciones
    FOR DELETE TO authenticated
    USING (true);

-- =====================================================================
-- VISTA AUXILIAR: resumen de días por colaborador y año
-- =====================================================================
CREATE OR REPLACE VIEW public.v_vac_resumen AS
SELECT
    num_empleado,
    nombre_colaborador,
    anio,
    COUNT(*)                                    AS total_periodos,
    COALESCE(SUM(dias_totales), 0)              AS dias_usados,
    20 - COALESCE(SUM(dias_totales), 0)         AS dias_restantes,
    MAX(fecha_fin)                              AS ultima_vac
FROM public.colab_vacaciones
WHERE estado <> 'cancelado'
GROUP BY num_empleado, nombre_colaborador, anio;

-- =====================================================================
-- INSTRUCCIONES PARA EJECUTAR EN SUPABASE
-- =====================================================================
-- 1. Abre Supabase Dashboard → SQL Editor
-- 2. Pega y ejecuta este archivo completo
-- 3. Verifica en Table Editor que la tabla "colab_vacaciones" fue creada
-- 4. La vista "v_vac_resumen" estará disponible para queries rápidos
-- =====================================================================
