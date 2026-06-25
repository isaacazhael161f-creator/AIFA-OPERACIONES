-- ============================================================
--  Captura DIARIA de Aprovechamiento del Agua — GOMIH
--
--  Modelo: se selecciona un DÍA y se captura:
--   1) Extracción por pozo con DOBLE medición por pozo:
--        · cd_militar_m3  → volumen entregado a Ciudad Militar
--        · aifa_m3        → volumen entregado a AIFA
--        · volumen_m3     → TOTAL del día (cd_militar_m3 + aifa_m3),
--                           lo calcula y escribe la app.
--   2) Suministro PAAP del día (Primaria + Secundaria).
--   3) Tratamiento PTAR del día (A1 + A2 + A3).
--
--  El total mensual, el trimestre (ceil(mes/3)) y el acumulado
--  anual se calculan sumando los días. La demanda AIFA / Cd.
--  Militar del dashboard se obtiene de la suma por pozo.
-- ============================================================

-- ------------------------------------------------------------
--  Limpieza de tablas en desuso (reemplazadas por este modelo).
--  Sus triggers/índices caen en cascada con la tabla.
--  (NO se eliminan "Extracción_agua" ni "Extracción_agua_diaria".)
-- ------------------------------------------------------------
drop table if exists public."Extracción_agua_destinos" cascade;
drop table if exists public."Aprovechamiento_agua_mensual" cascade;
drop table if exists public."Aprovechamiento_agua_diaria" cascade;

-- updated_at trigger (reutiliza la función existente del esquema base)
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql as $$
begin
    new.updated_at := now();
    return new;
end$$;

-- ════════════════════════════════════════════════════════════
--  1) Extracción por pozo — doble medición (Cd. Militar / AIFA)
--     Se AMPLÍA la tabla diaria existente "Extracción_agua_diaria".
-- ════════════════════════════════════════════════════════════
alter table public."Extracción_agua_diaria"
    add column if not exists cd_militar_m3 numeric not null default 0,
    add column if not exists aifa_m3       numeric not null default 0;

--  Nota: "volumen_m3" se conserva como TOTAL del día por pozo
--  (= cd_militar_m3 + aifa_m3). La app lo recalcula al guardar.

-- ════════════════════════════════════════════════════════════
--  2) Suministro PAAP diario (Polígono Aeroportuario)
-- ════════════════════════════════════════════════════════════
create table if not exists public."Suministro_paap_diario" (
    id             bigserial    primary key,
    anio           smallint     not null check (anio between 2000 and 2100),
    mes            smallint     not null check (mes between 1 and 12),
    dia            smallint     not null check (dia between 1 and 31),
    primaria_m3    numeric      not null default 0,
    secundaria_m3  numeric      not null default 0,
    observaciones  text,
    created_at     timestamptz  not null default now(),
    updated_at     timestamptz  not null default now(),
    constraint suministro_paap_diario_uk unique (anio, mes, dia)
);

create index if not exists idx_suministro_paap_diario_anio
    on public."Suministro_paap_diario" (anio);
create index if not exists idx_suministro_paap_diario_anio_mes
    on public."Suministro_paap_diario" (anio, mes);

drop trigger if exists trg_suministro_paap_diario_upd on public."Suministro_paap_diario";
create trigger trg_suministro_paap_diario_upd
    before update on public."Suministro_paap_diario"
    for each row execute function public.tg_set_updated_at();

-- ════════════════════════════════════════════════════════════
--  3) Tratamiento PTAR diario (A1 / A2 / A3)
-- ════════════════════════════════════════════════════════════
create table if not exists public."Tratamiento_ptar_diario" (
    id             bigserial    primary key,
    anio           smallint     not null check (anio between 2000 and 2100),
    mes            smallint     not null check (mes between 1 and 12),
    dia            smallint     not null check (dia between 1 and 31),
    a1_m3          numeric      not null default 0,
    a2_m3          numeric      not null default 0,
    a3_m3          numeric      not null default 0,
    observaciones  text,
    created_at     timestamptz  not null default now(),
    updated_at     timestamptz  not null default now(),
    constraint tratamiento_ptar_diario_uk unique (anio, mes, dia)
);

create index if not exists idx_tratamiento_ptar_diario_anio
    on public."Tratamiento_ptar_diario" (anio);
create index if not exists idx_tratamiento_ptar_diario_anio_mes
    on public."Tratamiento_ptar_diario" (anio, mes);

drop trigger if exists trg_tratamiento_ptar_diario_upd on public."Tratamiento_ptar_diario";
create trigger trg_tratamiento_ptar_diario_upd
    before update on public."Tratamiento_ptar_diario"
    for each row execute function public.tg_set_updated_at();

-- ════════════════════════════════════════════════════════════
--  RLS — lectura/escritura para autenticados.
-- ════════════════════════════════════════════════════════════
alter table public."Suministro_paap_diario"   enable row level security;
alter table public."Tratamiento_ptar_diario"  enable row level security;

-- Suministro PAAP
drop policy if exists spd_select on public."Suministro_paap_diario";
create policy spd_select on public."Suministro_paap_diario"
    for select to authenticated using (true);
drop policy if exists spd_insert on public."Suministro_paap_diario";
create policy spd_insert on public."Suministro_paap_diario"
    for insert to authenticated with check (true);
drop policy if exists spd_update on public."Suministro_paap_diario";
create policy spd_update on public."Suministro_paap_diario"
    for update to authenticated using (true) with check (true);
drop policy if exists spd_delete on public."Suministro_paap_diario";
create policy spd_delete on public."Suministro_paap_diario"
    for delete to authenticated using (true);

-- Tratamiento PTAR
drop policy if exists tpd_select on public."Tratamiento_ptar_diario";
create policy tpd_select on public."Tratamiento_ptar_diario"
    for select to authenticated using (true);
drop policy if exists tpd_insert on public."Tratamiento_ptar_diario";
create policy tpd_insert on public."Tratamiento_ptar_diario"
    for insert to authenticated with check (true);
drop policy if exists tpd_update on public."Tratamiento_ptar_diario";
create policy tpd_update on public."Tratamiento_ptar_diario"
    for update to authenticated using (true) with check (true);
drop policy if exists tpd_delete on public."Tratamiento_ptar_diario";
create policy tpd_delete on public."Tratamiento_ptar_diario"
    for delete to authenticated using (true);

-- Grants
grant select, insert, update, delete on public."Suministro_paap_diario"  to authenticated;
grant select, insert, update, delete on public."Tratamiento_ptar_diario" to authenticated;
grant usage, select on sequence public."Suministro_paap_diario_id_seq"   to authenticated;
grant usage, select on sequence public."Tratamiento_ptar_diario_id_seq"  to authenticated;
