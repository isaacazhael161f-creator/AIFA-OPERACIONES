-- ============================================================
-- Estadisticas de Equipaje del BHS
-- Ruta: Ops. Ed. Terminal -> BHS - Manejo de Maletas
-- Crea:
--   1) Catalogo fijo de capacidades maximas del sistema BHS
--   2) Tabla historica para estadisticas de equipaje
-- ============================================================

CREATE TABLE IF NOT EXISTS public.bhs_system_capacities (
    operation_type text PRIMARY KEY,
    max_per_hour integer NOT NULL CHECK (max_per_hour >= 0),
    max_per_day integer NOT NULL CHECK (max_per_day >= 0),
    max_per_month integer NOT NULL CHECK (max_per_month >= 0),
    max_per_year integer NOT NULL CHECK (max_per_year >= 0),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CHECK (operation_type IN ('SALIDA', 'LLEGADA'))
);

INSERT INTO public.bhs_system_capacities (
    operation_type,
    max_per_hour,
    max_per_day,
    max_per_month,
    max_per_year
)
VALUES
    ('SALIDA', 5269, 126456, 3793680, 46156440),
    ('LLEGADA', 4389, 105336, 3160080, 38447640)
ON CONFLICT (operation_type) DO UPDATE
SET
    max_per_hour = EXCLUDED.max_per_hour,
    max_per_day = EXCLUDED.max_per_day,
    max_per_month = EXCLUDED.max_per_month,
    max_per_year = EXCLUDED.max_per_year,
    updated_at = now();

