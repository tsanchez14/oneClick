-- 001_create_tables.sql
-- Creates all tables for the onClick SaaS platform

-- ──────────────────────────────────────────────
-- 1. Tenants (negocios registrados)
-- ──────────────────────────────────────────────
create table if not exists tenants (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  slug            text unique not null,
  phone           text,
  email           text,
  logo_url        text,
  working_days    int[] default '{1,2,3,4,5}',
  open_time       time default '09:00',
  close_time      time default '18:00',
  status          text default 'trial' check (status in ('trial', 'active', 'suspended', 'cancelled')),
  trial_ends_at   timestamptz,
  created_at      timestamptz default now()
);

-- ──────────────────────────────────────────────
-- 2. Users (admin y profesionales)
-- ──────────────────────────────────────────────
create table if not exists users (
  id              uuid primary key references auth.users,
  tenant_id       uuid references tenants(id) on delete cascade,
  role            text not null check (role in ('admin', 'professional', 'superadmin')),
  full_name       text,
  phone           text,
  avatar_url      text,
  is_active       boolean default true,
  created_at      timestamptz default now()
);

-- ──────────────────────────────────────────────
-- 3. Invitations (invitaciones de profesionales)
-- ──────────────────────────────────────────────
create table if not exists invitations (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid references tenants(id) on delete cascade,
  token           text unique not null,
  email           text,
  expires_at      timestamptz,
  used_at         timestamptz,
  created_by      uuid references users(id) on delete cascade
);

-- ──────────────────────────────────────────────
-- 4. Services (servicios del negocio)
-- ──────────────────────────────────────────────
create table if not exists services (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid references tenants(id) on delete cascade,
  name            text not null,
  duration_slots  int not null,
  price           numeric(10, 2),
  color           text,
  is_active       boolean default true
);

-- ──────────────────────────────────────────────
-- 5. Professionals (extension de user con datos del negocio)
-- ──────────────────────────────────────────────
create table if not exists professionals (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid references tenants(id) on delete cascade,
  user_id         uuid references users(id) on delete cascade,
  display_name    text,
  specialty       text,
  is_available    boolean default true
);

-- ──────────────────────────────────────────────
-- 6. Clients (clientes finales sin cuenta)
-- ──────────────────────────────────────────────
create table if not exists clients (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid references tenants(id) on delete cascade,
  full_name       text not null,
  phone           text not null,
  created_at      timestamptz default now(),
  unique(tenant_id, phone)
);

-- ──────────────────────────────────────────────
-- 7. Appointments (turnos / citas)
-- ──────────────────────────────────────────────
create table if not exists appointments (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid references tenants(id) on delete cascade,
  professional_id uuid references professionals(id) on delete cascade,
  service_id      uuid references services(id) on delete cascade,
  client_id       uuid references clients(id) on delete cascade,
  starts_at       timestamptz not null,
  ends_at         timestamptz not null,
  status          text default 'confirmed' check (status in ('confirmed', 'cancelled', 'blocked', 'no_show')),
  notes           text,
  booked_from     text default 'system' check (booked_from in ('system', 'public_url')),
  whatsapp_sent   boolean default false,
  created_at      timestamptz default now()
);

-- ──────────────────────────────────────────────
-- 8. Time Blocks (bloqueos de tiempo)
-- ──────────────────────────────────────────────
create table if not exists time_blocks (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid references tenants(id) on delete cascade,
  professional_id uuid references professionals(id) on delete cascade,
  starts_at       timestamptz not null,
  ends_at         timestamptz not null,
  reason          text
);

-- ──────────────────────────────────────────────
-- 9. Subscriptions (suscripciones)
-- ──────────────────────────────────────────────
create table if not exists subscriptions (
  id                    uuid primary key default gen_random_uuid(),
  tenant_id             uuid references tenants(id) on delete cascade,
  plan                  text not null check (plan in ('base', 'pro', 'premium')),
  status                text default 'trial' check (status in ('trial', 'active', 'past_due', 'cancelled')),
  payment_method        text check (payment_method in ('mercadopago', 'manual')),
  mp_subscription_id    text,
  current_period_start  timestamptz,
  current_period_end    timestamptz,
  promo_ends_at         timestamptz,
  created_at            timestamptz default now()
);

-- ──────────────────────────────────────────────
-- 10. Payment History (historial de pagos)
-- ──────────────────────────────────────────────
create table if not exists payment_history (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid references tenants(id) on delete cascade,
  subscription_id uuid references subscriptions(id) on delete cascade,
  amount          numeric(10, 2),
  method          text check (method in ('mercadopago', 'manual')),
  status          text check (status in ('paid', 'failed', 'refunded')),
  paid_at         timestamptz,
  notes           text
);

-- ──────────────────────────────────────────────
-- Create indexes for performance
-- ──────────────────────────────────────────────
create index if not exists idx_users_tenant    on users(tenant_id);
create index if not exists idx_users_role      on users(role);
create index if not exists idx_services_tenant on services(tenant_id);
create index if not exists idx_professionals_tenant on professionals(tenant_id);
create index if not exists idx_clients_tenant  on clients(tenant_id);
create index if not exists idx_appointments_tenant      on appointments(tenant_id);
create index if not exists idx_appointments_professional on appointments(professional_id);
create index if not exists idx_appointments_starts_at   on appointments(starts_at);
create index if not exists idx_time_blocks_tenant       on time_blocks(tenant_id);
create index if not exists idx_subscriptions_tenant     on subscriptions(tenant_id);
create index if not exists idx_payment_history_tenant   on payment_history(tenant_id);
