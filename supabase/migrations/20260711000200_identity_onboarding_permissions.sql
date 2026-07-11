create extension if not exists citext with schema extensions;

create type public.invitation_status as enum ('pending', 'accepted', 'revoked');

alter table public.profiles
  add column last_property_id uuid references public.properties(id) on delete set null;

create table public.account_invitations (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  email extensions.citext not null,
  role public.account_role not null check (role in ('manager', 'technician')),
  status public.invitation_status not null default 'pending',
  invited_by uuid not null references public.profiles(id),
  accepted_by uuid references public.profiles(id),
  accepted_at timestamptz,
  revoked_by uuid references public.profiles(id),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (email = lower(trim(email::text))),
  check ((status = 'accepted') = (accepted_by is not null and accepted_at is not null)),
  check ((status = 'revoked') = (revoked_by is not null and revoked_at is not null))
);

create unique index one_pending_invitation_per_account_email
  on public.account_invitations(account_id, email)
  where status = 'pending';

create table public.invitation_properties (
  invitation_id uuid not null references public.account_invitations(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  primary key (invitation_id, property_id)
);

create trigger touch_account_invitations
  before update on public.account_invitations
  for each row execute procedure public.touch_updated_at();

create or replace function public.current_account_role(target_account_id uuid)
returns public.account_role
language sql stable security definer set search_path = ''
as $$
  select m.role
  from public.account_memberships m
  where m.account_id = target_account_id
    and m.user_id = auth.uid()
    and m.status = 'active'
  limit 1;
$$;

create or replace function public.can_manage_account(target_account_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(public.current_account_role(target_account_id) in ('owner', 'manager'), false);
$$;

create or replace function public.can_write_property(target_property_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.properties p
    join public.account_memberships m
      on m.account_id = p.account_id
     and m.user_id = auth.uid()
     and m.status = 'active'
    where p.id = target_property_id
      and m.role in ('owner', 'producer', 'manager', 'collaborator')
  );
$$;

create or replace function public.shares_account_with_user(target_user_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.account_memberships mine
    join public.account_memberships theirs on theirs.account_id = mine.account_id
    where mine.user_id = auth.uid()
      and mine.status = 'active'
      and theirs.user_id = target_user_id
      and theirs.status = 'active'
  );
$$;

create or replace function public.complete_producer_onboarding(
  account_name text,
  property_name text,
  property_city text,
  property_state text,
  property_area_ha numeric default null
)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  new_account_id uuid;
  new_property_id uuid;
begin
  if actor is null then raise exception 'authentication_required'; end if;
  if exists(select 1 from public.account_memberships where user_id = actor and status = 'active') then
    raise exception 'onboarding_already_completed';
  end if;
  if length(trim(account_name)) < 2 or length(trim(property_name)) < 2 or length(trim(property_city)) < 2 then
    raise exception 'invalid_onboarding_data';
  end if;
  if property_state !~ '^[A-Z]{2}$' then raise exception 'invalid_property_state'; end if;
  if property_area_ha is not null and property_area_ha <= 0 then raise exception 'invalid_property_area'; end if;

  insert into public.accounts(name, owner_user_id)
  values (trim(account_name), actor)
  returning id into new_account_id;

  insert into public.account_memberships(account_id, user_id, role, status)
  values (new_account_id, actor, 'owner', 'active');

  insert into public.properties(account_id, name, city, state, total_area_ha, responsible_user_id)
  values (new_account_id, trim(property_name), trim(property_city), upper(property_state), property_area_ha, actor)
  returning id into new_property_id;

  update public.profiles set last_property_id = new_property_id where id = actor;
  return jsonb_build_object('account_id', new_account_id, 'property_id', new_property_id);
end;
$$;

create or replace function public.create_account_invitation(
  target_account_id uuid,
  target_email text,
  target_role public.account_role,
  target_property_ids uuid[] default '{}'::uuid[]
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  invitation_id uuid;
  normalized_email extensions.citext := lower(trim(target_email));
begin
  if not public.can_manage_account(target_account_id) then raise exception 'permission_denied'; end if;
  if target_role not in ('manager', 'technician') then raise exception 'invalid_invitation_role'; end if;
  if normalized_email::text !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then raise exception 'invalid_email'; end if;
  if target_role = 'technician' and coalesce(array_length(target_property_ids, 1), 0) = 0 then
    raise exception 'technician_requires_property';
  end if;
  if exists (
    select 1 from unnest(target_property_ids) requested(id)
    left join public.properties p on p.id = requested.id and p.account_id = target_account_id
    where p.id is null
  ) then raise exception 'property_outside_account'; end if;

  insert into public.account_invitations(account_id, email, role, invited_by)
  values (target_account_id, normalized_email, target_role, actor)
  returning id into invitation_id;

  if target_role = 'technician' then
    insert into public.invitation_properties(invitation_id, property_id)
    select invitation_id, id from unnest(target_property_ids) requested(id);
  end if;
  return invitation_id;
end;
$$;

create or replace function public.update_account_invitation(
  target_invitation_id uuid,
  target_email text,
  target_role public.account_role,
  target_property_ids uuid[] default '{}'::uuid[]
)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  invitation_account_id uuid;
  normalized_email extensions.citext := lower(trim(target_email));
begin
  select account_id into invitation_account_id from public.account_invitations where id = target_invitation_id and status = 'pending';
  if invitation_account_id is null or not public.can_manage_account(invitation_account_id) then raise exception 'permission_denied'; end if;
  if target_role not in ('manager', 'technician') then raise exception 'invalid_invitation_role'; end if;
  if normalized_email::text !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then raise exception 'invalid_email'; end if;
  if target_role = 'technician' and coalesce(array_length(target_property_ids, 1), 0) = 0 then raise exception 'technician_requires_property'; end if;
  if exists (
    select 1 from unnest(target_property_ids) requested(id)
    left join public.properties p on p.id = requested.id and p.account_id = invitation_account_id
    where p.id is null
  ) then raise exception 'property_outside_account'; end if;

  update public.account_invitations set email = normalized_email, role = target_role where id = target_invitation_id;
  delete from public.invitation_properties where invitation_id = target_invitation_id;
  if target_role = 'technician' then
    insert into public.invitation_properties(invitation_id, property_id)
    select target_invitation_id, id from unnest(target_property_ids) requested(id);
  end if;
end;
$$;

create or replace function public.revoke_account_invitation(target_invitation_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare invitation_account_id uuid;
begin
  select account_id into invitation_account_id from public.account_invitations where id = target_invitation_id and status = 'pending';
  if invitation_account_id is null or not public.can_manage_account(invitation_account_id) then raise exception 'permission_denied'; end if;
  update public.account_invitations
    set status = 'revoked', revoked_by = auth.uid(), revoked_at = now()
    where id = target_invitation_id;
end;
$$;

create or replace function public.accept_pending_invitations()
returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  actor_email extensions.citext;
  invitation record;
  membership_id uuid;
  accepted_count integer := 0;
begin
  select lower(email)::extensions.citext into actor_email
  from auth.users where id = actor and email_confirmed_at is not null;
  if actor is null or actor_email is null then return 0; end if;

  for invitation in
    select * from public.account_invitations where email = actor_email and status = 'pending' order by created_at for update
  loop
    insert into public.account_memberships(account_id, user_id, role, status, invited_by)
    values (invitation.account_id, actor, invitation.role, 'active', invitation.invited_by)
    on conflict (account_id, user_id) do update
      set role = excluded.role, status = 'active', revoked_at = null
    returning id into membership_id;

    if invitation.role = 'technician' then
      insert into public.property_access(property_id, membership_id, granted_by)
      select property_id, membership_id, invitation.invited_by
      from public.invitation_properties where invitation_id = invitation.id
      on conflict do nothing;
    end if;

    update public.account_invitations
      set status = 'accepted', accepted_by = actor, accepted_at = now()
      where id = invitation.id;
    accepted_count := accepted_count + 1;
  end loop;
  return accepted_count;
end;
$$;

create or replace function public.revoke_membership(target_membership_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  target_account_id uuid;
  target_role public.account_role;
  actor_role public.account_role;
begin
  select account_id, role into target_account_id, target_role
  from public.account_memberships where id = target_membership_id and status = 'active';
  actor_role := public.current_account_role(target_account_id);
  if target_account_id is null or actor_role not in ('owner', 'manager') then raise exception 'permission_denied'; end if;
  if target_role = 'owner' then raise exception 'owner_cannot_be_revoked'; end if;
  if actor_role = 'manager' and target_role <> 'technician' then raise exception 'manager_can_only_revoke_technician'; end if;
  update public.account_memberships set status = 'revoked', revoked_at = now() where id = target_membership_id;
end;
$$;

create or replace function public.set_active_property(target_property_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.can_access_property(target_property_id) then raise exception 'permission_denied'; end if;
  update public.profiles set last_property_id = target_property_id where id = auth.uid();
end;
$$;

create or replace function public.get_my_identity_context()
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'profile', jsonb_build_object('id', p.id, 'full_name', p.full_name, 'avatar_url', p.avatar_url, 'last_property_id', p.last_property_id),
    'memberships', coalesce((
      select jsonb_agg(jsonb_build_object('id', m.id, 'account_id', m.account_id, 'account_name', a.name, 'role', m.role))
      from public.account_memberships m join public.accounts a on a.id = m.account_id
      where m.user_id = auth.uid() and m.status = 'active'
    ), '[]'::jsonb),
    'properties', coalesce((
      select jsonb_agg(jsonb_build_object('id', pr.id, 'account_id', pr.account_id, 'name', pr.name, 'city', pr.city, 'state', pr.state, 'total_area_ha', pr.total_area_ha) order by pr.name)
      from public.properties pr
      where public.can_access_property(pr.id) and pr.active
    ), '[]'::jsonb)
  )
  from public.profiles p where p.id = auth.uid();
$$;

alter table public.account_invitations enable row level security;
alter table public.invitation_properties enable row level security;

create policy "account managers read invitations" on public.account_invitations
  for select using (public.can_manage_account(account_id));
create policy "account managers read invitation properties" on public.invitation_properties
  for select using (exists(select 1 from public.account_invitations i where i.id = invitation_id and public.can_manage_account(i.account_id)));
create policy "members read shared profiles" on public.profiles
  for select using (public.shares_account_with_user(id));

drop policy if exists "record property write" on public.operational_records;
create policy "authorized users insert records" on public.operational_records
  for insert with check (public.can_write_property(property_id) and created_by = auth.uid());
create policy "authorized users update own records" on public.operational_records
  for update using (public.can_write_property(property_id) and created_by = auth.uid())
  with check (public.can_write_property(property_id) and created_by = auth.uid());
create policy "authorized users soft delete own records" on public.operational_records
  for delete using (public.can_write_property(property_id) and created_by = auth.uid());

grant execute on function public.complete_producer_onboarding(text, text, text, text, numeric) to authenticated;
grant execute on function public.create_account_invitation(uuid, text, public.account_role, uuid[]) to authenticated;
grant execute on function public.update_account_invitation(uuid, text, public.account_role, uuid[]) to authenticated;
grant execute on function public.revoke_account_invitation(uuid) to authenticated;
grant execute on function public.accept_pending_invitations() to authenticated;
grant execute on function public.revoke_membership(uuid) to authenticated;
grant execute on function public.set_active_property(uuid) to authenticated;
grant execute on function public.get_my_identity_context() to authenticated;
