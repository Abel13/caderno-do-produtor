begin;
create extension if not exists pgtap with schema extensions;
select plan(13);

insert into auth.users(
  id, instance_id, aud, role, email, email_confirmed_at, raw_user_meta_data, raw_app_meta_data, created_at, updated_at
) values
  ('70000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'owner.climate@example.com', now(), '{"full_name":"Owner Climate"}', '{}', now(), now()),
  ('70000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'tech.climate@example.com', now(), '{"full_name":"Technician Climate"}', '{}', now(), now()),
  ('70000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'external.climate@example.com', now(), '{"full_name":"External Climate"}', '{}', now(), now());

set local role authenticated;
select set_config('request.jwt.claim.sub', '70000000-0000-0000-0000-000000000001', true);

select lives_ok(
  $$select public.complete_producer_onboarding('Conta Clima', 'Fazenda Clima', 'Manhuacu', 'MG', 12)$$,
  'owner completa onboarding'
);

select lives_ok(
  $$select public.create_plot((select id from public.properties where name='Fazenda Clima' limit 1), 'Talhão Chuva', 5)$$,
  'owner cria talhão'
);

select lives_ok(
  $$select public.create_season((select id from public.properties where name='Fazenda Clima' limit 1), 'Safra Chuva', '2026-01-01'::date, '2026-12-31'::date, 'open'::public.season_status)$$,
  'owner cria safra'
);

select lives_ok(
  $$select public.create_climate_measurement_point((select id from public.properties where name='Fazenda Clima' limit 1), 'Sede', 'Pluviômetro principal')$$,
  'owner cadastra pluviômetro'
);

select lives_ok(
  $$select public.create_rainfall_record(
    (select id from public.properties where name='Fazenda Clima' limit 1),
    '2026-02-10'::date,
    (select id from public.climate_measurement_points where name='Sede' limit 1),
    32.5,
    (select id from public.plots where name='Talhão Chuva' limit 1),
    (select id from public.harvest_seasons where name='Safra Chuva' limit 1),
    'chuva forte',
    'confirmed'::public.record_status,
    '77777777-0000-0000-0000-000000000001'::uuid
  )$$,
  'owner registra chuva'
);

select is((select count(*)::integer from public.climate_readings where control_type='rainfall'), 1, 'registro tipado de chuva criado');
select is((select count(*)::integer from public.operational_records where record_type='chuva'), 1, 'operational record de chuva criado');

select lives_ok(
  $$select public.create_daily_weather_record(
    (select id from public.properties where name='Fazenda Clima' limit 1),
    '2026-02-11'::date,
    (select id from public.climate_measurement_points where name='Sede' limit 1),
    12,
    18,
    24,
    30,
    75,
    'granizo leve',
    null::uuid,
    (select id from public.harvest_seasons where name='Safra Chuva' limit 1),
    null,
    'confirmed'::public.record_status,
    '77777777-0000-0000-0000-000000000002'::uuid
  )$$,
  'owner registra clima diário'
);

select throws_ok(
  $$select public.create_daily_weather_record(
    (select id from public.properties where name='Fazenda Clima' limit 1),
    '2026-02-12'::date,
    (select id from public.climate_measurement_points where name='Sede' limit 1),
    -1,
    null,
    null,
    null,
    null,
    null,
    null::uuid,
    null::uuid,
    null,
    'confirmed'::public.record_status,
    '77777777-0000-0000-0000-000000000003'::uuid
  )$$,
  'P0001',
  'rainfall_volume_negative',
  'bloqueia chuva negativa'
);

select lives_ok(
  $$select public.delete_climate_reading((select id from public.climate_readings where control_type='rainfall' limit 1))$$,
  'owner apaga chuva logicamente'
);

select ok(
  (select op.deleted_at is not null from public.climate_readings cr join public.operational_records op on op.id=cr.operational_record_id where cr.control_type='rainfall' limit 1),
  'exclusão climática é lógica via operational_records'
);

reset role;
insert into public.account_memberships(account_id, user_id, role, status)
select p.account_id, '70000000-0000-0000-0000-000000000002'::uuid, 'technician'::public.account_role, 'active'
from public.properties p
where p.name='Fazenda Clima'
limit 1;

insert into public.property_access(property_id, membership_id, granted_by)
select
  p.id,
  m.id,
  '70000000-0000-0000-0000-000000000001'::uuid
from public.properties p
join public.account_memberships m on m.account_id = p.account_id
where p.name='Fazenda Clima'
  and m.user_id = '70000000-0000-0000-0000-000000000002'::uuid
limit 1;

set local role authenticated;
select set_config('request.jwt.claim.sub', '70000000-0000-0000-0000-000000000002', true);
select throws_ok(
  $$select public.create_rainfall_record(
    (select id from public.properties where name='Fazenda Clima' limit 1),
    '2026-02-13'::date,
    (select id from public.climate_measurement_points where name='Sede' limit 1),
    5,
    null::uuid,
    null::uuid,
    null,
    'confirmed'::public.record_status,
    '77777777-0000-0000-0000-000000000004'::uuid
  )$$,
  'P0001',
  'permission_denied',
  'técnico não cria chuva'
);

select set_config('request.jwt.claim.sub', '70000000-0000-0000-0000-000000000003', true);
select is((select count(*)::integer from public.climate_readings), 0, 'usuário externo não lê clima');

select * from finish();
rollback;
