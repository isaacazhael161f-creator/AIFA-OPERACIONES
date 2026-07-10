-- ============================================================================
-- Catálogo: Tipo de Servicio de Vuelo (flightservicetype)
-- Origen: data/master/flightservicetype.csv
-- Columnas: Código, Categoria, Tipo de Operación, Descripción
-- ============================================================================

create table if not exists public.flight_service_type (
    codigo            text primary key,
    categoria         text,
    tipo_operacion    text,
    descripcion       text,
    created_at        timestamptz not null default now(),
    updated_at        timestamptz not null default now()
);

comment on table  public.flight_service_type              is 'Catálogo de tipos de servicio de vuelo (código IATA de servicio).';
comment on column public.flight_service_type.codigo         is 'Código de una letra del tipo de servicio (A, B, C, ...).';
comment on column public.flight_service_type.categoria      is 'Categoría del vuelo (Regular, Fletamento, Vuelos adicionales, Otros).';
comment on column public.flight_service_type.tipo_operacion is 'Tipo de operación (Pasajeros, Carga/Correo, Sin especificar, ...).';
comment on column public.flight_service_type.descripcion    is 'Descripción del tipo de servicio.';

-- ── Trigger para updated_at ────────────────────────────────────────────────
create or replace function public.tg_set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists set_updated_at on public.flight_service_type;
create trigger set_updated_at
    before update on public.flight_service_type
    for each row execute function public.tg_set_updated_at();

-- ── RLS + políticas (lectura/escritura para usuarios autenticados) ─────────
alter table public.flight_service_type enable row level security;

drop policy if exists fst_select on public.flight_service_type;
create policy fst_select on public.flight_service_type
    for select to authenticated using (true);

drop policy if exists fst_insert on public.flight_service_type;
create policy fst_insert on public.flight_service_type
    for insert to authenticated with check (true);

drop policy if exists fst_update on public.flight_service_type;
create policy fst_update on public.flight_service_type
    for update to authenticated using (true) with check (true);

drop policy if exists fst_delete on public.flight_service_type;
create policy fst_delete on public.flight_service_type
    for delete to authenticated using (true);

-- ── Grants ─────────────────────────────────────────────────────────────────
grant select, insert, update, delete on public.flight_service_type to authenticated;

-- ── Datos del catálogo ─────────────────────────────────────────────────────
insert into public.flight_service_type (codigo, categoria, tipo_operacion, descripcion) values
    ('A', 'Vuelos adicionales', 'Carga, Correo',              'Carga/Correo'),
    ('B', 'Vuelos adicionales', 'Pasajeros',                   'Modo Compartido'),
    ('C', 'Fletamento',         'Pasajeros',                   'Solo Pasajeros'),
    ('D', 'Otros',              'Sin especificar',             'Aviación General'),
    ('E', 'Otros',              'Sin especificar',             'Especial (Gubernamentales)'),
    ('F', 'Regular',            'Carga,Correo',                'Servicio Normal'),
    ('G', 'Vuelos adicionales', 'Pasajeros',                   'Servicio Normal'),
    ('H', 'Fletamento',         'Carga,Correo',                'Carga y /o Correo'),
    ('I', 'Otros',              'Sin especificar',             'Estatal/Diplomático/Ambulancia Aérea'),
    ('J', 'Regular',            'Pasajeros',                   'Servicio Normal'),
    ('K', 'Otros',              'Sin especificar',             'Entrenamiento (Escuela/Vuelo de Verificación)'),
    ('L', 'Fletamento',         'Pasajeros, Carga, Correo',    'Pasajeros y Carga y/o Correo'),
    ('M', 'Regular',            'Carga,Correo',                'Solo Correo'),
    ('N', 'Otros',              'Sin especificar',             'Aviación Ejecutiva/Taxi Aéreo'),
    ('O', 'Fletamento',         'Manejo Especial',             'Manejo Especial (Migrantes/Inmigrantes)'),
    ('P', 'Otros',              'Sin especificar',             'Sin ganancia Posicionamiento/Ferry/Entrega/Demo)'),
    ('Q', 'Regular',            'Pasajeros,Carga',             'Pasajeros y Carga en Cabina (aviones de configuración mixta)'),
    ('R', 'Vuelos adicionales', 'Pasajeros,Carga',             'Pasajeros/Carga en Cabina (aviones de configuración mixta)'),
    ('S', 'Regular',            'Pasajeros',                   'Modo Compartido'),
    ('T', 'Otros',              'Sin especificar',             'Vuelos de Prueba'),
    ('U', 'Regular',            'Pasajeros',                   'Servicio operado por un vehículo por un vehículo en plataforma'),
    ('V', 'Regular',            'Carga,Correo',                'Servicio operado por un vehículo por un vehículo en plataforma'),
    ('W', 'Otros',              'Sin especificar',             'Militar'),
    ('X', 'Otros',              'Sin especificar',             'Escala Técnica')
on conflict (codigo) do update set
    categoria      = excluded.categoria,
    tipo_operacion = excluded.tipo_operacion,
    descripcion    = excluded.descripcion,
    updated_at     = now();
