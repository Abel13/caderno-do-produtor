begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

insert into auth.users(id, instance_id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'owner2@example.com', now(), '{}', '{"full_name":"Owner Two"}', now(), now()),
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'manager2@example.com', now(), '{}', '{"full_name":"Manager Two"}', now(), now()),
  ('20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'tech2@example.com', now(), '{}', '{"full_name":"Tech Two"}', now(), now()),
  ('20000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'outsider2@example.com', now(), '{}', '{"full_name":"Outsider Two"}', now(), now());

set local role authenticated;
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000001', true);
select lives_ok($$select public.complete_producer_onboarding('Conta Dois','Fazenda Dois','Varginha','MG',20)$$, 'owner creates account');
select lives_ok(format($$select public.create_account_invitation('%s','manager2@example.com','manager','{}'::uuid[])$$, (select id from public.accounts where name = 'Conta Dois')), 'owner invites manager');

select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000002', true);
select is(public.accept_pending_invitations(), 1, 'manager accepts invitation');
select throws_ok(format($$select public.create_account_invitation('%s','outsider2@example.com','manager','{}'::uuid[])$$, (select id from public.accounts where name = 'Conta Dois')), 'P0001', 'permission_denied', 'manager cannot invite another manager');
select lives_ok(format($$select public.create_account_invitation('%s','tech2@example.com','technician',array['%s']::uuid[])$$, (select id from public.accounts where name = 'Conta Dois'), (select id from public.properties where name = 'Fazenda Dois')), 'manager invites technician');

select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000003', true);
select is(public.accept_pending_invitations(), 1, 'technician accepts invitation');
select throws_ok(format($$select public.create_account_invitation('%s','outsider2@example.com','technician',array['%s']::uuid[])$$, (select id from public.accounts where name = 'Conta Dois'), (select id from public.properties where name = 'Fazenda Dois')), 'P0001', 'permission_denied', 'technician cannot invite users');
select ok(public.can_access_property((select id from public.properties where name = 'Fazenda Dois')), 'technician reads granted property');
select throws_ok(format($$insert into public.account_memberships(account_id,user_id,role,status) values ('%s','20000000-0000-0000-0000-000000000004','technician','active')$$, (select id from public.accounts where name = 'Conta Dois')), '42501', null, 'technician cannot bypass RPC with direct membership insert');

select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000001', true);
select throws_ok(format($$select public.revoke_membership('%s')$$, (select id from public.account_memberships where account_id = (select id from public.accounts where name = 'Conta Dois') and role = 'owner')), 'P0001', 'owner_cannot_be_revoked', 'owner is protected from revocation');
select ok((select count(*) >= 5 from public.audit_log where account_id = (select id from public.accounts where name = 'Conta Dois')), 'identity mutations are audited');
select ok(not exists(select 1 from public.audit_log where old_data ? 'email' or new_data ? 'email'), 'audit payload excludes email');
select lives_ok($$select public.update_my_profile('Owner Updated','America/Cuiaba',false)$$, 'profile preferences update');
select is((select timezone from public.profiles where id = '20000000-0000-0000-0000-000000000001'), 'America/Cuiaba', 'profile timezone persisted');

select * from finish();
rollback;
