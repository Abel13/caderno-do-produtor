begin;
create extension if not exists pgtap with schema extensions;
select plan(19);

insert into auth.users(
  id, instance_id, aud, role, email, email_confirmed_at, raw_user_meta_data, raw_app_meta_data, created_at, updated_at
) values
  ('75000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'owner.foliar@example.com', now(), '{"full_name":"Owner Foliar"}', '{}', now(), now()),
  ('75000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'tech.foliar@example.com', now(), '{"full_name":"Technician Foliar"}', '{}', now(), now()),
  ('75000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'external.foliar@example.com', now(), '{"full_name":"External Foliar"}', '{}', now(), now());

set local role authenticated;
select set_config('request.jwt.claim.sub', '75000000-0000-0000-0000-000000000001', true);

select lives_ok(
  $$select public.complete_producer_onboarding('Conta Foliar', 'Fazenda Foliar', 'Patos de Minas', 'MG', 30)$$,
  'owner completa onboarding foliar'
);

select lives_ok(
  $$select public.create_plot((select id from public.properties where name='Fazenda Foliar' limit 1), 'Talhão Foliar', 8)$$,
  'owner cria talhão foliar'
);

select lives_ok(
  $$select public.create_planting(
    (select id from public.plots where name='Talhão Foliar' limit 1),
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
  'owner cria lavoura foliar'
);

select lives_ok(
  $$select public.create_season((select id from public.properties where name='Fazenda Foliar' limit 1), 'Safra Foliar', '2026-01-01'::date, '2026-12-31'::date, 'open'::public.season_status)$$,
  'owner cria safra foliar'
);

select lives_ok(
  $$select public.create_foliar_fertilization_record(
    (select id from public.properties where name='Fazenda Foliar' limit 1),
    (select id from public.plots where name='Talhão Foliar' limit 1),
    (select id from public.plantings limit 1),
    (select id from public.harvest_seasons where name='Safra Foliar' limit 1),
    '2026-07-10'::date,
    'Nutrição foliar pós-florada',
    400,
    24.5,
    68,
    5,
    'manhã sem chuva',
    'hh',
    3,
    12,
    'Alex',
    'mistura registrada',
    '[{"product_name":"Boro","dose_value":1.5,"dose_unit":"L/ha","total_quantity":12},{"product_name":"Zinco","dose_value":250,"dose_unit":"mL/100 L"}]'::jsonb,
    '75000000-1000-4000-8000-000000000001'::uuid
  )$$,
  'owner registra adubação via folha'
);

select is((select count(*)::integer from public.foliar_fertilization_records), 1, 'registro tipado de adubação foliar criado');
select is((select count(*)::integer from public.foliar_fertilization_components), 2, 'componentes da mistura criados');
select is((select count(*)::integer from public.operational_records where record_type='adubacao_foliar'), 1, 'adubação foliar gera operational record interno');

select lives_ok(
  $$select public.update_foliar_fertilization_record(
    (select id from public.foliar_fertilization_records limit 1),
    (select id from public.plots where name='Talhão Foliar' limit 1),
    (select id from public.plantings limit 1),
    (select id from public.harvest_seasons where name='Safra Foliar' limit 1),
    '2026-07-11'::date,
    'Micronutrientes',
    350,
    23,
    70,
    4,
    'sem vento forte',
    'hm',
    2,
    8,
    'Maria',
    'corrigido',
    '[{"product_name":"Manganês","dose_value":2,"dose_unit":"kg/ha","total_quantity":16}]'::jsonb
  )$$,
  'owner corrige ficha foliar'
);

select is((select purpose from public.foliar_fertilization_records limit 1), 'Micronutrientes', 'finalidade atualizada');
select is((select count(*)::integer from public.foliar_fertilization_components), 1, 'componentes são substituídos de forma atômica');

select throws_ok(
  $$select public.create_foliar_fertilization_record(
    (select id from public.properties where name='Fazenda Foliar' limit 1),
    (select id from public.plots where name='Talhão Foliar' limit 1),
    null::uuid,
    null::uuid,
    '2026-07-10'::date,
    'Nutrição',
    -1,
    null::numeric,
    null::numeric,
    null::numeric,
    null,
    null,
    null::numeric,
    null::numeric,
    null,
    null,
    '[]'::jsonb,
    '75000000-1000-4000-8000-000000000002'::uuid
  )$$,
  'P0001',
  'foliar_fertilization_invalid_values',
  'bloqueia valores inválidos'
);

select lives_ok(
  $$select public.delete_foliar_fertilization_record((select id from public.foliar_fertilization_records limit 1))$$,
  'owner apaga foliar logicamente'
);

select ok(
  (select op.deleted_at is not null from public.foliar_fertilization_records fr join public.operational_records op on op.id=fr.operational_record_id limit 1),
  'exclusão foliar é lógica'
);

select lives_ok(
  $$select public.restore_foliar_fertilization_record((select id from public.foliar_fertilization_records limit 1), 'restaurar foliar')$$,
  'owner restaura foliar'
);

select ok(
  (select count(*) >= 4 from public.audit_log where table_name = 'foliar_fertilization_records'),
  'mutações foliares geram auditoria'
);

reset role;
insert into public.account_memberships(account_id, user_id, role, status)
select p.account_id, '75000000-0000-0000-0000-000000000002'::uuid, 'technician'::public.account_role, 'active'
from public.properties p
where p.name='Fazenda Foliar'
limit 1;

insert into public.property_access(property_id, membership_id, granted_by)
select p.id, m.id, '75000000-0000-0000-0000-000000000001'::uuid
from public.properties p
join public.account_memberships m on m.account_id = p.account_id
where p.name='Fazenda Foliar'
  and m.user_id = '75000000-0000-0000-0000-000000000002'::uuid
limit 1;

set local role authenticated;
select set_config('request.jwt.claim.sub', '75000000-0000-0000-0000-000000000002', true);
select is((select count(*)::integer from public.foliar_fertilization_records), 1, 'técnico autorizado consulta foliar');

select throws_ok(
  $$select public.create_foliar_fertilization_record(
    (select id from public.properties where name='Fazenda Foliar' limit 1),
    (select id from public.plots where name='Talhão Foliar' limit 1),
    null::uuid,
    null::uuid,
    '2026-07-10'::date,
    'Nutrição',
    400,
    null::numeric,
    null::numeric,
    null::numeric,
    null,
    null,
    null::numeric,
    null::numeric,
    null,
    null,
    '[{"product_name":"Boro","dose_value":1,"dose_unit":"L/ha"}]'::jsonb,
    '75000000-1000-4000-8000-000000000003'::uuid
  )$$,
  'P0001',
  'permission_denied',
  'técnico não cria foliar'
);

select set_config('request.jwt.claim.sub', '75000000-0000-0000-0000-000000000003', true);
select is((select count(*)::integer from public.foliar_fertilization_records), 0, 'usuário externo não lê foliar');

select * from finish();
rollback;
