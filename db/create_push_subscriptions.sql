-- ================================================================
-- AIFA OPERACIONES — Push Subscriptions
-- Tabla para almacenar suscripciones Web Push por usuario
-- ================================================================

create table if not exists push_subscriptions (
    id           uuid primary key default gen_random_uuid(),
    user_id      uuid not null references auth.users(id) on delete cascade,
    area         text not null,          -- 'DO','DA','DPE','DCS','GSO','UT','GC','AFAC','all'
    role         text not null default 'viewer',
    endpoint     text not null,
    p256dh       text not null,
    auth_key     text not null,
    user_agent   text,
    created_at   timestamptz default now(),
    updated_at   timestamptz default now(),
    unique (user_id)
);

-- Índice para buscar rápido por área al enviar notificaciones masivas
create index if not exists idx_push_subscriptions_area
    on push_subscriptions (area);

-- RLS
alter table push_subscriptions enable row level security;

-- El usuario puede insertar/actualizar/leer su propia suscripción
create policy "push_subs_own_all"
    on push_subscriptions
    for all
    using  (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- El service_role (Edge Functions) puede leer todas para envío
create policy "push_subs_service_read"
    on push_subscriptions
    for select
    using (true);

-- Actualizar updated_at automáticamente
create or replace function push_subscriptions_set_updated_at()
returns trigger language plpgsql as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists push_subscriptions_updated_at on push_subscriptions;
create trigger push_subscriptions_updated_at
    before update on push_subscriptions
    for each row execute procedure push_subscriptions_set_updated_at();
