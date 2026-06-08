-- ============================================================
-- Catálogo de Vehículos Terrestres de Cargo
-- Dirección de Operación — AIFA
-- Sección: Coordinación de Auditoría
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- ── 1. Tabla principal ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.catalogo_vehiculos (
    id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    -- Identificación
    codigo_aifa         TEXT NOT NULL UNIQUE,        -- "AIFA-08"
    tipo_vehiculo       TEXT NOT NULL,               -- "Camioneta", "Automóvil", "Motocicleta", "Camión"
    marca               TEXT NOT NULL,               -- "Ford"
    submarca            TEXT,                        -- "Ranger"
    anio_modelo         INTEGER,                     -- 2022
    color               TEXT DEFAULT 'Blanco',

    -- Registros oficiales
    numero_serie        TEXT,                        -- VIN: "8AF6R5DV0N6261368"
    numero_economico    TEXT,                        -- Número económico visible en el vehículo
    placas              TEXT,                        -- "2393303 / NZV4423"

    -- Características técnicas
    combustible         TEXT DEFAULT 'Gasolina',     -- "Diesel", "Gasolina", "Eléctrico", "Híbrido"
    transmision         TEXT DEFAULT 'Automática',   -- "Automática", "Manual"
    capacidad_pasajeros INTEGER DEFAULT 5,

    -- Seguro
    aseguradora         TEXT,                        -- "GNP", "HDI", "AXA"
    poliza_numero       TEXT,
    poliza_descripcion  TEXT,                        -- Texto libre de la póliza
    vigencia_seguro     DATE,                        -- Fecha de vencimiento de la póliza

    -- Estado operativo
    estado              TEXT DEFAULT 'Activo'
                        CHECK (estado IN ('Activo', 'Mantenimiento', 'Baja')),
    area_responsable    TEXT DEFAULT 'Dirección de Operación',
    responsable_nombre  TEXT,                        -- Nombre del responsable asignado

    -- Media
    imagen_url          TEXT,                        -- URL pública en Supabase Storage

    -- Notas / Observaciones
    notas               TEXT,

    -- Auditoría
    created_at          TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at          TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_by          UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- ── 2. Índices para búsquedas frecuentes ────────────────────
CREATE INDEX IF NOT EXISTS idx_vehiculos_codigo
    ON public.catalogo_vehiculos(codigo_aifa);

CREATE INDEX IF NOT EXISTS idx_vehiculos_estado
    ON public.catalogo_vehiculos(estado);

CREATE INDEX IF NOT EXISTS idx_vehiculos_tipo
    ON public.catalogo_vehiculos(tipo_vehiculo);

CREATE INDEX IF NOT EXISTS idx_vehiculos_vigencia
    ON public.catalogo_vehiculos(vigencia_seguro);

-- ── 3. Trigger: actualizar updated_at automáticamente ────────
CREATE OR REPLACE FUNCTION public.update_catalogo_vehiculos_ts()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_vehiculos_updated_at ON public.catalogo_vehiculos;
CREATE TRIGGER trg_vehiculos_updated_at
    BEFORE UPDATE ON public.catalogo_vehiculos
    FOR EACH ROW EXECUTE FUNCTION public.update_catalogo_vehiculos_ts();

-- ── 4. Función auxiliar de permisos por sección ──────────────
-- (Se crea aquí si no existe; es idempotente con CREATE OR REPLACE)
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

    IF v_role IS NULL THEN RETURN FALSE; END IF;
    IF v_role IN ('admin', 'superadmin') THEN RETURN TRUE; END IF;
    IF v_sections IS NULL OR jsonb_array_length(v_sections) = 0 THEN RETURN TRUE; END IF;
    RETURN v_sections ? p_section;
END;
$$;

GRANT EXECUTE ON FUNCTION public.user_can_access_section(TEXT) TO authenticated;

-- ── 5. Row Level Security ────────────────────────────────────
ALTER TABLE public.catalogo_vehiculos ENABLE ROW LEVEL SECURITY;

-- Lectura: cualquier usuario autenticado con acceso a la sección
DROP POLICY IF EXISTS "vehiculos_select" ON public.catalogo_vehiculos;
CREATE POLICY "vehiculos_select"
    ON public.catalogo_vehiculos FOR SELECT TO authenticated
    USING (public.user_can_access_section('coord-auditoria'));

-- Insertar: solo admins
DROP POLICY IF EXISTS "vehiculos_insert" ON public.catalogo_vehiculos;
CREATE POLICY "vehiculos_insert"
    ON public.catalogo_vehiculos FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin')
        )
    );

