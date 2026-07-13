begin;
create extension if not exists pgtap with schema extensions;
select plan(22);

insert into auth.users(
  id, instance_id, aud, role, email, email_confirmed_at, raw_user_meta_data, raw_app_meta_data, created_at, updated_at
) values
  ('73000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'owner.correction@example.com', now(), '{"full_name":"Owner Correction"}', '{}', now(), now()),
  ('73000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'tech.correction@example.com', now(), '{"full_name":"Technician Correction"}', '{}', now(), now()),
  ('73000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'external.correction@example.com', now(), '{"full_name":"External Correction"}', '{}', now(), now());

set local role authenticated;
select set_config('request.jwt.claim.sub', '73000000-0000-0000-0000-000000000001', true);

select lives_ok(
  $$select public.complete_producer_onboarding('Conta Correção', 'Fazenda Correção', 'Patrocínio', 'MG', 25)$$,
  'owner completa onboarding de correção'
);

select lives_ok(
  $$select public.create_plot((select id from public.properties where name='Fazenda Correção' limit 1), 'Talhão Correção', 8)$$,
  'owner cria talhão'
);

select lives_ok(
  $$select public.create_planting(
    (select id from public.plots where name='Talhão Correção' limit 1),
    null::uuid,
    8,
    '2021-10-01'::date,
    null::smallint,
    3,
    0.7,
    3800,
    'productive'::public.planting_status,
    'sequeiro',
    'viveiro local'
  )$$,
  'owner cria lavoura'
);

select lives_ok(
  $$select public.create_season((select id from public.properties where name='Fazenda Correção' limit 1), 'Safra Correção', '2026-01-01'::date, '2026-12-31'::date, 'open'::public.season_status)$$,
  'owner cria safra'
);

select lives_ok(
  $$select public.create_soil_analysis_record(
    (select id from public.properties where name='Fazenda Correção' limit 1),
    (select id from public.plots where name='Talhão Correção' limit 1),
    (select id from public.plantings limit 1),
    (select id from public.harvest_seasons where name='Safra Correção' limit 1),
    '2026-06-11'::date,
    '0-20 cm',
    'Laboratório Solo',
    'C-001',
    '{"ph_water":5.1}'::jsonb,
    'referência',
    'manual',
    '73000000-1000-4000-8000-000000000001'::uuid
  )$$,
  'owner registra análise de referência'
);

select lives_ok(
  $$select public.create_soil_correction_record(
    (select id from public.properties where name='Fazenda Correção' limit 1),
    (select id from public.plots where name='Talhão Correção' limit 1),
    (select id from public.plantings limit 1),
    (select id from public.harvest_seasons where name='Safra Correção' limit 1),
    (select id from public.soil_analysis_records limit 1),
    '2026-07-10'::date,
    'Calcário dolomítico',
    82.5,
    1.5,
    12,
    'hm',
    2.5,
    18,
    'João',
    'linha da ficha',
    '73000000-1000-4000-8000-000000000002'::uuid
  )$$,
  'owner registra correção do solo'
);

select is((select count(*)::integer from public.soil_correction_records), 1, 'registro tipado de correção criado');
select is((select count(*)::integer from public.operational_records where record_type='correcao_solo'), 1, 'correção gera operational record interno');
select is((select total_quantity_t from public.soil_correction_records limit 1), 12::numeric, 'quantidade total persistida');

select lives_ok(
  $$select public.update_soil_correction_record(
    (select id from public.soil_correction_records limit 1),
    (select id from public.plots where name='Talhão Correção' limit 1),
    (select id from public.plantings limit 1),
    (select id from public.harvest_seasons where name='Safra Correção' limit 1),
    (select id from public.soil_analysis_records limit 1),
    '2026-07-11'::date,
    'Gesso agrícola',
    null::numeric,
    1.25,
    10,
    'hh',
    3,
    12,
    'Maria',
    'corrigido'
  )$$,
  'owner corrige ficha de correção'
);

select is((select corrective_name from public.soil_correction_records limit 1), 'Gesso agrícola', 'corretivo atualizado');
select is((select labor_type from public.soil_correction_records limit 1), 'hh', 'tipo hh/hm atualizado');

select throws_ok(
  $$select public.create_soil_correction_record(
    (select id from public.properties where name='Fazenda Correção' limit 1),
    (select id from public.plots where name='Talhão Correção' limit 1),
    null::uuid,
    null::uuid,
    null::uuid,
    '2026-07-12'::date,
    'Calcário',
    250,
    1,
    8,
    null,
    null::numeric,
    null::numeric,
    null,
    null,
    '73000000-1000-4000-8000-000000000003'::uuid
  )$$,
  'P0001',
  'soil_correction_invalid_prnt',
  'bloqueia PRNT inválido'
);

select throws_ok(
  $$select public.create_soil_correction_record(
    (select id from public.properties where name='Fazenda Correção' limit 1),
    (select id from public.plots where name='Talhão Correção' limit 1),
    null::uuid,
    null::uuid,
    null::uuid,
    '2026-07-12'::date,
    'Calcário',
    null::numeric,
    1,
    -1,
    'hm',
    1,
    0,
    null,
    null,
    '73000000-1000-4000-8000-000000000004'::uuid
  )$$,
  'P0001',
  'soil_correction_invalid_quantity',
  'bloqueia quantidade inválida'
);

select lives_ok(
  $$select public.delete_soil_correction_record((select id from public.soil_correction_records limit 1))$$,
  'owner apaga correção logicamente'
);

select ok(
  (select op.deleted_at is not null from public.soil_correction_records sr join public.operational_records op on op.id=sr.operational_record_id limit 1),
  'exclusão de correção é lógica'
);

select lives_ok(
  $$select public.restore_soil_correction_record((select id from public.soil_correction_records limit 1), 'restaurar correção')$$,
  'owner restaura correção'
);

select ok(
  (select count(*) >= 4 from public.audit_log where table_name = 'soil_correction_records'),
  'mutações de correção geram auditoria'
);

select throws_ok(
  $$insert into public.soil_correction_records(
    operational_record_id, property_id, plot_id, applied_on, corrective_name, total_quantity_t
  )
  values (
    (select public.create_operational_record(
      (select id from public.properties where name='Fazenda Correção' limit 1),
      'correcao_solo',
      now(),
      (select id from public.plots where name='Talhão Correção' limit 1),
      null::uuid,
      null::uuid,
      '{}'::jsonb,
      null,
      'confirmed'::public.record_status,
      'manual'::public.operation_origin,
      null::uuid,
      '73000000-1000-4000-8000-000000000005'::uuid
    )),
    (select id from public.properties where name='Fazenda Correção' limit 1),
    (select id from public.plots where name='Talhão Correção' limit 1),
    '2026-07-13'::date,
    'Calcário',
    8
  )$$,
  '42501',
  null,
  'escrita direta na tabela é bloqueada por RLS'
);

reset role;
insert into public.account_memberships(account_id, user_id, role, status)
select p.account_id, '73000000-0000-0000-0000-000000000002'::uuid, 'technician'::public.account_role, 'active'
from public.properties p
where p.name='Fazenda Correção'
limit 1;

insert into public.property_access(property_id, membership_id, granted_by)
select p.id, m.id, '73000000-0000-0000-0000-000000000001'::uuid
from public.properties p
join public.account_memberships m on m.account_id = p.account_id
where p.name='Fazenda Correção'
  and m.user_id = '73000000-0000-0000-0000-000000000002'::uuid
limit 1;

set local role authenticated;
select set_config('request.jwt.claim.sub', '73000000-0000-0000-0000-000000000002', true);
select is((select count(*)::integer from public.soil_correction_records), 1, 'técnico autorizado consulta correção');

select throws_ok(
  $$select public.create_soil_correction_record(
    (select id from public.properties where name='Fazenda Correção' limit 1),
    (select id from public.plots where name='Talhão Correção' limit 1),
    null::uuid,
    null::uuid,
    null::uuid,
    '2026-07-14'::date,
    'Calcário',
    null::numeric,
    1,
    8,
    null,
    null::numeric,
    null::numeric,
    null,
    null,
    '73000000-1000-4000-8000-000000000006'::uuid
  )$$,
  'P0001',
  'permission_denied',
  'técnico não cria correção'
);

select set_config('request.jwt.claim.sub', '73000000-0000-0000-0000-000000000003', true);
select is((select count(*)::integer from public.soil_correction_records), 0, 'usuário externo não lê correção');

select * from finish();
rollback;
