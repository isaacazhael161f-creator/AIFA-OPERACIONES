-- ═══════════════════════════════════════════════════════════════
-- Habilitar Supabase Realtime en las tablas clave de AIFA
-- Ejecutar una sola vez en Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- 1. Asegurar que la publicación supabase_realtime existe
--    (Supabase la crea por defecto; este bloque es por seguridad)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
    ) THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
END $$;

-- 2. Añadir tablas a la publicación de Realtime
--    ALTER TABLE ... REPLICA IDENTITY FULL permite recibir la fila
--    completa en UPDATE y DELETE (no solo el PK).
--    Usar IF EXISTS para no fallar si alguna tabla aún no existe.

DO $$
DECLARE
    tbl text;
    tbls text[] := ARRAY[
        'flights',
        'daily_operations',
        'monthly_operations',
        'demoras',
        'Demoras',
        'puntualidad',
        'punctuality',
        'punctuality_stats',
        'agenda_comites',
        'agenda_reuniones',
        'agenda_acuerdos',
        'agenda_asistencia',
        'coyh_asistencia',
        'abordadores',
        'abordadores_posiciones',
        'airlines',
        'aeropuertos',
        'catalogo_aerolineas',
        'Aerocares',
        'aerocares',
        'user_roles',
        'change_history'
    ];
BEGIN
    FOREACH tbl IN ARRAY tbls LOOP
        IF EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = tbl
        ) THEN
            EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL', tbl);
            BEGIN
                EXECUTE format(
                    'ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl
                );
            EXCEPTION WHEN duplicate_object THEN
                NULL; -- ya estaba en la publicación
            END;
            RAISE NOTICE 'Realtime habilitado: %', tbl;
        ELSE
            RAISE NOTICE 'Tabla no existe (omitida): %', tbl;
        END IF;
    END LOOP;
END $$;

-- 3. Tablas de manifiestos con nombre especial (comillas dobles necesarias)
--    Ajusta si tienes más períodos (Marzo 2026, Abril 2026, etc.)
DO $$
DECLARE
    tbl text;
    tbls text[] := ARRAY[
        'Base de datos Manifiestos 2025',
        'Base de Datos Manifiestos Febrero 2026',
        'Base de Manifiestos Carga Febrero 2026'
    ];
BEGIN
    FOREACH tbl IN ARRAY tbls LOOP
        IF EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = tbl
        ) THEN
            EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL', tbl);
            BEGIN
                EXECUTE format(
                    'ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl
                );
            EXCEPTION WHEN duplicate_object THEN
                NULL;
            END;
            RAISE NOTICE 'Realtime habilitado: %', tbl;
        ELSE
            RAISE NOTICE 'Tabla no existe (omitida): %', tbl;
        END IF;
    END LOOP;
END $$;