-- Actualizar: solo admins
DROP POLICY IF EXISTS "vehiculos_update" ON public.catalogo_vehiculos;
CREATE POLICY "vehiculos_update"
    ON public.catalogo_vehiculos FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin')
        )
    );

-- Eliminar: solo admins
DROP POLICY IF EXISTS "vehiculos_delete" ON public.catalogo_vehiculos;
CREATE POLICY "vehiculos_delete"
    ON public.catalogo_vehiculos FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin')
        )
    );

-- ── 6. Storage bucket para fotos ─────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'vehiculos-fotos',
    'vehiculos-fotos',
    true,
    5242880,  -- 5 MB máximo por foto
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Lectura pública (las fotos son acceso abierto para el dashboard)
DROP POLICY IF EXISTS "veh_fotos_public_read" ON storage.objects;
CREATE POLICY "veh_fotos_public_read"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'vehiculos-fotos');

-- Subida: solo admins
DROP POLICY IF EXISTS "veh_fotos_admin_insert" ON storage.objects;
CREATE POLICY "veh_fotos_admin_insert"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'vehiculos-fotos' AND
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin')
        )
    );

-- Actualización: solo admins
DROP POLICY IF EXISTS "veh_fotos_admin_update" ON storage.objects;
CREATE POLICY "veh_fotos_admin_update"
    ON storage.objects FOR UPDATE TO authenticated
    USING (
        bucket_id = 'vehiculos-fotos' AND
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin')
        )
    );

-- Eliminación: solo admins
DROP POLICY IF EXISTS "veh_fotos_admin_delete" ON storage.objects;
CREATE POLICY "veh_fotos_admin_delete"
    ON storage.objects FOR DELETE TO authenticated
    USING (
        bucket_id = 'vehiculos-fotos' AND
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin')
        )
    );

-- ── 7. Datos iniciales — vehículo de la presentación ─────────
INSERT INTO public.catalogo_vehiculos (
    codigo_aifa, tipo_vehiculo, marca, submarca, anio_modelo, color,
    numero_serie, numero_economico, placas,
    combustible, transmision, capacidad_pasajeros,
    aseguradora, poliza_descripcion, vigencia_seguro,
    estado, area_responsable
) VALUES (
    'AIFA-08', 'Camioneta', 'Ford', 'Ranger', 2022, 'Blanco',
    '8AF6R5DV0N6261368', '2393303', '2393303 / NZV4423',
    'Diesel', 'Automática', 5,
    'GNP', 'Carta cobertura de 28 Feb. 2025, Seguros GNP.', '2025-12-31',
    'Activo', 'Dirección de Operación'
)
ON CONFLICT (codigo_aifa) DO NOTHING;

-- ── NOTAS DE USO ──────────────────────────────────────────────
-- 1. Los usuarios con rol 'admin' o 'superadmin' tienen acceso total.
-- 2. Para dar acceso de lectura a otros usuarios, agregar 'coord-auditoria'
--    en su campo permissions->allowed_sections en la tabla user_roles.
-- 3. Las fotos se suben al bucket 'vehiculos-fotos' y la URL pública
--    se guarda en el campo imagen_url del registro.
-- 4. El código AIFA (codigo_aifa) es único y actúa como identificador
--    visible del vehículo (ej. "AIFA-08").
