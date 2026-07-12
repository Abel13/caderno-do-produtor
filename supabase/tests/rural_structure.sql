begin;create extension if not exists pgtap with schema extensions;select plan(7);
insert into auth.users(id,instance_id,aud,role,email,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)values('30000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','rural@example.com',now(),'{}','{}',now(),now());set local role authenticated;select set_config('request.jwt.claim.sub','30000000-0000-0000-0000-000000000001',true);
select lives_ok($$select public.complete_producer_onboarding('Rural','Fazenda Rural','Lavras','MG',10)$$,'setup');
select lives_ok(format($$select public.create_plot('%s','Talhão A',5,'active')$$,(select id from properties where name='Fazenda Rural')),'create plot');
select is((select count(*)::integer from plot_versions),1,'initial version');
select lives_ok(format($$select public.update_plot('%s','Talhão A',4,'active')$$,(select id from plots where name='Talhão A')),'update plot');
select is((select count(*)::integer from plot_versions),2,'plot history preserved');
select lives_ok(format($$select public.create_planting('%s'::uuid,null::uuid,4::numeric,null::date,2020::smallint,null::numeric,null::numeric,null::integer,'productive'::public.planting_status,null::text,null::text)$$,(select id from plots where name='Talhão A')),'optional cultivar');
select throws_ok(format($$select public.create_planting('%s'::uuid,null::uuid,1::numeric,null::date,2024::smallint,null::numeric,null::numeric,null::integer,'forming'::public.planting_status,null::text,null::text)$$,(select id from plots where name='Talhão A')),'P0001','active_planting_exists','one active planting');select * from finish();rollback;
