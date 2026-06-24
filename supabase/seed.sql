-- seed.sql — onClick demo data
-- 1. Ejecutar migraciones 001, 002, 003 primero
-- 2. Crear 3 usuarios en Authentication > Users > Create user:
--      admin@demo.onclick.com  / demo123
--      lucia@demo.onclick.com  / demo123
--      martin@demo.onclick.com / demo123
-- 3. Ejecutar este script

-- ── CLEANUP ──
delete from appointments where tenant_id = 'a0000000-0000-0000-0000-000000000001';
delete from time_blocks where tenant_id = 'a0000000-0000-0000-0000-000000000001';
delete from services where tenant_id = 'a0000000-0000-0000-0000-000000000001';
delete from professionals where tenant_id = 'a0000000-0000-0000-0000-000000000001';
delete from clients where tenant_id = 'a0000000-0000-0000-0000-000000000001';
delete from subscriptions where tenant_id = 'a0000000-0000-0000-0000-000000000001';
delete from payment_history where tenant_id = 'a0000000-0000-0000-0000-000000000001';
delete from public.users where tenant_id = 'a0000000-0000-0000-0000-000000000001';
delete from tenants where id = 'a0000000-0000-0000-0000-000000000001';

-- ── 1. TENANT ──
insert into tenants (id, name, slug, phone, email, working_days, open_time, close_time, status, trial_ends_at)
values (
  'a0000000-0000-0000-0000-000000000001',
  'Barbería Demo',
  'demo',
  '+541112345678',
  'demo@onclick.com',
  '{1,2,3,4,5,6}',
  '09:00',
  '20:00',
  'trial',
  now() + interval '14 days'
);

-- ── 2. PUBLIC USERS ──
insert into public.users (id, tenant_id, role, full_name, phone, is_active)
select id, 'a0000000-0000-0000-0000-000000000001'::uuid, 'admin',        'Carlos García',  '+541111111111', true
from auth.users where email = 'admin@demo.onclick.com'
union all
select id, 'a0000000-0000-0000-0000-000000000001'::uuid, 'professional', 'Lucía Martínez', '+541111111112', true
from auth.users where email = 'lucia@demo.onclick.com'
union all
select id, 'a0000000-0000-0000-0000-000000000001'::uuid, 'professional', 'Martín López',   '+541111111113', true
from auth.users where email = 'martin@demo.onclick.com';

-- ── 3. PROFESSIONALS ──
insert into professionals (id, tenant_id, user_id, display_name, specialty, is_available)
select 'c0000000-0000-0000-0000-000000000001'::uuid, 'a0000000-0000-0000-0000-000000000001'::uuid, id, 'Lucía Martínez', 'Corte y color', true
from auth.users where email = 'lucia@demo.onclick.com'
union all
select 'c0000000-0000-0000-0000-000000000002'::uuid, 'a0000000-0000-0000-0000-000000000001'::uuid, id, 'Martín López',   'Barba y degradado', true
from auth.users where email = 'martin@demo.onclick.com';

-- ── 4. SERVICES ──
insert into services (id, tenant_id, name, duration_slots, price, color, is_active)
values
  ('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Corte clásico',      4,  8000,  '#3B82F6', true),
  ('d0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Corte + barba',      6,  12000, '#10B981', true),
  ('d0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Corte degradado',    4,  9000,  '#F59E0B', true),
  ('d0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'Teñido completo',    12, 25000, '#8B5CF6', true),
  ('d0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'Arreglo de barba',   2,  5000,  '#EC4899', true);

-- ── 5. CLIENTS ──
insert into clients (id, tenant_id, full_name, phone)
values
  ('e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Juan Pérez',      '+541122223333'),
  ('e0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Ana Rodríguez',   '+541144445555'),
  ('e0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Pedro Gómez',     '+541166667777'),
  ('e0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'Sofía Fernández', '+541188889999');

-- ── 6. APPOINTMENTS (semana próxima) ──
with
  monday as (select date_trunc('week', current_date + interval '1 week')::timestamptz as m),
  data (client_id, professional_id, service_id, day_offset, hour, minute) as (
    values
      ('e0000000-0000-0000-0000-000000000001'::uuid, 'c0000000-0000-0000-0000-000000000001'::uuid,
       'd0000000-0000-0000-0000-000000000001'::uuid, 0, 10, 0),
      ('e0000000-0000-0000-0000-000000000002'::uuid, 'c0000000-0000-0000-0000-000000000001'::uuid,
       'd0000000-0000-0000-0000-000000000002'::uuid, 0, 11, 0),
      ('e0000000-0000-0000-0000-000000000003'::uuid, 'c0000000-0000-0000-0000-000000000002'::uuid,
       'd0000000-0000-0000-0000-000000000003'::uuid, 1, 9,  0),
      ('e0000000-0000-0000-0000-000000000004'::uuid, 'c0000000-0000-0000-0000-000000000002'::uuid,
       'd0000000-0000-0000-0000-000000000001'::uuid, 2, 14, 0),
      ('e0000000-0000-0000-0000-000000000001'::uuid, 'c0000000-0000-0000-0000-000000000001'::uuid,
       'd0000000-0000-0000-0000-000000000005'::uuid, 3, 16, 0)
  )
insert into appointments (tenant_id, professional_id, service_id, client_id, starts_at, ends_at, status, booked_from)
select
  'a0000000-0000-0000-0000-000000000001',
  d.professional_id, d.service_id, d.client_id,
  monday.m + d.day_offset * interval '1 day' + d.hour * interval '1 hour' + d.minute * interval '1 minute',
  monday.m + d.day_offset * interval '1 day' + d.hour * interval '1 hour' + d.minute * interval '1 minute'
    + (select duration_slots from services where id = d.service_id) * interval '15 minutes',
  'confirmed',
  case when random() < 0.5 then 'system' else 'public_url' end
from data d, monday;

-- ── 7. SUBSCRIPTION ──
insert into subscriptions (id, tenant_id, plan, status, current_period_start, current_period_end, promo_ends_at)
values (
  'a0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000001',
  'premium', 'trial', now(), now() + interval '14 days', now() + interval '3 months'
);
