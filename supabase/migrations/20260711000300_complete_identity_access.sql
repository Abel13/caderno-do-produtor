alter table public.profiles
  add column timezone text not null default 'America/Sao_Paulo',
  add column measurement_system text not null default 'metric' check (measurement_system = 'metric'),
  add column internal_notifications_enabled boolean not null default true;

create or replace function public.can_manage_role(target_account_id uuid, target_role public.account_role)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select case public.current_account_role(target_account_id)
    when 'owner' then target_role in ('manager', 'technician')
    when 'manager' then target_role = 'technician'
    else false
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
  if not public.can_manage_role(target_account_id, target_role) then raise exception 'permission_denied'; end if;
  if normalized_email::text !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then raise exception 'invalid_email'; end if;
  if target_role = 'technician' and coalesce(array_length(target_property_ids, 1), 0) = 0 then
    raise exception 'technician_requires_property';
  end if;
  if target_role = 'manager' and coalesce(array_length(target_property_ids, 1), 0) > 0 then
    raise exception 'manager_has_account_access';
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

  insert into public.audit_log(account_id, table_name, record_id, action, new_data, actor_user_id)
  values (target_account_id, 'account_invitations', invitation_id, 'insert',
    jsonb_build_object('role', target_role, 'status', 'pending', 'property_ids', target_property_ids), actor);
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
  invitation public.account_invitations%rowtype;
  old_property_ids uuid[];
  normalized_email extensions.citext := lower(trim(target_email));
begin
  select * into invitation from public.account_invitations where id = target_invitation_id and status = 'pending' for update;
  if invitation.id is null then raise exception 'invitation_not_found'; end if;
  if not public.can_manage_role(invitation.account_id, invitation.role)
    or not public.can_manage_role(invitation.account_id, target_role) then raise exception 'permission_denied'; end if;
  if normalized_email::text !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then raise exception 'invalid_email'; end if;
  if target_role = 'technician' and coalesce(array_length(target_property_ids, 1), 0) = 0 then raise exception 'technician_requires_property'; end if;
  if target_role = 'manager' and coalesce(array_length(target_property_ids, 1), 0) > 0 then raise exception 'manager_has_account_access'; end if;
  if exists (
    select 1 from unnest(target_property_ids) requested(id)
    left join public.properties p on p.id = requested.id and p.account_id = invitation.account_id
    where p.id is null
  ) then raise exception 'property_outside_account'; end if;

  select coalesce(array_agg(property_id order by property_id), '{}'::uuid[]) into old_property_ids
  from public.invitation_properties where invitation_id = target_invitation_id;
  update public.account_invitations set email = normalized_email, role = target_role where id = target_invitation_id;
  delete from public.invitation_properties where invitation_id = target_invitation_id;
  if target_role = 'technician' then
    insert into public.invitation_properties(invitation_id, property_id)
    select target_invitation_id, id from unnest(target_property_ids) requested(id);
  end if;

  insert into public.audit_log(account_id, table_name, record_id, action, old_data, new_data, actor_user_id)
  values (invitation.account_id, 'account_invitations', target_invitation_id, 'update',
    jsonb_build_object('role', invitation.role, 'status', invitation.status, 'property_ids', old_property_ids),
    jsonb_build_object('role', target_role, 'status', 'pending', 'property_ids', target_property_ids), auth.uid());
end;
$$;

