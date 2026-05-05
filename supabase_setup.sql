-- COPIA Y PEGA ESTO EN EL SQL EDITOR DE SUPABASE PARA CORREGIR EL ERROR --

-- 1. Tabla de Roles (user_roles)
create table if not exists public.user_roles (
  user_id uuid references auth.users on delete cascade not null primary key,
  role text not null default 'viewer' check (role in ('admin', 'editor', 'viewer'))
);
alter table public.user_roles enable row level security;

-- Policies para user_roles
drop policy if exists "Usuarios pueden ver su propio rol" on public.user_roles;
create policy "Usuarios pueden ver su propio rol" on public.user_roles for select to authenticated using (auth.uid() = user_id);

-- 2. Tabla de Perfiles (profiles)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  username text,
  full_name text,
  created_at timestamptz default now()
);
alter table public.profiles enable row level security;

-- Policies para profiles
drop policy if exists "Perfiles visibles para todos los autenticados" on public.profiles;
create policy "Perfiles visibles para todos los autenticados" on public.profiles for select to authenticated using (true);

drop policy if exists "Usuarios pueden editar su propio perfil" on public.profiles;
create policy "Usuarios pueden editar su propio perfil" on public.profiles for update using (auth.uid() = id);

-- 3. Tabla de Operaciones (custom_parte_operaciones)
create table if not exists public.custom_parte_operaciones (
  date text primary key,
  entries jsonb
);
alter table public.custom_parte_operaciones enable row level security;

-- Policies para operaciones
drop policy if exists "Permitir todo a usuarios autenticados" on public.custom_parte_operaciones;
create policy "Permitir todo a usuarios autenticados" on public.custom_parte_operaciones for all to authenticated using (true) with check (true);

-- 4. Función y Trigger para nuevos usuarios (ESTO ES LO QUE FALLABA)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  -- Insertar perfil
  insert into public.profiles (id, username, full_name)
  values (
    new.id,
    split_part(new.email, '@', 1),
    new.raw_user_meta_data->>'full_name'
  )
  on conflict (id) do nothing;
  
  -- Insertar rol por defecto
  insert into public.user_roles (user_id, role)
  values (new.id, 'viewer')
  on conflict (user_id) do nothing;
  
  return new;
end;
$$ language plpgsql security definer;

-- Recrear el trigger
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 5. (Opcional) Asignar rol de ADMIN a un usuario específico (reemplaza el email)
-- insert into public.user_roles (user_id, role)
-- select id, 'admin' from auth.users where email = 'Isaac.Lopez@aifa.operaciones'
-- on conflict (user_id) do update set role = 'admin';
