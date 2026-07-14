begin;
create extension if not exists pgtap with schema extensions;
select plan(21);

insert into auth.users(
  id, instance_id, aud, role, email, email_confirmed_at, raw_user_meta_data, raw_app_meta_data, created_at, updated_at
) values
  ('74000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'owner.fertilization@example.com', now(), '{"full_name":"Owner Fertilization"}', '{}', now(), now()),
  ('74000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'tech.fertilization@example.com', now(), '{"full_name":"Technician Fertilization"}', '{}', now(), now()),
  ('74000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'external.fertilization@example.com', now(), '{"full_name":"External Fertilization"}', '{}', now(), now());

set local role authenticated;
select set_config('request.jwt.claim.sub', '74000000-0000-0000-0000-000000000001', true);

select lives_ok(
  $$select public.complete_producer_onboarding('Conta Adubação', 'Fazenda Adubação', 'Patos de Minas', 'MG', 30)$$,
  'owner completa onboarding de adubação'
);

select lives_ok(
  $$select public.create_plot((select id from public.properties where name='Fazenda Adubação' limit 1), 'Talhão Adubação', 9.5)$$,
  'owner cria talhão'
);

select lives_ok(
  $$select public.create_planting(
    (select id from public.plots where name='Talhão Adubação' limit 1),
    null::uuid,
    9.5,
    '2021-10-01'::date,
    null::smallint,
    3,
    0.7,
    4000,
    'productive'::public.planting_status,
    'sequeiro',
    'viveiro local'
  )$$,
  'owner cria lavoura'
);

select lives_ok(
  $$select public.create_season((select id from public.properties where name='Fazenda Adubação' limit 1), 'Safra Adubação', '2026-01-01'::date, '2026-12-31'::date, 'open'::public.season_status)$$,
  'owner cria safra'
);

select lives_ok(
  $$select public.create_soil_analysis_record(
    (select id from public.properties where name='Fazenda Adubação' limit 1),
    (select id from public.plots where name='Talhão Adubação' limit 1),
    (select id from public.plantings limit 1),
    (select id from public.harvest_seasons where name='Safra Adubação' limit 1),
    '2026-06-11'::date,
    '0-20 cm',
    'Laboratório Solo',
    'A-001',
    '{"ph_water":5.1}'::jsonb,
    'referência',
    'manual',
    '74000000-1000-4000-8000-000000000001'::uuid
  )$$,
  'owner registra análise de referência'
);

select lives_ok(
  $$select public.create_soil_fertilization_record(
    (select id from public.properties where name='Fazenda Adubação' limit 1),
    (select id from public.plots where name='Talhão Adubação' limit 1),
    (select id from public.plantings limit 1),
    (select id from public.harvest_seasons where name='Safra Adubação' limit 1),
    (select id from public.soil_analysis_records limit 1),
    '2026-07-10'::date,
    '20-05-20',
    250,
    2375,
    '1ª cobertura',
    'hh',
    3,
    12,
    'Alex',
    'linha da ficha',
    '74000000-1000-4000-8000-000000000002'::uuid
  )$$,
  'owner registra adubação via solo'
);

select is((select count(*)::integer from public.soil_fertilization_records), 1, 'registro tipado de adubação criado');
select is((select count(*)::integer from public.operational_records where record_type='adubacao_solo'), 1, 'adubação gera operational record interno');
select is((select total_quantity_kg from public.soil_fertilization_records limit 1), 2375::numeric, 'quantidade total persistida');

select lives_ok(
  $$select public.update_soil_fertilization_record(
    (select id from public.soil_fertilization_records limit 1),
    (select id from public.plots where name='Talhão Adubação' limit 1),
    (select id from public.plantings limit 1),
    (select id from public.harvest_seasons where name='Safra Adubação' limit 1),
    (select id from public.soil_analysis_records limit 1),
    '2026-07-11'::date,
    '30-00-10',
    200,
    1900,
    '2ª cobertura',
    'hm',
    2,
    10,
    'Maria',
    'corrigido'
  )$$,
  'owner corrige ficha de adubação'
);

select is((select fertilizer_name from public.soil_fertilization_records limit 1), '30-00-10', 'insumo atualizado');
select is((select labor_type from public.soil_fertilization_records limit 1), 'hm', 'tipo hh/hm atualizado');

select throws_ok(
  $$select public.create_soil_fertilization_record(
    (select id from public.properties where name='Fazenda Adubação' limit 1),
    (select id from public.plots where name='Talhão Adubação' limit 1),
    null::uuid,
    null::uuid,
    null::uuid,
    '2026-07-10'::date,
    '20-05-20',
    -1,
    100,
    null,
    null,
    null::numeric,
    null::numeric,
    null,
    null,
    '74000000-1000-4000-8000-000000000003'::uuid
  )$$,
  'P0001',
  'soil_fertilization_invalid_quantity',
  'bloqueia dose inválida'
);

select lives_ok(
  $$select public.delete_soil_fertilization_record((select id from public.soil_fertilization_records limit 1))$$,
  'owner apaga adubação logicamente'
);

select ok(
  (select op.deleted_at is not null from public.soil_fertilization_records sr join public.operational_records op on op.id=sr.operational_record_id limit 1),
  'exclusão de adubação é lógica'
);

select lives_ok(
  $$select public.restore_soil_fertilization_record((select id from public.soil_fertilization_records limit 1), 'restaurar adubação')$$,
  'owner restaura adubação'
);

select ok(
  (select count(*) >= 4 from public.audit_log where table_name = 'soil_fertilization_records'),
  'mutações de adubação geram auditoria'
);

select throws_ok(
  $$insert into public.soil_fertilization_records(
    operational_record_id, property_id, plot_id, applied_on, fertilizer_name, total_quantity_kg
  )
  values (
    (select public.create_operational_record(
      (select id from public.properties where name='Fazenda Adubação' limit 1),
      'adubacao_solo',
      now(),
      (select id from public.plots where name='Talhão Adubação' limit 1),
      null::uuid,
      null::uuid,
      '{}'::jsonb,
      null,
      'confirmed'::public.record_status,
      'manual'::public.operation_origin,
      null::uuid,
      '74000000-1000-4000-8000-000000000004'::uuid
    )),
    (select id from public.properties where name='Fazenda Adubação' limit 1),
    (select id from public.plots where name='Talhão Adubação' limit 1),
    '2026-07-10'::date,
    '20-05-20',
    100
  )$$,
  '42501',
  null,
  'escrita direta na tabela é bloqueada por RLS'
);

reset role;
insert into public.account_memberships(account_id, user_id, role, status)
select p.account_id, '74000000-0000-0000-0000-000000000002'::uuid, 'technician'::public.account_role, 'active'
from public.properties p
where p.name='Fazenda Adubação'
limit 1;

insert into public.property_access(property_id, membership_id, granted_by)
select p.id, m.id, '74000000-0000-0000-0000-000000000001'::uuid
from public.properties p
join public.account_memberships m on m.account_id = p.account_id
where p.name='Fazenda Adubação'
  and m.user_id = '74000000-0000-0000-0000-000000000002'::uuid
limit 1;

set local role authenticated;
select set_config('request.jwt.claim.sub', '74000000-0000-0000-0000-000000000002', true);
select is((select count(*)::integer from public.soil_fertilization_records), 1, 'técnico autorizado consulta adubação');

select throws_ok(
  $$select public.create_soil_fertilization_record(
    (select id from public.properties where name='Fazenda Adubação' limit 1),
    (select id from public.plots where name='Talhão Adubação' limit 1),
    null::uuid,
    null::uuid,
    null::uuid,
    '2026-07-10'::date,
    '20-05-20',
    250,
    2375,
    null,
    null,
    null::numeric,
    null::numeric,
    null,
    null,
    '74000000-1000-4000-8000-000000000005'::uuid
  )$$,
  'P0001',
  'permission_denied',
  'técnico não cria adubação'
);

select set_config('request.jwt.claim.sub', '74000000-0000-0000-0000-000000000003', true);
select is((select count(*)::integer from public.soil_fertilization_records), 0, 'usuário externo não lê adubação');

select * from finish();
rollback;
