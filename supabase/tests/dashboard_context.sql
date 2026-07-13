begin;
create extension if not exists pgtap with schema extensions;
select plan(5);

insert into auth.users(
  id, instance_id, aud, role, email, email_confirmed_at, raw_user_meta_data, raw_app_meta_data, created_at, updated_at
) values
  ('60000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'owner.dashboard@example.com', now(), '{"full_name":"Owner Dashboard"}', '{}', now(), now()),
  ('60000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'external.dashboard@example.com', now(), '{"full_name":"External Dashboard"}', '{}', now(), now());

set local role authenticated;
select set_config('request.jwt.claim.sub', '60000000-0000-0000-0000-000000000001', true);

select lives_ok(
  $$select public.complete_producer_onboarding('Conta Dashboard', 'Fazenda Dashboard', 'Franca', 'SP', 12)$$,
  'owner cria contexto do dashboard'
);

select lives_ok(
  $$select public.create_season((select id from public.properties where name='Fazenda Dashboard' limit 1), 'Safra Dashboard', '2026-01-01'::date, '2026-12-31'::date, 'open'::public.season_status)$$,
  'owner cria safra do dashboard'
);

create temp table dashboard_context as
select id as season_id
from public.harvest_seasons
where name='Safra Dashboard'
limit 1;

select lives_ok(
  $$select public.set_active_season((select season_id from dashboard_context))$$,
  'owner seleciona safra ativa'
);

select is(
  (select public.get_my_identity_context() #>> '{profile,last_season_id}'),
  (select id::text from public.harvest_seasons where name='Safra Dashboard' limit 1),
  'contexto de identidade retorna safra ativa'
);

select set_config('request.jwt.claim.sub', '60000000-0000-0000-0000-000000000002', true);
select throws_ok(
  $$select public.set_active_season((select season_id from dashboard_context))$$,
  'P0001',
  'permission_denied',
  'usuário externo não seleciona safra de outra conta'
);

select * from finish();
rollback;
