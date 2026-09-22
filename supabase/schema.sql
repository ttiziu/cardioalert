-- CardioAlert — schema inicial
-- Ejecutar en Supabase Dashboard > SQL Editor

create type classification_type as enum ('normal', 'afib', 'isquemia');
create type alert_status as enum ('pendiente', 'aceptada', 'derivada');

-- Perfiles: espejo de auth.users. `role` es la ÚNICA fuente de verdad del rol:
-- la leen la app, el backend y las políticas RLS.
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'paramedico'
    check (role in ('paramedico', 'medico', 'admin')),
  created_at timestamptz not null default now()
);

create table sessions (
  id uuid primary key default gen_random_uuid(),
  paramedic_id uuid not null references auth.users(id),
  -- Código anónimo del paciente (PAC-1234): no se guardan datos personales.
  patient_code text not null,
  device_id text not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  -- Última clasificación, desnormalizada para listar el historial sin joins.
  last_label classification_type not null default 'normal',
  last_confidence real not null default 0
);

create index sessions_paramedic_idx on sessions (paramedic_id, started_at desc);

create table classifications (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  classification classification_type not null,
  confidence real not null check (confidence >= 0 and confidence <= 1),
  created_at timestamptz not null default now()
);

create index classifications_session_idx on classifications (session_id, created_at);

create table alerts (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  paramedic_id uuid not null references auth.users(id),
  classification classification_type not null,
  confidence real not null check (confidence >= 0 and confidence <= 1),
  -- Ventana de ECG preprocesada que disparó la alerta (2500 muestras, 250 Hz, z-score)
  ecg_snapshot real[] not null,
  hr integer,
  rr_ms integer,
  latitude double precision,
  longitude double precision,
  created_at timestamptz not null default now(),
  status alert_status not null default 'pendiente',
  responded_at timestamptz,
  responded_by uuid references auth.users(id)
);

create index alerts_created_idx on alerts (created_at desc);

-- Realtime: el monitor hospitalario se suscribe a esta tabla
alter publication supabase_realtime add table alerts;

-- Crear el profile automáticamente al registrarse un usuario
create function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    -- Rol inicial al crear el usuario; después se cambia solo en `profiles`.
    coalesce(new.raw_app_meta_data ->> 'role', 'paramedico')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------
alter table profiles enable row level security;
alter table sessions enable row level security;
alter table classifications enable row level security;
alter table alerts enable row level security;

create function current_role_name()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- profiles: cada quien ve el suyo; admin ve todos
create policy "profiles_select_own" on profiles
  for select using (id = auth.uid() or current_role_name() = 'admin');

-- sessions: el paramédico ve las suyas; médico y admin ven todas
create policy "sessions_select" on sessions
  for select using (
    paramedic_id = auth.uid()
    or current_role_name() in ('medico', 'admin')
  );

create policy "sessions_insert_own" on sessions
  for insert with check (paramedic_id = auth.uid());

create policy "sessions_update_own" on sessions
  for update using (paramedic_id = auth.uid());

-- classifications: siguen la visibilidad de su sesión
create policy "classifications_select" on classifications
  for select using (
    exists (
      select 1 from sessions s
      where s.id = classifications.session_id
        and (
          s.paramedic_id = auth.uid()
          or current_role_name() in ('medico', 'admin')
        )
    )
  );

-- alerts: el paramédico ve las que envió; médico y admin ven todas
create policy "alerts_select" on alerts
  for select using (
    paramedic_id = auth.uid()
    or current_role_name() in ('medico', 'admin')
  );

create policy "alerts_insert_own" on alerts
  for insert with check (paramedic_id = auth.uid());

-- Solo el médico (o admin) responde una alerta: aceptar o derivar
create policy "alerts_respond" on alerts
  for update using (current_role_name() in ('medico', 'admin'));
