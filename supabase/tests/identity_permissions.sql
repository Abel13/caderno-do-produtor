begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

insert into auth.users(id, instance_id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'owner@example.com', now(), '{}', '{"full_name":"Owner"}', now(), now()),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'tech@example.com', now(), '{}', '{"full_name":"Technician"}', now(), now()),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'outsider@example.com', now(), '{}', '{"full_name":"Outsider"}', now(), now());

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);

select lives_ok($$select public.complete_producer_onboarding('Conta Teste','Fazenda Teste','Varginha','MG',10)$$, 'owner completes onboarding atomically');
select is((select count(*)::integer from public.accounts), 1, 'onboarding creates one account');
select is((select count(*)::integer from public.properties), 1, 'onboarding creates one property');
select throws_ok($$select public.complete_producer_onboarding('Outra','Outra Fazenda','Varginha','MG',10)$$, 'P0001', 'onboarding_already_completed', 'onboarding is idempotent by rejection');

select lives_ok(format($$select public.create_account_invitation('%s','tech@example.com','technician',array['%s']::uuid[])$$,
  (select id from public.accounts limit 1), (select id from public.properties limit 1)), 'owner creates technician invitation');

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', true);
select is(public.accept_pending_invitations(), 1, 'technician accepts matching verified invitation');
select ok(public.can_access_property((select id from public.properties limit 1)), 'technician can read granted property');
select ok(not public.can_write_property((select id from public.properties limit 1)), 'technician cannot write generic operational records');

select * from finish();
rollback;
