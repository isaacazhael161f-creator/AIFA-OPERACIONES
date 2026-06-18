-- ============================================================
--  Tabla "Extracción_agua"
--  Subdirección de Ingeniería · Gerencia de Op. y Mtto. de
--  Instalaciones Hidráulicas (GOMIH)
--
--  Registro diario de extracción de agua por pozo (m³).
--  El dashboard agrega por mes / año en la app.
-- ============================================================

create table if not exists public."Extracción_agua" (
    id              bigserial    primary key,
    fecha           date         not null,
    pozo            text         null,            -- identificador del pozo (opcional si solo hay uno)
    volumen_m3      numeric      not null default 0,
    observaciones   text         null,
    created_at      timestamptz  not null default now(),
    updated_at      timestamptz  not null default now(),
    created_by      uuid         null,
    updated_by      uuid         null,
    -- evita registros duplicados por (día, pozo)
    constraint extraccion_agua_fecha_pozo_uk unique (fecha, pozo)
);

create index if not exists idx_extraccion_agua_fecha
    on public."Extracción_agua" (fecha);

create index if not exists idx_extraccion_agua_year_month
    on public."Extracción_agua" (
        (extract(year  from fecha)),
        (extract(month from fecha))
    );

-- updated_at trigger
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql as $$
begin
    new.updated_at := now();
    return new;
end$$;

drop trigger if exists trg_extraccion_agua_updated_at on public."Extracción_agua";
create trigger trg_extraccion_agua_updated_at
    before update on public."Extracción_agua"
    for each row execute function public.tg_set_updated_at();

-- ──────────────────────────────────────────────────────────────
--  RLS — lectura para autenticados, escritura para autenticados.
--  Endurecer después con un rol específico de Hidráulicas si se
--  desea (p. ej. requiere user_role = 'hidraulicas' o admin).
-- ──────────────────────────────────────────────────────────────
alter table public."Extracción_agua" enable row level security;

drop policy if exists extraccion_agua_select on public."Extracción_agua";
create policy extraccion_agua_select
    on public."Extracción_agua"
    for select
    to authenticated
    using (true);

drop policy if exists extraccion_agua_insert on public."Extracción_agua";
create policy extraccion_agua_insert
    on public."Extracción_agua"
    for insert
    to authenticated
    with check (true);

drop policy if exists extraccion_agua_update on public."Extracción_agua";
create policy extraccion_agua_update
    on public."Extracción_agua"
    for update
    to authenticated
    using (true)
    with check (true);

drop policy if exists extraccion_agua_delete on public."Extracción_agua";
create policy extraccion_agua_delete
    on public."Extracción_agua"
    for delete
    to authenticated
    using (true);

grant select, insert, update, delete on public."Extracción_agua" to authenticated;
grant usage, select on sequence public."Extracción_agua_id_seq" to authenticated;
