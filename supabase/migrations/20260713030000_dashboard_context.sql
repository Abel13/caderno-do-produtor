create or replace function public.set_active_season(target_season_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_property_id uuid;
begin
  if auth.uid() is null then
    raise exception 'authentication_required';
  end if;

  if target_season_id is null then
    update public.profiles set last_season_id = null where id = auth.uid();
    return;
  end if;

  select property_id into target_property_id
  from public.harvest_seasons
  where id = target_season_id;

  if target_property_id is null then
    raise exception 'season_not_found';
  end if;

  if not public.can_access_property(target_property_id) then
    raise exception 'permission_denied';
  end if;

  update public.profiles
    set last_season_id = target_season_id
    where id = auth.uid();
end;
$$;

grant execute on function public.set_active_season(uuid) to authenticated;

create or replace function public.get_my_identity_context()
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'profile', jsonb_build_object(
      'id', p.id,
      'full_name', p.full_name,
      'avatar_url', p.avatar_url,
      'last_property_id', p.last_property_id,
      'last_season_id', p.last_season_id,
      'timezone', p.timezone,
      'measurement_system', p.measurement_system,
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

grant execute on function public.get_my_identity_context() to authenticated;