CREATE TABLE IF NOT EXISTS public.bhs_baggage_statistics (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    source_key text NOT NULL UNIQUE,
    source_order integer NOT NULL DEFAULT 0,
    operation_type text NOT NULL CHECK (operation_type IN ('SALIDA', 'LLEGADA')),
    record_kind text NOT NULL DEFAULT 'monthly'
        CHECK (record_kind IN ('monthly', 'annual_summary', 'rolling_summary', 'summary')),
    anio integer,
    mes text,
    mes_num smallint CHECK (mes_num BETWEEN 1 AND 12 OR mes_num IS NULL),
    period_label text,
    am integer CHECK (am IS NULL OR am >= 0),
    y4 integer CHECK (y4 IS NULL OR y4 >= 0),
    vb integer CHECK (vb IS NULL OR vb >= 0),
    cm_dm integer CHECK (cm_dm IS NULL OR cm_dm >= 0),
    zv integer CHECK (zv IS NULL OR zv >= 0),
    reported_total integer CHECK (reported_total IS NULL OR reported_total >= 0),
    reported_utilization_pct numeric(8, 2)
        CHECK (reported_utilization_pct IS NULL OR reported_utilization_pct >= 0),
    total_equipajes integer GENERATED ALWAYS AS (
        COALESCE(am, 0) +
        COALESCE(y4, 0) +
        COALESCE(vb, 0) +
        COALESCE(cm_dm, 0) +
        COALESCE(zv, 0)
    ) STORED,
    is_seed boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    created_by text,
    updated_by text
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_bhs_baggage_stats_monthly
    ON public.bhs_baggage_statistics (operation_type, anio, mes_num)
    WHERE record_kind = 'monthly' AND anio IS NOT NULL AND mes_num IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bhs_baggage_stats_operation
    ON public.bhs_baggage_statistics (operation_type, record_kind);

CREATE INDEX IF NOT EXISTS idx_bhs_baggage_stats_year_month
    ON public.bhs_baggage_statistics (anio DESC, mes_num ASC);

CREATE INDEX IF NOT EXISTS idx_bhs_baggage_stats_source_order
    ON public.bhs_baggage_statistics (source_order ASC);

ALTER TABLE public.bhs_system_capacities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bhs_baggage_statistics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bhs_system_capacities_read ON public.bhs_system_capacities;
CREATE POLICY bhs_system_capacities_read
    ON public.bhs_system_capacities
    FOR SELECT
    USING (true);

DROP POLICY IF EXISTS bhs_system_capacities_write ON public.bhs_system_capacities;
CREATE POLICY bhs_system_capacities_write
    ON public.bhs_system_capacities
    FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS bhs_baggage_statistics_read ON public.bhs_baggage_statistics;
CREATE POLICY bhs_baggage_statistics_read
    ON public.bhs_baggage_statistics
    FOR SELECT
    USING (true);

DROP POLICY IF EXISTS bhs_baggage_statistics_insert ON public.bhs_baggage_statistics;
CREATE POLICY bhs_baggage_statistics_insert
    ON public.bhs_baggage_statistics
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS bhs_baggage_statistics_update ON public.bhs_baggage_statistics;
CREATE POLICY bhs_baggage_statistics_update
    ON public.bhs_baggage_statistics
    FOR UPDATE
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS bhs_baggage_statistics_delete ON public.bhs_baggage_statistics;
CREATE POLICY bhs_baggage_statistics_delete
    ON public.bhs_baggage_statistics
    FOR DELETE
    USING (auth.role() = 'authenticated');

WITH monthly_seed (
    source_key,
    source_order,
    operation_type,
    anio,
    mes,
    mes_num,
    am,
    y4,
    vb,
    cm_dm,
    zv
) AS (
    VALUES
    ('seed-SALIDA-2022-03',   1, 'SALIDA', 2022, 'MAR.',  3,   260,  1231,   423,    0,   0),
    ('seed-SALIDA-2022-04',   2, 'SALIDA', 2022, 'ABR.',  4,  1093,  3064,  1054,    0,   0),
    ('seed-SALIDA-2022-05',   3, 'SALIDA', 2022, 'MAY.',  5,   768,  3396,   988,    0,   0),
    ('seed-SALIDA-2022-06',   4, 'SALIDA', 2022, 'JUN',   6,   715,  2907,  1083,    0,   0),
    ('seed-SALIDA-2022-07',   5, 'SALIDA', 2022, 'JUL.',  7,  1017,  3709,  1276,    0,   0),
    ('seed-SALIDA-2022-08',   6, 'SALIDA', 2022, 'AGO.',  8,  1486,  5395,  1590,    0,   0),
    ('seed-SALIDA-2022-09',   7, 'SALIDA', 2022, 'SEP.',  9,  2929,  8433,  2114,  111,   0),
    ('seed-SALIDA-2022-10',   8, 'SALIDA', 2022, 'OCT.', 10, 10972, 10674,  2313,  925,   0),
    ('seed-SALIDA-2022-11',   9, 'SALIDA', 2022, 'NOV.', 11, 14986, 10610,  2912,  991,   0),
    ('seed-SALIDA-2022-12',  10, 'SALIDA', 2022, 'DIC.', 12, 15096, 11650,  6899, 1221,   0),
    ('seed-SALIDA-2023-01',  11, 'SALIDA', 2023, 'ENE.',  1, 11749, 10037,  6704, 1059,   0),
    ('seed-SALIDA-2023-02',  12, 'SALIDA', 2023, 'FEB.',  2,  1112,  8628,  4908,  913,   0),
    ('seed-SALIDA-2023-03',  13, 'SALIDA', 2023, 'MAR.',  3, 15225, 11142,  3978, 1172,   0),
    ('seed-SALIDA-2023-04',  14, 'SALIDA', 2023, 'ABR.',  4,  4257,    36,  1511,   11,   0),
    ('seed-SALIDA-2023-05',  15, 'SALIDA', 2023, 'MAY.',  5, 13481,   154,  6456,   39,   0),
    ('seed-SALIDA-2023-06',  16, 'SALIDA', 2023, 'JUN',   6, 11478,   314,  7732,   43,   0),
    ('seed-SALIDA-2023-07',  17, 'SALIDA', 2023, 'JUL.',  7, 11023,   294,  6552,   28,   0),
    ('seed-SALIDA-2023-08',  18, 'SALIDA', 2023, 'AGO.',  8, 16343,   554,  9165,    9,   0),
    ('seed-SALIDA-2023-09',  19, 'SALIDA', 2023, 'SEP.',  9, 15254,   393,  9312,   25,   0),
    ('seed-SALIDA-2023-10',  20, 'SALIDA', 2023, 'OCT.', 10, 18085, 10707,  9210,  996,   0),
    ('seed-SALIDA-2023-11',  21, 'SALIDA', 2023, 'NOV.', 11, 18185, 11101,  8913, 1352,   0),
    ('seed-SALIDA-2023-12',  22, 'SALIDA', 2023, 'DIC.', 12, 22973, 12403, 17422, 1303,   0),
    ('seed-SALIDA-2024-01',  23, 'SALIDA', 2024, 'ENE.',  1, 18137, 12068, 23670,  829,   0),
    ('seed-SALIDA-2024-02',  24, 'SALIDA', 2024, 'FEB.',  2, 16220, 10539, 23075,  859,   0),
    ('seed-SALIDA-2024-03',  25, 'SALIDA', 2024, 'MAR.',  3, 20143, 12484, 30612, 1108,   0),
    ('seed-SALIDA-2024-04',  26, 'SALIDA', 2024, 'ABR.',  4, 13081, 10822, 27806,  581,   0),
    ('seed-SALIDA-2024-05',  27, 'SALIDA', 2024, 'MAY.',  5, 18957, 13439, 39393,  882,   0),
    ('seed-SALIDA-2024-06',  28, 'SALIDA', 2024, 'JUN',   6, 17717, 16425, 42135,  928,   0),
    ('seed-SALIDA-2024-07',  29, 'SALIDA', 2024, 'JUL.',  7, 12001, 10260, 25467,  674,   0),
    ('seed-SALIDA-2024-08',  30, 'SALIDA', 2024, 'AGO.',  8, 21668, 21843, 46746, 1058,   0),
    ('seed-SALIDA-2024-09',  31, 'SALIDA', 2024, 'SEP.',  9, 18552, 17295, 41822,  939,   0),
    ('seed-SALIDA-2024-10',  32, 'SALIDA', 2024, 'OCT.', 10, 18869, 20521, 49720, 1051,   0),
    ('seed-SALIDA-2024-11',  33, 'SALIDA', 2024, 'NOV.', 11, 23361, 21445, 53896, 1350,   0),
    ('seed-SALIDA-2024-12',  34, 'SALIDA', 2024, 'DIC.', 12, 27569, 21966, 67622, 1699,   0),
    ('seed-SALIDA-2025-01',  35, 'SALIDA', 2025, 'ENE.',  1, 23442, 14915, 61000,  548,   0),
    ('seed-SALIDA-2025-02',  36, 'SALIDA', 2025, 'FEB.',  2, 20193,  9228, 49167,    0,   0),
    ('seed-SALIDA-2026-03',  37, 'SALIDA', 2026, 'MAR.',  3,  8533, 17702, 77314, 1051,  11),
    ('seed-SALIDA-2026-04',  38, 'SALIDA', 2026, 'ABR.',  4,  8482, 17193, 80161, 1350,   8),
    ('seed-SALIDA-2026-05',  39, 'SALIDA', 2026, 'MAY.',  5,  7667, 16410, 85300, 1699,   6),
    ('seed-SALIDA-2026-06',  40, 'SALIDA', 2026, 'JUN',   6,  NULL,  NULL,  NULL, NULL, NULL),
    ('seed-SALIDA-2026-07',  41, 'SALIDA', 2026, 'JUL.',  7,  NULL,  NULL,  NULL, NULL, NULL),
    ('seed-SALIDA-2026-08',  42, 'SALIDA', 2026, 'AGO.',  8,  NULL,  NULL,  NULL, NULL, NULL),
    ('seed-SALIDA-2026-09',  43, 'SALIDA', 2026, 'SEP.',  9,  NULL,  NULL,  NULL, NULL, NULL),
    ('seed-SALIDA-2026-10',  44, 'SALIDA', 2026, 'OCT.', 10,  NULL,  NULL,  NULL, NULL, NULL),
    ('seed-SALIDA-2026-11',  45, 'SALIDA', 2026, 'NOV.', 11,  NULL,  NULL,  NULL, NULL, NULL),
    ('seed-SALIDA-2026-12',  46, 'SALIDA', 2026, 'DIC.', 12,  NULL,  NULL,  NULL, NULL, NULL),
    ('seed-LLEGADA-2022-03', 47, 'LLEGADA', 2022, 'MAR.',  3,    46,     1,   147,    0,   0),
    ('seed-LLEGADA-2022-04', 48, 'LLEGADA', 2022, 'ABR.',  4,  1100,     0,  1056,    0,   0),
    ('seed-LLEGADA-2022-05', 49, 'LLEGADA', 2022, 'MAY.',  5,   420,     0,   850,    0,   0),
    ('seed-LLEGADA-2022-06', 50, 'LLEGADA', 2022, 'JUN',   6,   132,     0,  1021,    0,   0),
    ('seed-LLEGADA-2022-07', 51, 'LLEGADA', 2022, 'JUL.',  7,   108,     0,  1290,    0,   0),
    ('seed-LLEGADA-2022-08', 52, 'LLEGADA', 2022, 'AGO.',  8,   629,     0,  1540,    0,   0),
    ('seed-LLEGADA-2022-09', 53, 'LLEGADA', 2022, 'SEP.',  9,  2541,    18,  2121,    9,   0),
    ('seed-LLEGADA-2022-10', 54, 'LLEGADA', 2022, 'OCT.', 10,  9531,   114,  2242,   23,   0),
    ('seed-LLEGADA-2022-11', 55, 'LLEGADA', 2022, 'NOV.', 11, 13110,   229,  2890,   85,   0),
    ('seed-LLEGADA-2022-12', 56, 'LLEGADA', 2022, 'DIC.', 12, 13459,   213,  5433,   69,   0),
    ('seed-LLEGADA-2023-01', 57, 'LLEGADA', 2023, 'ENE.',  1, 11675,   259,  4391,  105,   0),
    ('seed-LLEGADA-2023-02', 58, 'LLEGADA', 2023, 'FEB.',  2, 10213,   157,  2694,   47,   0),
    ('seed-LLEGADA-2023-03', 59, 'LLEGADA', 2023, 'MAR.',  3, 13303,   570,  3339,   37,   0),
    ('seed-LLEGADA-2023-04', 60, 'LLEGADA', 2023, 'ABR.',  4, 13481,   154,  6456,   39,   0),
    ('seed-LLEGADA-2023-05', 61, 'LLEGADA', 2023, 'MAY.',  5, 11478,   314,  7732,   43,   0),
    ('seed-LLEGADA-2023-06', 62, 'LLEGADA', 2023, 'JUN',   6, 11023,   294,  6552,   28,   0),
    ('seed-LLEGADA-2023-07', 63, 'LLEGADA', 2023, 'JUL.',  7, 16343,   554,  9165,    9,   0),
    ('seed-LLEGADA-2023-08', 64, 'LLEGADA', 2023, 'AGO.',  8, 15254,   393,  9312,   25,   0),
    ('seed-LLEGADA-2023-09', 65, 'LLEGADA', 2023, 'SEP.',  9,  9471,    36,  7358,   15,   0),
    ('seed-LLEGADA-2023-10', 66, 'LLEGADA', 2023, 'OCT.', 10, 14825,   176,  8896,    1,   0),
    ('seed-LLEGADA-2023-11', 67, 'LLEGADA', 2023, 'NOV.', 11, 15124,   164,  9662,    0,   0),
    ('seed-LLEGADA-2023-12', 68, 'LLEGADA', 2023, 'DIC.', 12, 17387,   263, 17586,    0,   0),
    ('seed-LLEGADA-2024-01', 69, 'LLEGADA', 2024, 'ENE.',  1, 18012,   233, 20534,   55,   0),
    ('seed-LLEGADA-2024-02', 70, 'LLEGADA', 2024, 'FEB.',  2, 13780,   241, 19772,    0,   0),
    ('seed-LLEGADA-2024-03', 71, 'LLEGADA', 2024, 'MAR.',  3, 16041,   269, 27424,    4,   0),
    ('seed-LLEGADA-2024-04', 72, 'LLEGADA', 2024, 'ABR.',  4, 12307,   788, 27568,    2,   0),
    ('seed-LLEGADA-2024-05', 73, 'LLEGADA', 2024, 'MAY.',  5, 16670,  1211, 37958,    0,   0),
    ('seed-LLEGADA-2024-06', 74, 'LLEGADA', 2024, 'JUN',   6, 15677,  1370, 40368,    0,   0),
    ('seed-LLEGADA-2024-07', 75, 'LLEGADA', 2024, 'JUL.',  7, 20509,  1273, 45968,    3,   0),
    ('seed-LLEGADA-2024-08', 76, 'LLEGADA', 2024, 'AGO.',  8, 20150,  1183, 48612,    3,   0),
    ('seed-LLEGADA-2024-09', 77, 'LLEGADA', 2024, 'SEP.',  9, 17761,   922, 41002,    0,   0),
    ('seed-LLEGADA-2024-10', 78, 'LLEGADA', 2024, 'OCT.', 10, 18706,  1736, 45263,    0,   0),
    ('seed-LLEGADA-2024-11', 79, 'LLEGADA', 2024, 'NOV.', 11, 21806,  1378, 48993,    2,   0),
    ('seed-LLEGADA-2024-12', 80, 'LLEGADA', 2024, 'DIC.', 12, 26494,   565, 61648,    0,   0),
    ('seed-LLEGADA-2025-01', 81, 'LLEGADA', 2025, 'ENE.',  1, 24174,   165, 50766,    0,   0),
    ('seed-LLEGADA-2025-02', 82, 'LLEGADA', 2025, 'FEB.',  2, 18570,   252, 41560,    0,   0),
    ('seed-LLEGADA-2026-03', 83, 'LLEGADA', 2026, 'MAR.',  3,  8396,   369, 70519,  548,   4),
    ('seed-LLEGADA-2026-04', 84, 'LLEGADA', 2026, 'ABR.',  4,  9177,   281, 80157,  645,   6),
    ('seed-LLEGADA-2026-05', 85, 'LLEGADA', 2026, 'MAY.',  5,  8916,   529, 84575,  462,   4),
    ('seed-LLEGADA-2026-06', 86, 'LLEGADA', 2026, 'JUN',   6,  NULL,  NULL,  NULL, NULL, NULL),
    ('seed-LLEGADA-2026-07', 87, 'LLEGADA', 2026, 'JUL.',  7,  NULL,  NULL,  NULL, NULL, NULL),
    ('seed-LLEGADA-2026-08', 88, 'LLEGADA', 2026, 'AGO.',  8,  NULL,  NULL,  NULL, NULL, NULL),
    ('seed-LLEGADA-2026-09', 89, 'LLEGADA', 2026, 'SEP.',  9,  NULL,  NULL,  NULL, NULL, NULL),
    ('seed-LLEGADA-2026-10', 90, 'LLEGADA', 2026, 'OCT.', 10,  NULL,  NULL,  NULL, NULL, NULL),
    ('seed-LLEGADA-2026-11', 91, 'LLEGADA', 2026, 'NOV.', 11,  NULL,  NULL,  NULL, NULL, NULL),
    ('seed-LLEGADA-2026-12', 92, 'LLEGADA', 2026, 'DIC.', 12,  NULL,  NULL,  NULL, NULL, NULL)
)
INSERT INTO public.bhs_baggage_statistics (
    source_key,
    source_order,
    operation_type,
    record_kind,
    anio,
    mes,
    mes_num,
    period_label,
    am,
    y4,
    vb,
    cm_dm,
    zv,
    reported_total,
    reported_utilization_pct,
    is_seed,
    created_by,
    updated_by
)
SELECT
    source_key,
    source_order,
    operation_type,
    'monthly',
    anio,
    mes,
    mes_num,
    NULL,
    am,
    y4,
    vb,
    cm_dm,
    zv,
    NULL,
    NULL,
    true,
    'system-seed',
    'system-seed'
FROM monthly_seed
ON CONFLICT (source_key) DO NOTHING;

WITH summary_seed (
    source_key,
    source_order,
    operation_type,
    record_kind,
    anio,
    mes,
    mes_num,
    period_label,
    am,
    y4,
    vb,
    cm_dm,
    zv,
    reported_total,
    reported_utilization_pct
) AS (
    VALUES
    ('seed-summary-01', 101, 'SALIDA',  'annual_summary', 2022, NULL, NULL::smallint, NULL,  49322,  61069,  20652,  3248,   0,  134291, 0.29),
    ('seed-summary-02', 102, 'LLEGADA', 'annual_summary', 2022, NULL, NULL::smallint, NULL,  41076,    575,  18590,   186,   0,   60427, 0.16),
    ('seed-summary-03', 103, 'SALIDA',  'annual_summary', 2023, NULL, NULL::smallint, NULL, 159165,  65763,  91863,  6950,   0,  323741, 0.70),
    ('seed-summary-04', 104, 'LLEGADA', 'annual_summary', 2023, NULL, NULL::smallint, NULL, 159577,   3334,  93143,   349,   0,  256403, 0.67),
    ('seed-summary-05', 105, 'SALIDA',  'annual_summary', 2024, NULL, NULL::smallint, NULL, 226275, 189107, 471964, 11958,   0,  899304, 1.95),
    ('seed-summary-06', 106, 'LLEGADA', 'annual_summary', 2024, NULL, NULL::smallint, NULL, 217913,  11169, 465110,    69,   0,  694261, 1.81),
    ('seed-summary-07', 107, 'SALIDA',  'summary',        NULL, NULL, NULL::smallint, NULL,  43635,  24143, 110167,   548, 108,  178601, NULL),
    ('seed-summary-08', 108, 'LLEGADA', 'summary',        NULL, NULL, NULL::smallint, NULL,  42744,    417,  92326,     0,  58,  135545, NULL),
    ('seed-summary-09', 109, 'SALIDA',  'rolling_summary',NULL, NULL, NULL::smallint, 'MAR 2025 A FEB. 2026', NULL, NULL, NULL, NULL, NULL, 1114570, NULL),
    ('seed-summary-10', 110, 'LLEGADA', 'rolling_summary',NULL, NULL, NULL::smallint, 'MAR 2025 A FEB. 2026', NULL, NULL, NULL, NULL, NULL,  890127, NULL),
    ('seed-summary-11', 111, 'SALIDA',  'annual_summary', 2025, NULL, NULL::smallint, NULL,   NULL,   NULL,   NULL,  NULL, NULL, 1293171, 2.80),
    ('seed-summary-12', 112, 'LLEGADA', 'annual_summary', 2025, NULL, NULL::smallint, NULL,   NULL,   NULL,   NULL,  NULL, NULL, 1025672, 2.67)
)
INSERT INTO public.bhs_baggage_statistics (
    source_key,
    source_order,
    operation_type,
    record_kind,
    anio,
    mes,
    mes_num,
    period_label,
    am,
    y4,
    vb,
    cm_dm,
    zv,
    reported_total,
    reported_utilization_pct,
    is_seed,
    created_by,
    updated_by
)
SELECT
    source_key,
    source_order,
    operation_type,
    record_kind,
    anio,
    mes,
    mes_num,
    period_label,
    am,
    y4,
    vb,
    cm_dm,
    zv,
    reported_total,
    reported_utilization_pct,
    true,
    'system-seed',
    'system-seed'
FROM summary_seed
ON CONFLICT (source_key) DO NOTHING;
