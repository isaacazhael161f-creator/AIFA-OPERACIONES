-- ─── bhs_available_dates() ─────────────────────────────────────────────────
-- Returns one row per distinct date across all three BHS tables, with boolean
-- flags indicating which table types have data for that date.
-- Using UNION of DISTINCT fechas so we never scan millions of rows.
-- SECURITY DEFINER so it runs as owner (bypasses RLS for SELECT, which is
-- already public on all three tables).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.bhs_available_dates()
RETURNS TABLE(
    fecha        date,
    has_arrivals  boolean,
    has_departures boolean,
    has_bwf       boolean
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT
        d.fecha,
        EXISTS (SELECT 1 FROM bhs_arrivals          a WHERE a.fecha = d.fecha) AS has_arrivals,
        EXISTS (SELECT 1 FROM bhs_departures         dep WHERE dep.fecha = d.fecha) AS has_departures,
        EXISTS (SELECT 1 FROM bhs_bags_without_flight b WHERE b.fecha = d.fecha) AS has_bwf
    FROM (
        SELECT DISTINCT fecha FROM bhs_arrivals
        UNION
        SELECT DISTINCT fecha FROM bhs_departures
        UNION
        SELECT DISTINCT fecha FROM bhs_bags_without_flight
    ) d
    ORDER BY d.fecha DESC;
$$;

-- Allow anon and authenticated roles to call the function
GRANT EXECUTE ON FUNCTION public.bhs_available_dates() TO anon, authenticated;
