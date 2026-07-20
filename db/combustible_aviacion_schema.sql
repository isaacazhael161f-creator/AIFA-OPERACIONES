-- ============================================================
--  SSC · Servicios Conexos · Combustibles
--  "Concentrado de litros de combustible de aviación suministrado"
--
--  Modelo LARGO (long) mensual: una fila por (año, mes) con los
--  litros suministrados. El "Promedio diario" es DERIVADO en el
--  front-end (litros / días del mes), por lo que NO se almacena
--  para evitar inconsistencias.
--
--  Niveles de usuario:
--    - Lectura: cualquier usuario autenticado (analizar la info).
--    - Escritura (editar / capturar): se controla en la UI por
--      window.dataManager.isAdmin (roles admin/editor/superadmin).
--      A nivel BD, la RLS permite CRUD a autenticados, igual que
--      el resto de módulos (p.ej. Extracción de Agua).
-- ============================================================

-- ──────────────────────────────────────────────────────────────
--  Tabla principal
-- ──────────────────────────────────────────────────────────────
create table if not exists public.combustible_aviacion (
    id              bigserial    primary key,
    anio            smallint     not null check (anio between 2000 and 2100),
    mes             smallint     not null check (mes between 1 and 12),
    litros          numeric      not null default 0 check (litros >= 0),
    observaciones   text,
    created_at      timestamptz  not null default now(),
    updated_at      timestamptz  not null default now(),
    constraint combustible_aviacion_uk unique (anio, mes)
);

create index if not exists idx_combustible_aviacion_anio
    on public.combustible_aviacion (anio);

-- updated_at trigger (función compartida; create or replace es idempotente)
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql as $$
begin
    new.updated_at := now();
    return new;
end$$;

drop trigger if exists trg_combustible_aviacion_upd on public.combustible_aviacion;
create trigger trg_combustible_aviacion_upd
    before update on public.combustible_aviacion
    for each row execute function public.tg_set_updated_at();

-- ──────────────────────────────────────────────────────────────
--  RLS — lectura/escritura para autenticados (la UI gatea edición)
-- ──────────────────────────────────────────────────────────────
alter table public.combustible_aviacion enable row level security;

drop policy if exists comb_select on public.combustible_aviacion;
create policy comb_select on public.combustible_aviacion
    for select to authenticated using (true);

drop policy if exists comb_insert on public.combustible_aviacion;
create policy comb_insert on public.combustible_aviacion
    for insert to authenticated with check (true);

drop policy if exists comb_update on public.combustible_aviacion;
create policy comb_update on public.combustible_aviacion
    for update to authenticated using (true) with check (true);

drop policy if exists comb_delete on public.combustible_aviacion;
create policy comb_delete on public.combustible_aviacion
    for delete to authenticated using (true);

grant select, insert, update, delete on public.combustible_aviacion to authenticated;
grant usage, select on sequence public.combustible_aviacion_id_seq to authenticated;

-- ──────────────────────────────────────────────────────────────
--  Carga inicial (datos de la imagen "CONCENTRADO DE LITROS ...")
--  Idempotente: vuelve a correr sin duplicar gracias a ON CONFLICT.
--  Meses sin operación (2022 Ene/Feb) y meses futuros 2026 (Jun–Dic)
--  se omiten: no existe registro hasta capturarlos.
-- ──────────────────────────────────────────────────────────────
insert into public.combustible_aviacion (anio, mes, litros) values
    -- ── AÑO 2022 ──
    (2022,  3,    262092),
    (2022,  4,    654636),
    (2022,  5,    868464),
    (2022,  6,    853448),
    (2022,  7,   1060989),
    (2022,  8,   2564789),
    (2022,  9,   3809231),
    (2022, 10,   4714363),
    (2022, 11,   4727158),
    (2022, 12,   4805594),
    -- ── AÑO 2023 ──
    (2023,  1,   5197754),
    (2023,  2,   4602977),
    (2023,  3,   6186350),
    (2023,  4,   5892445),
    (2023,  5,   6589693),
    (2023,  6,   7161282),
    (2023,  7,  11646752),
    (2023,  8,  16745141),
    (2023,  9,  18583999),
    (2023, 10,  22833210),
    (2023, 11,  21515872),
    (2023, 12,  25240612),
    -- ── AÑO 2024 ──
    (2024,  1,  24093276),
    (2024,  2,  23599863),
    (2024,  3,  26118723),
    (2024,  4,  27949414),
    (2024,  5,  30998507),
    (2024,  6,  31247041),
    (2024,  7,  30432164),
    (2024,  8,  30829822),
    (2024,  9,  29442444),
    (2024, 10,  31224086),
    (2024, 11,  30425581),
    (2024, 12,  30036902),
    -- ── AÑO 2025 ──
    (2025,  1,  25107608),
    (2025,  2,  25099356),
    (2025,  3,  29058449),
    (2025,  4,  29051386),
    (2025,  5,  30366511),
    (2025,  6,  30908346),
    (2025,  7,  32713431),
    (2025,  8,  34595238),
    (2025,  9,  31505527),
    (2025, 10,  33343749),
    (2025, 11,  31495004),
    (2025, 12,  33843043),
    -- ── AÑO 2026 (en curso: Ene–May) ──
    (2026,  1,  32915513),
    (2026,  2,  30419018),
    (2026,  3,  34173683),
    (2026,  4,  35543888),
    (2026,  5,  37655025)
on conflict (anio, mes) do update
    set litros = excluded.litros;

-- ──────────────────────────────────────────────────────────────
--  Verificación (subtotales esperados):
--    2022 = 24,320,764   2023 = 152,196,087   2024 = 346,397,823
--    2025 = 367,087,648   2026(Ene–May) = 170,707,127
--    TOTAL acumulado     = 1,060,709,449
--
--  select anio, to_char(sum(litros),'FM999,999,999') as litros
--  from public.combustible_aviacion group by anio order by anio;
-- ──────────────────────────────────────────────────────────────
