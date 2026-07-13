begin;
create extension if not exists pgtap with schema extensions;
select plan(15);

insert into auth.users(
  id, instance_id, aud, role, email, email_confirmed_at, raw_user_meta_data, raw_app_meta_data, created_at, updated_at
) values
  ('50000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'owner.operations@example.com', now(), '{"full_name":"Owner Ops"}', '{}', now(), now()),
  ('50000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'tech.operations@example.com', now(), '{"full_name":"Technician Ops"}', '{}', now(), now()),
  ('50000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'manager.operations@example.com', now(), '{"full_name":"Manager Ops"}', '{}', now(), now()),
  ('50000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'external.operations@example.com', now(), '{"full_name":"External Ops"}', '{}', now(), now());

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

create temp table operation_context as
select id as property_id
from public.properties
where name='Fazenda Operações'
limit 1;

create temp table operation_client_guard(id uuid, client_id uuid);

insert into operation_client_guard(id, client_id)
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

insert into operation_client_guard(id, client_id)
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
  (select count(distinct id)::integer from operation_client_guard),
  1,
  'idempotência mantém único registro por cliente'
);
select is(
  (select count(*)::integer from public.operational_records where property_id = (select id from public.properties where name='Fazenda Operações' limit 1) and client_id = '55555555-0000-0000-0000-000000000001'::uuid),
  1,
  'registro idempotente não cria duplicado'
);

select throws_ok(
  $$insert into public.operational_records(property_id, record_type, occurred_at, created_by)
    values(
      (select id from public.properties where name='Fazenda Operações' limit 1),
      'chuva',
      now(),
      '50000000-0000-0000-0000-000000000001'::uuid
  )$$,
  '42501',
  null,
  'escrita direta em registros operacionais é bloqueada por RLS'
);

select lives_ok(
  $$select public.delete_operational_record((select id from operation_client_guard limit 1))$$,
  'owner apaga logicamente registro operacional'
);

select ok(
  (select deleted_at is not null from public.operational_records where id = (select id from operation_client_guard limit 1)),
  'exclusão operacional é lógica'
);

select lives_ok(
  $$select public.restore_operational_record((select id from operation_client_guard limit 1), 'restauração de teste')$$,
  'owner restaura registro operacional'
);

select ok(
  (select count(*) >= 4 from public.audit_log where table_name = 'operational_records' and record_id = (select id from operation_client_guard limit 1)),
  'criação, reenvio, exclusão e restauração geram auditoria'
);

reset role;
insert into public.account_memberships(account_id, user_id, role, status)
select p.account_id, '50000000-0000-0000-0000-000000000003'::uuid, 'manager'::public.account_role, 'active'
from public.properties p
where p.name='Fazenda Operações'
limit 1;

set local role authenticated;
select set_config('request.jwt.claim.sub', '50000000-0000-0000-0000-000000000003', true);
select lives_ok(
  $$select public.create_operational_record(
    (select property_id from operation_context),
    'monitoramento',
    now(),
    null::uuid,
    null::uuid,
    null::uuid,
    '{"comment":"vistoria"}'::jsonb,
    null,
    'draft'::public.record_status,
    'manual'::public.operation_origin,
    null::uuid,
    '88888888-0000-0000-0000-000000000001'::uuid
  )$$,
  'gestor registra operação'
);

select set_config('request.jwt.claim.sub', '50000000-0000-0000-0000-000000000001', true);
update public.harvest_seasons
set status = 'closed'
where property_id = (select id from public.properties where name='Fazenda Operações' limit 1);

select throws_ok(
  $$select public.create_operational_record(
    (select property_id from operation_context),
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

reset role;
insert into public.account_memberships(account_id, user_id, role, status)
select p.account_id, '50000000-0000-0000-0000-000000000002'::uuid, 'technician'::public.account_role, 'active'
from public.properties p
where p.name='Fazenda Operações'
limit 1;

set local role authenticated;
select set_config('request.jwt.claim.sub', '50000000-0000-0000-0000-000000000002', true);
select throws_ok(
  $$select public.create_operational_record(
    (select property_id from operation_context),
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
  8,
  'catálogo base de tipos de operação disponível'
);

select set_config('request.jwt.claim.sub', '50000000-0000-0000-0000-000000000004', true);
select is(
  (select count(*)::integer from public.operational_records),
  0,
  'usuário externo não lê registros operacionais'
);

select * from finish();
rollback;
