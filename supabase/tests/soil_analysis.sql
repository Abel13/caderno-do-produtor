begin;
create extension if not exists pgtap with schema extensions;
select plan(20);

insert into auth.users(
  id, instance_id, aud, role, email, email_confirmed_at, raw_user_meta_data, raw_app_meta_data, created_at, updated_at
) values
  ('72000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'owner.soil@example.com', now(), '{"full_name":"Owner Soil"}', '{}', now(), now()),
  ('72000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'tech.soil@example.com', now(), '{"full_name":"Technician Soil"}', '{}', now(), now()),
  ('72000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'external.soil@example.com', now(), '{"full_name":"External Soil"}', '{}', now(), now());

set local role authenticated;
select set_config('request.jwt.claim.sub', '72000000-0000-0000-0000-000000000001', true);

select lives_ok(
  $$select public.complete_producer_onboarding('Conta Solo', 'Fazenda Solo', 'Manhuacu', 'MG', 30)$$,
  'owner completa onboarding'
);

select lives_ok(
  $$select public.create_plot((select id from public.properties where name='Fazenda Solo' limit 1), 'Talhão Solo', 8)$$,
  'owner cria talhão'
);

select lives_ok(
  $$select public.create_season((select id from public.properties where name='Fazenda Solo' limit 1), 'Safra Solo', '2026-01-01'::date, '2026-12-31'::date, 'open'::public.season_status)$$,
  'owner cria safra'
);

select lives_ok(
  $$select public.create_soil_analysis_record(
    (select id from public.properties where name='Fazenda Solo' limit 1),
    (select id from public.plots where name='Talhão Solo' limit 1),
    null::uuid,
    (select id from public.harvest_seasons where name='Safra Solo' limit 1),
    '2026-06-11'::date,
    '0-20 cm',
    'Laboratório de Solos Manhuaçu',
    'S20266814',
    '{"ph_water":5.18,"p_mg_dm3":48.67,"k_mg_dm3":143,"ca_cmolc_dm3":3.83,"mg_cmolc_dm3":0.98,"base_saturation_pct":39,"clay_pct":22}'::jsonb,
    'laudo manual',
    'manual',
    '72000000-1000-4000-8000-000000000001'::uuid
  )$$,
  'owner registra análise de solo'
);

select is((select count(*)::integer from public.soil_analysis_records), 1, 'registro tipado de análise criado');
select is((select count(*)::integer from public.operational_records where record_type='analise_solo'), 1, 'análise gera operational record interno');
select is((select ph_water from public.soil_analysis_records limit 1), 5.18::numeric, 'pH foi persistido');

select lives_ok(
  $$select public.update_soil_analysis_record(
    (select id from public.soil_analysis_records limit 1),
    (select id from public.plots where name='Talhão Solo' limit 1),
    null::uuid,
    (select id from public.harvest_seasons where name='Safra Solo' limit 1),
    '2026-06-12'::date,
    '20-40 cm',
    'Laboratório de Solos Manhuaçu',
    'S20266815',
    '{"ph_water":4.51,"base_saturation_pct":13.8,"clay_pct":28}'::jsonb,
    'corrigido',
    'manual'
  )$$,
  'owner corrige análise'
);

select is((select depth_cm from public.soil_analysis_records limit 1), '20-40 cm', 'profundidade corrigida');

select throws_ok(
  $$select public.create_soil_analysis_record(
    (select id from public.properties where name='Fazenda Solo' limit 1),
    (select id from public.plots where name='Talhão Solo' limit 1),
    null::uuid,
    null::uuid,
    '2026-06-13'::date,
    '0-20 cm',
    null,
    null,
    '{"ph_water":15}'::jsonb,
    null,
    'manual',
    '72000000-1000-4000-8000-000000000002'::uuid
  )$$,
  'P0001',
  'soil_analysis_invalid_parameter',
  'bloqueia parâmetro inválido'
);

select lives_ok(
  $$select public.create_soil_analysis_attachment(
    (select id from public.soil_analysis_records limit 1),
    'laudo.pdf',
    'soil-analyses/' || (select operational_record_id from public.soil_analysis_records limit 1) || '/laudo.pdf',
    'application/pdf',
    12345
  )$$,
  'owner registra metadado de anexo do laudo'
);

select is((select count(*)::integer from public.operation_record_attachments where attachment_type='soil_analysis_report'), 1, 'anexo do laudo registrado');

select lives_ok(
  $$select public.delete_soil_analysis_record((select id from public.soil_analysis_records limit 1))$$,
  'owner apaga análise logicamente'
);

select ok(
  (select op.deleted_at is not null from public.soil_analysis_records sr join public.operational_records op on op.id=sr.operational_record_id limit 1),
  'exclusão de análise é lógica'
);

select lives_ok(
  $$select public.restore_soil_analysis_record((select id from public.soil_analysis_records limit 1), 'restaurar análise')$$,
  'owner restaura análise'
);

select ok(
  (select count(*) >= 4 from public.audit_log where table_name in ('soil_analysis_records','operation_record_attachments')),
  'mutações de análise e anexo geram auditoria'
);

select throws_ok(
  $$insert into public.soil_analysis_records(
    operational_record_id, property_id, plot_id, collected_on, depth_cm
  )
  values (
    (select public.create_operational_record(
      (select id from public.properties where name='Fazenda Solo' limit 1),
      'analise_solo',
      now(),
      (select id from public.plots where name='Talhão Solo' limit 1),
      null::uuid,
      null::uuid,
      '{}'::jsonb,
      null,
      'confirmed'::public.record_status,
      'manual'::public.operation_origin,
      null::uuid,
      '72000000-1000-4000-8000-000000000003'::uuid
    )),
    (select id from public.properties where name='Fazenda Solo' limit 1),
    (select id from public.plots where name='Talhão Solo' limit 1),
    '2026-06-14'::date,
    '0-20 cm'
  )$$,
  '42501',
  null,
  'escrita direta na tabela é bloqueada por RLS'
);

reset role;
insert into public.account_memberships(account_id, user_id, role, status)
select p.account_id, '72000000-0000-0000-0000-000000000002'::uuid, 'technician'::public.account_role, 'active'
from public.properties p
where p.name='Fazenda Solo'
limit 1;

insert into public.property_access(property_id, membership_id, granted_by)
select p.id, m.id, '72000000-0000-0000-0000-000000000001'::uuid
from public.properties p
join public.account_memberships m on m.account_id = p.account_id
where p.name='Fazenda Solo'
  and m.user_id = '72000000-0000-0000-0000-000000000002'::uuid
limit 1;

set local role authenticated;
select set_config('request.jwt.claim.sub', '72000000-0000-0000-0000-000000000002', true);
select is((select count(*)::integer from public.soil_analysis_records), 1, 'técnico autorizado consulta análise');

select throws_ok(
  $$select public.create_soil_analysis_record(
    (select id from public.properties where name='Fazenda Solo' limit 1),
    (select id from public.plots where name='Talhão Solo' limit 1),
    null::uuid,
    null::uuid,
    '2026-06-15'::date,
    '0-20 cm',
    null,
    null,
    '{}'::jsonb,
    null,
    'manual',
    '72000000-1000-4000-8000-000000000004'::uuid
  )$$,
  'P0001',
  'permission_denied',
  'técnico não cria análise'
);

select set_config('request.jwt.claim.sub', '72000000-0000-0000-0000-000000000003', true);
select is((select count(*)::integer from public.soil_analysis_records), 0, 'usuário externo não lê análise');

select * from finish();
rollback;
