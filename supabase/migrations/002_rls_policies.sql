-- 002_rls_policies.sql
-- Enables Row Level Security and creates policies for multi-tenant isolation

-- ──────────────────────────────────────────────
-- Helper function: is_superadmin
-- Returns true if the authenticated user has role = 'superadmin'
-- ──────────────────────────────────────────────
create or replace function public.is_superadmin()
returns boolean
language sql
stable
security definer
as $$
  select exists (
    select 1
    from public.users
    where id = auth.uid()
      and role = 'superadmin'
  );
$$;

-- ──────────────────────────────────────────────
-- Enable RLS on all tenant-scoped tables
-- (tenants and users are managed by application logic)
-- ──────────────────────────────────────────────
alter table if exists public.appointments   enable row level security;
alter table if exists public.services       enable row level security;
alter table if exists public.professionals  enable row level security;
alter table if exists public.clients        enable row level security;
alter table if exists public.time_blocks    enable row level security;
alter table if exists public.subscriptions  enable row level security;
alter table if exists public.payment_history enable row level security;
alter table if exists public.invitations    enable row level security;

-- ──────────────────────────────────────────────
-- Policy: tenant isolation for appointments
-- ──────────────────────────────────────────────
drop policy if exists "tenant_isolation" on public.appointments;
create policy "tenant_isolation" on public.appointments
  for all
  using (tenant_id = ((select auth.jwt()) ->> 'tenant_id')::uuid)
  with check (tenant_id = ((select auth.jwt()) ->> 'tenant_id')::uuid);

-- ──────────────────────────────────────────────
-- Policy: tenant isolation for services
-- ──────────────────────────────────────────────
drop policy if exists "tenant_isolation" on public.services;
create policy "tenant_isolation" on public.services
  for all
  using (tenant_id = ((select auth.jwt()) ->> 'tenant_id')::uuid)
  with check (tenant_id = ((select auth.jwt()) ->> 'tenant_id')::uuid);

-- ──────────────────────────────────────────────
-- Policy: tenant isolation for professionals
-- ──────────────────────────────────────────────
drop policy if exists "tenant_isolation" on public.professionals;
create policy "tenant_isolation" on public.professionals
  for all
  using (tenant_id = ((select auth.jwt()) ->> 'tenant_id')::uuid)
  with check (tenant_id = ((select auth.jwt()) ->> 'tenant_id')::uuid);

-- ──────────────────────────────────────────────
-- Policy: tenant isolation for clients
-- ──────────────────────────────────────────────
drop policy if exists "tenant_isolation" on public.clients;
create policy "tenant_isolation" on public.clients
  for all
  using (tenant_id = ((select auth.jwt()) ->> 'tenant_id')::uuid)
  with check (tenant_id = ((select auth.jwt()) ->> 'tenant_id')::uuid);

-- ──────────────────────────────────────────────
-- Policy: tenant isolation for time_blocks
-- ──────────────────────────────────────────────
drop policy if exists "tenant_isolation" on public.time_blocks;
create policy "tenant_isolation" on public.time_blocks
  for all
  using (tenant_id = ((select auth.jwt()) ->> 'tenant_id')::uuid)
  with check (tenant_id = ((select auth.jwt()) ->> 'tenant_id')::uuid);

-- ──────────────────────────────────────────────
-- Policy: tenant isolation for subscriptions
-- ──────────────────────────────────────────────
drop policy if exists "tenant_isolation" on public.subscriptions;
create policy "tenant_isolation" on public.subscriptions
  for all
  using (tenant_id = ((select auth.jwt()) ->> 'tenant_id')::uuid)
  with check (tenant_id = ((select auth.jwt()) ->> 'tenant_id')::uuid);

-- ──────────────────────────────────────────────
-- Policy: tenant isolation for payment_history
-- ──────────────────────────────────────────────
drop policy if exists "tenant_isolation" on public.payment_history;
create policy "tenant_isolation" on public.payment_history
  for all
  using (tenant_id = ((select auth.jwt()) ->> 'tenant_id')::uuid)
  with check (tenant_id = ((select auth.jwt()) ->> 'tenant_id')::uuid);

-- ──────────────────────────────────────────────
-- Policy: tenant isolation for invitations
-- ──────────────────────────────────────────────
drop policy if exists "tenant_isolation" on public.invitations;
create policy "tenant_isolation" on public.invitations
  for all
  using (tenant_id = ((select auth.jwt()) ->> 'tenant_id')::uuid)
  with check (tenant_id = ((select auth.jwt()) ->> 'tenant_id')::uuid);

-- ──────────────────────────────────────────────
-- Policy: professionals can only UPDATE their own appointments
-- ──────────────────────────────────────────────
drop policy if exists "professional_own_appointments" on public.appointments;
create policy "professional_own_appointments" on public.appointments
  for update
  using (
    professional_id = ((select auth.jwt()) ->> 'professional_id')::uuid
    and tenant_id = ((select auth.jwt()) ->> 'tenant_id')::uuid
  )
  with check (
    professional_id = ((select auth.jwt()) ->> 'professional_id')::uuid
    and tenant_id = ((select auth.jwt()) ->> 'tenant_id')::uuid
  );

-- ──────────────────────────────────────────────
-- Superadmin bypass policies
-- The is_superadmin() function checks role = 'superadmin' in the users table.
-- These policies allow full access when the user is a superadmin.
-- ──────────────────────────────────────────────
drop policy if exists "superadmin_all" on public.appointments;
create policy "superadmin_all" on public.appointments
  for all
  using (public.is_superadmin());

drop policy if exists "superadmin_all" on public.services;
create policy "superadmin_all" on public.services
  for all
  using (public.is_superadmin());

drop policy if exists "superadmin_all" on public.professionals;
create policy "superadmin_all" on public.professionals
  for all
  using (public.is_superadmin());

drop policy if exists "superadmin_all" on public.clients;
create policy "superadmin_all" on public.clients
  for all
  using (public.is_superadmin());

drop policy if exists "superadmin_all" on public.time_blocks;
create policy "superadmin_all" on public.time_blocks
  for all
  using (public.is_superadmin());

drop policy if exists "superadmin_all" on public.subscriptions;
create policy "superadmin_all" on public.subscriptions
  for all
  using (public.is_superadmin());

drop policy if exists "superadmin_all" on public.payment_history;
create policy "superadmin_all" on public.payment_history
  for all
  using (public.is_superadmin());

drop policy if exists "superadmin_all" on public.invitations;
create policy "superadmin_all" on public.invitations
  for all
  using (public.is_superadmin());