create or replace function public.revoke_account_invitation(target_invitation_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare invitation public.account_invitations%rowtype;
begin
  select * into invitation from public.account_invitations where id = target_invitation_id and status = 'pending' for update;
  if invitation.id is null then raise exception 'invitation_not_found'; end if;
  if not public.can_manage_role(invitation.account_id, invitation.role) then raise exception 'permission_denied'; end if;
  update public.account_invitations
    set status = 'revoked', revoked_by = auth.uid(), revoked_at = now()
    where id = target_invitation_id;
  insert into public.audit_log(account_id, table_name, record_id, action, old_data, new_data, actor_user_id)
  values (invitation.account_id, 'account_invitations', target_invitation_id, 'update',
    jsonb_build_object('role', invitation.role, 'status', 'pending'),
    jsonb_build_object('role', invitation.role, 'status', 'revoked'), auth.uid());
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
  accepted_membership_id uuid;
  previous_membership record;
  accepted_count integer := 0;
begin
  select lower(email)::extensions.citext into actor_email
  from auth.users where id = actor and email_confirmed_at is not null;
  if actor is null or actor_email is null then return 0; end if;

  for invitation in
    select * from public.account_invitations
    where email = actor_email and status = 'pending' and role in ('manager', 'technician')
    order by created_at for update
  loop
    select id, role, status into previous_membership
    from public.account_memberships where account_id = invitation.account_id and user_id = actor;
    insert into public.account_memberships(account_id, user_id, role, status, invited_by)
    values (invitation.account_id, actor, invitation.role, 'active', invitation.invited_by)
    on conflict (account_id, user_id) do update
      set role = excluded.role, status = 'active', revoked_at = null, invited_by = excluded.invited_by
    returning id into accepted_membership_id;

    delete from public.property_access where membership_id = accepted_membership_id;
    if invitation.role = 'technician' then
      insert into public.property_access(property_id, membership_id, granted_by)
      select property_id, accepted_membership_id, invitation.invited_by
      from public.invitation_properties where invitation_id = invitation.id
      on conflict do nothing;
    end if;

    update public.account_invitations set status = 'accepted', accepted_by = actor, accepted_at = now() where id = invitation.id;
    insert into public.audit_log(account_id, table_name, record_id, action, old_data, new_data, actor_user_id)
    values (invitation.account_id, 'account_invitations', invitation.id, 'update',
      jsonb_build_object('role', invitation.role, 'status', 'pending'),
      jsonb_build_object('role', invitation.role, 'status', 'accepted'), actor);
    insert into public.audit_log(account_id, table_name, record_id, action, old_data, new_data, actor_user_id)
    values (invitation.account_id, 'account_memberships', accepted_membership_id,
      case when previous_membership.id is null then 'insert' else 'update' end,
      case when previous_membership.id is null then null else jsonb_build_object('role', previous_membership.role, 'status', previous_membership.status) end,
      jsonb_build_object('role', invitation.role, 'status', 'active'), actor);
    accepted_count := accepted_count + 1;
  end loop;
  return accepted_count;
end;
$$;

create or replace function public.revoke_membership(target_membership_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare membership public.account_memberships%rowtype;
begin
  select * into membership from public.account_memberships where id = target_membership_id and status = 'active' for update;
  if membership.id is null then raise exception 'membership_not_found'; end if;
  if membership.role = 'owner' then raise exception 'owner_cannot_be_revoked'; end if;
  if not public.can_manage_role(membership.account_id, membership.role) then raise exception 'permission_denied'; end if;
  update public.account_memberships set status = 'revoked', revoked_at = now() where id = target_membership_id;
  delete from public.property_access where membership_id = target_membership_id;
  insert into public.audit_log(account_id, table_name, record_id, action, old_data, new_data, actor_user_id)
  values (membership.account_id, 'account_memberships', membership.id, 'update',
    jsonb_build_object('role', membership.role, 'status', 'active'),
    jsonb_build_object('role', membership.role, 'status', 'revoked'), auth.uid());
end;
$$;

create or replace function public.update_my_profile(
  target_full_name text,
  target_timezone text,
  target_internal_notifications_enabled boolean
)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  if length(trim(target_full_name)) not between 2 and 120 then raise exception 'invalid_profile_name'; end if;
  if target_timezone not in ('America/Sao_Paulo', 'America/Manaus', 'America/Cuiaba', 'America/Rio_Branco', 'America/Noronha') then
    raise exception 'invalid_timezone';
  end if;
  update public.profiles set full_name = trim(target_full_name), timezone = target_timezone,
    internal_notifications_enabled = target_internal_notifications_enabled where id = auth.uid();
end;
$$;

create or replace function public.get_my_identity_context()
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'profile', jsonb_build_object(
      'id', p.id, 'full_name', p.full_name, 'avatar_url', p.avatar_url, 'last_property_id', p.last_property_id,
      'timezone', p.timezone, 'measurement_system', p.measurement_system,
      'internal_notifications_enabled', p.internal_notifications_enabled
    ),
    'memberships', coalesce((
      select jsonb_agg(jsonb_build_object('id', m.id, 'account_id', m.account_id, 'account_name', a.name, 'role', m.role))
      from public.account_memberships m join public.accounts a on a.id = m.account_id
      where m.user_id = auth.uid() and m.status = 'active' and m.role in ('owner', 'manager', 'technician')
    ), '[]'::jsonb),
    'properties', coalesce((
      select jsonb_agg(jsonb_build_object('id', pr.id, 'account_id', pr.account_id, 'name', pr.name, 'city', pr.city, 'state', pr.state, 'total_area_ha', pr.total_area_ha) order by pr.name)
      from public.properties pr where public.can_access_property(pr.id) and pr.active
    ), '[]'::jsonb)
  ) from public.profiles p where p.id = auth.uid();
$$;

drop policy if exists "audit account read" on public.audit_log;
create policy "account managers read audit" on public.audit_log for select
  using (public.current_account_role(account_id) in ('owner', 'manager'));

grant execute on function public.can_manage_role(uuid, public.account_role) to authenticated;
grant execute on function public.update_my_profile(text, text, boolean) to authenticated;
