-- Reclassify Torreón (TRC) from international weekly frequencies to national.
-- Safe to run multiple times: it inserts missing national rows and then deletes
-- TRC from weekly_frequencies_int.

BEGIN;

WITH trc_source AS (
    SELECT
        week_label,
        valid_from,
        valid_to,
        route_id,
        city,
        CASE
            WHEN state IS NULL OR btrim(state) = '' OR lower(state) = 'mexico' THEN 'Coahuila'
            ELSE state
        END AS state,
        iata,
        airline,
        monday,
        tuesday,
        wednesday,
        thursday,
        friday,
        saturday,
        sunday,
        weekly_total
    FROM public.weekly_frequencies_int
    WHERE upper(coalesce(iata, '')) = 'TRC'
       OR city ILIKE '%torreon%'
       OR city ILIKE '%torreón%'
), inserted AS (
    INSERT INTO public.weekly_frequencies (
        week_label,
        valid_from,
        valid_to,
        route_id,
        city,
        state,
        iata,
        airline,
        monday,
        tuesday,
        wednesday,
        thursday,
        friday,
        saturday,
        sunday,
        weekly_total
    )
    SELECT
        s.week_label,
        s.valid_from,
        s.valid_to,
        s.route_id,
        s.city,
        s.state,
        s.iata,
        s.airline,
        s.monday,
        s.tuesday,
        s.wednesday,
        s.thursday,
        s.friday,
        s.saturday,
        s.sunday,
        s.weekly_total
    FROM trc_source s
    WHERE NOT EXISTS (
        SELECT 1
        FROM public.weekly_frequencies n
        WHERE n.week_label = s.week_label
          AND n.valid_from = s.valid_from
          AND upper(coalesce(n.iata, '')) = upper(coalesce(s.iata, ''))
          AND lower(coalesce(n.airline, '')) = lower(coalesce(s.airline, ''))
    )
    RETURNING id
)
DELETE FROM public.weekly_frequencies_int i
WHERE upper(coalesce(i.iata, '')) = 'TRC'
   OR i.city ILIKE '%torreon%'
   OR i.city ILIKE '%torreón%';

COMMIT;

-- Optional verification queries (run manually):
-- SELECT week_label, valid_from, iata, city, airline, weekly_total
-- FROM public.weekly_frequencies
-- WHERE upper(coalesce(iata, '')) = 'TRC'
-- ORDER BY valid_from DESC, airline ASC;
--
-- SELECT week_label, valid_from, iata, city, airline, weekly_total
-- FROM public.weekly_frequencies_int
-- WHERE upper(coalesce(iata, '')) = 'TRC'
--    OR city ILIKE '%torreon%'
--    OR city ILIKE '%torreón%'
-- ORDER BY valid_from DESC, airline ASC;