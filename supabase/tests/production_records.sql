begin;
create extension if not exists pgtap with schema extensions;
select plan(18);

insert into auth.users(
  id, instance_id, aud, role, email, email_confirmed_at, raw_user_meta_data, raw_app_meta_data, created_at, updated_at
) values
  ('71000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'owner.production@example.com', now(), '{"full_name":"Owner Production"}', '{}', now(), now()),
  ('71000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'tech.production@example.com', now(), '{"full_name":"Technician Production"}', '{}', now(), now()),
  ('71000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'external.production@example.com', now(), '{"full_name":"External Production"}', '{}', now(), now());

set local role authenticated;
select set_config('request.jwt.claim.sub', '71000000-0000-0000-0000-000000000001', true);

select lives_ok(
  $$select public.complete_producer_onboarding('Conta Produção', 'Fazenda Produção', 'Varginha', 'MG', 20)$$,
  'owner completa onboarding de produção'
);

select lives_ok(
  $$select public.create_plot((select id from public.properties where name='Fazenda Produção' limit 1), 'Talhão Produção', 9)$$,
  'owner cria talhão'
);

select lives_ok(
  $$select public.create_planting(
    (select id from public.plots where name='Talhão Produção' limit 1),
    null::uuid,
    9,
    '2022-10-01'::date,
    null::smallint,
    3,
    0.7,
    4200,
    'productive'::public.planting_status,
    'sequeiro',
    'viveiro local'
  )$$,
  'owner cria lavoura produtiva'
);

select lives_ok(
  $$select public.create_season((select id from public.properties where name='Fazenda Produção' limit 1), 'Safra Produção', '2026-01-01'::date, '2026-12-31'::date, 'open'::public.season_status)$$,
  'owner cria safra'
);

select lives_ok(
  $$select public.create_production_record(
    (select id from public.properties where name='Fazenda Produção' limit 1),
    (select id from public.plots where name='Talhão Produção' limit 1),
    (select id from public.plantings limit 1),
    (select id from public.harvest_seasons where name='Safra Produção' limit 1),
    '2026-07-01'::date,
    9,
    34,
    null::numeric,
    'A2',
    'Via úmida',
    'Dura',
    '6',
    10,
    'linha da ficha',
    '71000000-1000-4000-8000-000000000001'::uuid
  )$$,
  'owner registra produção'
);

select is((select count(*)::integer from public.production_records), 1, 'registro tipado de produção criado');
select is((select count(*)::integer from public.operational_records where record_type='producao'), 1, 'produção gera operational record interno');
select is((select total_sc from public.production_records limit 1), 306::numeric, 'produção total é calculada por área e produtividade');

select lives_ok(
  $$select public.update_production_record(
    (select id from public.production_records limit 1),
    (select id from public.plots where name='Talhão Produção' limit 1),
    (select id from public.plantings limit 1),
    (select id from public.harvest_seasons where name='Safra Produção' limit 1),
    '2026-07-02'::date,
    9,
    null::numeric,
    315,
    'A3',
    'Natural',
    'Mole',
    '5',
    8,
    'corrigido'
  )$$,
  'owner corrige produção'
);

select is((select productivity_sc_ha from public.production_records limit 1), 35::numeric, 'produtividade é calculada por total e área');

select throws_ok(
  $$select public.create_production_record(
    (select id from public.properties where name='Fazenda Produção' limit 1),
    (select id from public.plots where name='Talhão Produção' limit 1),
    null::uuid,
    (select id from public.harvest_seasons where name='Safra Produção' limit 1),
    '2026-07-03'::date,
    9,
    null::numeric,
    null::numeric,
    null,
    null,
    null,
    null,
    null::numeric,
    null,
    '71000000-1000-4000-8000-000000000002'::uuid
  )$$,
  'P0001',
  'production_invalid_quantity',
  'bloqueia produção sem total ou produtividade'
);

select lives_ok(
  $$select public.delete_production_record((select id from public.production_records limit 1))$$,
  'owner apaga produção logicamente'
);

select ok(
  (select op.deleted_at is not null from public.production_records pr join public.operational_records op on op.id=pr.operational_record_id limit 1),
  'exclusão de produção é lógica'
);

select lives_ok(
  $$select public.restore_production_record((select id from public.production_records limit 1), 'restaurar ficha')$$,
  'owner restaura produção'
);

select ok(
  (select count(*) >= 3 from public.audit_log where table_name = 'production_records'),
  'mutações de produção geram auditoria'
);

select throws_ok(
  $$insert into public.production_records(
    operational_record_id, property_id, plot_id, season_id, harvested_on, area_ha, productivity_sc_ha, total_sc
  )
  values (
    (select public.create_operational_record(
      (select id from public.properties where name='Fazenda Produção' limit 1),
      'producao',
      now(),
      (select id from public.plots where name='Talhão Produção' limit 1),
      null::uuid,
      (select id from public.harvest_seasons where name='Safra Produção' limit 1),
      '{}'::jsonb,
      null,
      'confirmed'::public.record_status,
      'manual'::public.operation_origin,
      null::uuid,
      '71000000-1000-4000-8000-000000000003'::uuid
    )),
    (select id from public.properties where name='Fazenda Produção' limit 1),
    (select id from public.plots where name='Talhão Produção' limit 1),
    (select id from public.harvest_seasons where name='Safra Produção' limit 1),
    '2026-07-04'::date,
    1,
    1,
    1
  )$$,
  '42501',
  null,
  'escrita direta na tabela é bloqueada por RLS'
);

reset role;
insert into public.account_memberships(account_id, user_id, role, status)
select p.account_id, '71000000-0000-0000-0000-000000000002'::uuid, 'technician'::public.account_role, 'active'
from public.properties p
where p.name='Fazenda Produção'
limit 1;

insert into public.property_access(property_id, membership_id, granted_by)
select p.id, m.id, '71000000-0000-0000-0000-000000000001'::uuid
from public.properties p
join public.account_memberships m on m.account_id = p.account_id
where p.name='Fazenda Produção'
  and m.user_id = '71000000-0000-0000-0000-000000000002'::uuid
limit 1;

set local role authenticated;
select set_config('request.jwt.claim.sub', '71000000-0000-0000-0000-000000000002', true);
select throws_ok(
  $$select public.create_production_record(
    (select id from public.properties where name='Fazenda Produção' limit 1),
    (select id from public.plots where name='Talhão Produção' limit 1),
    null::uuid,
    (select id from public.harvest_seasons where name='Safra Produção' limit 1),
    '2026-07-05'::date,
    9,
    30,
    null::numeric,
    null,
    null,
    null,
    null,
    null::numeric,
    null,
    '71000000-1000-4000-8000-000000000004'::uuid
  )$$,
  'P0001',
  'permission_denied',
  'técnico não cria produção'
);

select set_config('request.jwt.claim.sub', '71000000-0000-0000-0000-000000000003', true);
select is((select count(*)::integer from public.production_records), 0, 'usuário externo não lê produção');

select * from finish();
rollback;
