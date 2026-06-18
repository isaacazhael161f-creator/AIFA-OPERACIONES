-- ============================================================
--  Tabla auxiliar diaria: "Extracción_agua_diaria"
--
--  Soporta el editor por día → mes que se sincroniza con la
--  tabla ancha existente public."Extracción_agua"
--  (formato wide con columnas Enero..Diciembre).
--
--  Al guardar en el editor, el cliente:
--    1) Hace upsert en esta tabla diaria.
--    2) Recalcula el total mensual del (pozo, año, mes).
--    3) Actualiza la celda mensual en "Extracción_agua".
--
--  Si más adelante se desea hacer la sincronización en la base
--  de datos, basta con habilitar el trigger comentado al final.
-- ============================================================

create table if not exists public."Extracción_agua_diaria" (
    id              bigserial    primary key,
    anio            smallint     not null check (anio between 2000 and 2100),
    mes             smallint     not null check (mes  between 1 and 12),
    dia             smallint     not null check (dia  between 1 and 31),
    pozo            text         not null,
    volumen_m3      numeric      not null default 0,
    observaciones   text,
    created_at      timestamptz  not null default now(),
    updated_at      timestamptz  not null default now(),
    constraint extraccion_agua_diaria_uk unique (anio, mes, dia, pozo)
);

create index if not exists idx_extraccion_agua_diaria_anio_pozo
    on public."Extracción_agua_diaria" (anio, pozo);

-- updated_at trigger
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql as $$
begin
    new.updated_at := now();
    return new;
end$$;

drop trigger if exists trg_extraccion_agua_diaria_upd on public."Extracción_agua_diaria";
create trigger trg_extraccion_agua_diaria_upd
    before update on public."Extracción_agua_diaria"
    for each row execute function public.tg_set_updated_at();

-- ──────────────────────────────────────────────────────────────
--  RLS — lectura/escritura para autenticados.
-- ──────────────────────────────────────────────────────────────
alter table public."Extracción_agua_diaria" enable row level security;

drop policy if exists ead_select on public."Extracción_agua_diaria";
create policy ead_select on public."Extracción_agua_diaria"
    for select to authenticated using (true);

drop policy if exists ead_insert on public."Extracción_agua_diaria";
create policy ead_insert on public."Extracción_agua_diaria"
    for insert to authenticated with check (true);

drop policy if exists ead_update on public."Extracción_agua_diaria";
create policy ead_update on public."Extracción_agua_diaria"
    for update to authenticated using (true) with check (true);

drop policy if exists ead_delete on public."Extracción_agua_diaria";
create policy ead_delete on public."Extracción_agua_diaria"
    for delete to authenticated using (true);

grant select, insert, update, delete on public."Extracción_agua_diaria" to authenticated;
grant usage, select on sequence public."Extracción_agua_diaria_id_seq" to authenticated;

-- ──────────────────────────────────────────────────────────────
--  Permisos en la tabla ancha existente "Extracción_agua".
--  Si su RLS bloquea writes, descomenta estas políticas.
-- ──────────────────────────────────────────────────────────────
-- alter table public."Extracción_agua" enable row level security;
-- drop policy if exists ea_select on public."Extracción_agua";
-- create policy ea_select on public."Extracción_agua"
--     for select to authenticated using (true);
-- drop policy if exists ea_update on public."Extracción_agua";
-- create policy ea_update on public."Extracción_agua"
--     for update to authenticated using (true) with check (true);
-- drop policy if exists ea_insert on public."Extracción_agua";
-- create policy ea_insert on public."Extracción_agua"
--     for insert to authenticated with check (true);
-- grant select, update, insert on public."Extracción_agua" to authenticated;
