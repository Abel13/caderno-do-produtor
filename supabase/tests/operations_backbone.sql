begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

insert into auth.users(
  id, instance_id, aud, role, email, email_confirmed_at, raw_user_meta_data, raw_app_meta_data, created_at, updated_at
) values
  ('50000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'owner.operations@example.com', now(), '{"full_name":"Owner Ops"}', '{}', now(), now()),
  ('50000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'tech.operations@example.com', now(), '{"full_name":"Technician Ops"}', '{}', now(), now());

set local role authenticated;
select set_config('request.jwt.claim.sub', '50000000-0000-0000-0000-000000000001', true);

select lives_ok(
  $$select public.complete_producer_onboarding('Conta de Operações', 'Fazenda Operações', 'Sao Paulo', 'SP', 10)$$,
  'owner completes onboarding'
);

select lives_ok(
  $$select public.create_plot((select id from public.properties where name='Fazenda Operações' limit 1), 'Talhão Principal', 5)$$,
  'owner cria talhão'
);
select lives_ok(
  $$select public.create_season((select id from public.properties where name='Fazenda Operações' limit 1), 'Safra 2026', '2026-01-01'::date, '2026-12-31'::date, 'open'::public.season_status)$$,
  'owner cria safra'
);

create temp table public.operation_client_guard(id uuid, client_id uuid);

insert into public.operation_client_guard(id, client_id)
select
  public.create_operational_record(
    (select id from public.properties where name='Fazenda Operações' limit 1),
    'chuva',
    now(),
    null::uuid,
    null::uuid,
    null::uuid,
    '{}'::jsonb,
    'registro inicial',
    'confirmed'::public.record_status,
    'manual'::public.operation_origin,
    null::uuid,
    '55555555-0000-0000-0000-000000000001'::uuid
  ) as id,
  '55555555-0000-0000-0000-000000000001'::uuid as client_id;

insert into public.operation_client_guard(id, client_id)
select
  public.create_operational_record(
    (select id from public.properties where name='Fazenda Operações' limit 1),
    'chuva',
    now(),
    null::uuid,
    null::uuid,
    null::uuid,
    '{"comment":"reenvio seguro"}'::jsonb,
    'resubmissao',
    'confirmed'::public.record_status,
    'manual'::public.operation_origin,
    null::uuid,
    '55555555-0000-0000-0000-000000000001'::uuid
  ) as id,
  '55555555-0000-0000-0000-000000000001'::uuid as client_id;

select is(
  (select count(distinct id) from public.operation_client_guard),
  1,
  'idempotência mantém único registro por cliente'
);
select is(
  (select count(*)::integer from public.operational_records where property_id = (select id from public.properties where name='Fazenda Operações' limit 1) and client_id = '55555555-0000-0000-0000-000000000001'::uuid),
  1,
  'registro idempotente não cria duplicado'
);

update public.harvest_seasons
set status = 'closed'
where property_id = (select id from public.properties where name='Fazenda Operações' limit 1);

select throws_ok(
  $$select public.create_operational_record(
    (select id from public.properties where name='Fazenda Operações' limit 1),
    'chuva',
    now(),
    null::uuid,
    null::uuid,
    (select id from public.harvest_seasons where property_id=(select id from public.properties where name='Fazenda Operações' limit 1) limit 1),
    '{}'::jsonb,
    null,
    'draft'::public.record_status,
    'manual'::public.operation_origin,
    null::uuid,
    '66666666-0000-0000-0000-000000000001'::uuid
  )$$,
  'P0001',
  'season_closed_record',
  'safra encerrada bloqueia nova inclusão'
);

insert into public.account_memberships(account_id, user_id, role, status)
select account_id, '50000000-0000-0000-0000-000000000002'::uuid, 'technician'::public.account_role, 'active'
from public.accounts
where id = (select account_id from public.properties where name='Fazenda Operações' limit 1);

select set_config('request.jwt.claim.sub', '50000000-0000-0000-0000-000000000002', true);
select throws_ok(
  $$select public.create_operational_record(
    (select id from public.properties where name='Fazenda Operações' limit 1),
    'chuva',
    now(),
    null::uuid,
    null::uuid,
    null::uuid,
    '{}'::jsonb,
    null,
    'draft'::public.record_status,
    'manual'::public.operation_origin,
    null::uuid,
    '77777777-0000-0000-0000-000000000001'::uuid
  )$$,
  'P0001',
  'permission_denied',
  'técnico sem permissão não registra operação'
);

select set_config('request.jwt.claim.sub', '50000000-0000-0000-0000-000000000001', true);
select is(
  (select count(*)::integer from public.operation_types where active),
  5,
  'catálogo base de tipos de operação disponível'
);

select * from finish();
rollback;
