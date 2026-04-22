-- =============================================================================
-- ESQUEMA Y POLÍTICAS DE SEGURIDAD PARA AGENDA DE COMITÉS
-- =============================================================================

-- Este archivo define roles de área y políticas granulares (RLS) para la tabla `agenda_2026`
-- de manera que los usuarios sólo puedan editar o agregar eventos que correspondan
-- a su propia área.

-- 1. ASEGURAR QUE LA COLUMNA DE ÁREA EXISTA Y HABILITAR RLS
ALTER TABLE public.agenda_2026 ENABLE ROW LEVEL SECURITY;

-- 2. CREACIÓN O AJUSTE DE REGLAS BASADAS EN PERFILES/ÁREAS
-- Asumimos que los usuarios en Supabase tienen en su JWT (o en `public.colaboradores_roles`)
-- un campo `area` asignado. Aquí validamos contra los claims del usuario y/o sus roles.

-- 2.1 Política para permitir VER a todos los usuarios autenticados (opcional, ajusta según necesidad)
DROP POLICY IF EXISTS "agenda_2026: lectura general" ON public.agenda_2026;
CREATE POLICY "agenda_2026: lectura general"
    ON public.agenda_2026 FOR SELECT
    USING (auth.role() = 'authenticated');

-- 2.2 Política para INSERTAR eventos:
-- Un usuario sólo puede insertar eventos donde `area` coincida con su perfil asignado.
-- (Requiere que el valor 'area' del JWT o metadatos de usuario o de una tabla de `perfiles` coincida
--  con la columna área que intente usar el usuario. Si tienes otra estructura, cambia la validación).
DROP POLICY IF EXISTS "agenda_2026: insercion por area" ON public.agenda_2026;
CREATE POLICY "agenda_2026: insercion por area"
    ON public.agenda_2026 FOR INSERT
    WITH CHECK (
        -- Asume que guardamos el área en los metadata del auth:
        auth.jwt() -> 'app_metadata' ->> 'area' = area
        OR
        -- Si existe una tabla de roles, sería así:
        EXISTS (
            SELECT 1 FROM public.colaboradores_roles cr 
            WHERE cr.user_id = auth.uid() 
            AND cr.area = agenda_2026.area
        )
    );

-- 2.3 Política para ACTUALIZAR eventos:
-- Un usuario sólo puede modificar eventos creados por su misma área.
DROP POLICY IF EXISTS "agenda_2026: edicion por area" ON public.agenda_2026;
CREATE POLICY "agenda_2026: edicion por area"
    ON public.agenda_2026 FOR UPDATE
    USING (
        auth.jwt() -> 'app_metadata' ->> 'area' = area
        OR
        EXISTS (
            SELECT 1 FROM public.colaboradores_roles cr 
            WHERE cr.user_id = auth.uid() 
            AND cr.area = agenda_2026.area
        )
    )
    WITH CHECK (
        auth.jwt() -> 'app_metadata' ->> 'area' = area
        OR
        EXISTS (
            SELECT 1 FROM public.colaboradores_roles cr 
            WHERE cr.user_id = auth.uid() 
            AND cr.area = agenda_2026.area
        )
    );

-- 2.4 Política para ELIMINAR eventos:
-- Un usuario sólo puede borrar eventos de su misma área.
DROP POLICY IF EXISTS "agenda_2026: borrado por area" ON public.agenda_2026;
CREATE POLICY "agenda_2026: borrado por area"
    ON public.agenda_2026 FOR DELETE
    USING (
        auth.jwt() -> 'app_metadata' ->> 'area' = area
        OR
        EXISTS (
            SELECT 1 FROM public.colaboradores_roles cr 
            WHERE cr.user_id = auth.uid() 
            AND cr.area = agenda_2026.area
        )
    );

-- NOTA: Los administradores absolutos (ej. rol 'admin') deberían tener su propia política especial 
-- `USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')` para evadir las restricciones de área.

-- 3. CREAR UNA TABLA DE REFERENCIA DE ÁREAS (OPCIONAL) PARA USO ESTRICTO DE ESTILOS O CÓDIGOS
CREATE TABLE IF NOT EXISTS public.areas_config (
    id SERIAL PRIMARY KEY,
    acronimo VARCHAR(10) UNIQUE NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    color_text VARCHAR(7),
    color_bg VARCHAR(7)
);

-- Insertar colores iniciales según el nuevo esquema propuesto (Sin rojos/vinos):
INSERT INTO public.areas_config (acronimo, nombre, color_text, color_bg) VALUES
    ('DPE',  'Dir. Planeación Estratégica',   '#0d9488', '#f0fdfa'), -- Teal
    ('DA',   'Dir. Administración',           '#2563eb', '#eff6ff'), -- Blue
    ('GSO',  'Gestión Seg. Operacional',      '#3ac6ed', '#f5f3ff'), -- Violet
    ('DO',   'Dir. Operación',                '#059669', '#ecfdf5'), -- Emerald
    ('DCS',  'Dir. Comercial y Servicios',    '#d97706', '#fffbeb'), -- Amber
    ('GC',   'Gestión de Calidad',            '#9902c7', '#e0f2fe'), -- Sky
    ('AFAC', 'AFAC (Externo)',                '#4f46e5', '#eef2ff'), -- Indigo
    ('UT',   'Unidad Transparencia',          '#0891b2', '#cffafe')  -- Cyan
ON CONFLICT (acronimo) DO UPDATE SET 
    nombre = EXCLUDED.nombre,
    color_text = EXCLUDED.color_text,
    color_bg = EXCLUDED.color_bg;
