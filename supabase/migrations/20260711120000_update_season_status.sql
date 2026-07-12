create or replace function public.update_season_status(target_season_id uuid, target_status public.season_status, target_reason text)
returns void language plpgsql security definer set search_path='' as $$
declare
  season_record public.harvest_seasons%rowtype;
  actor_role public.account_role;
  target_account_id uuid;
begin
  select * into season_record from public.harvest_seasons where id = target_season_id for update;
  if season_record.id is null then
    raise exception 'season_not_found';
  end if;

  if not public.can_write_property(season_record.property_id) then
    raise exception 'permission_denied';
  end if;

  select account_id into target_account_id from public.properties where id = season_record.property_id;
  select public.current_account_role(target_account_id) into actor_role;
  if actor_role is null then
    raise exception 'permission_denied';
  end if;

  if season_record.status = target_status then
    raise exception 'invalid_season_transition';
  end if;

  if season_record.status = 'planning' and target_status not in ('open', 'closed') then
    raise exception 'invalid_season_transition';
  end if;

  if season_record.status = 'open' and target_status not in ('closed') then
    raise exception 'invalid_season_transition';
  end if;

  if season_record.status = 'closed' and target_status not in ('open') then
    raise exception 'invalid_season_transition';
  end if;

  if target_status = 'open' and season_record.status = 'closed' then
    if actor_role <> 'owner' then
      raise exception 'season_reopen_requires_owner';
    end if;

    if target_reason is null or btrim(target_reason) = '' then
      raise exception 'season_reopen_requires_reason';
    end if;
  end if;

  update public.harvest_seasons
    set status = target_status
    where id = target_season_id;

  perform public.audit_structure(
    target_account_id,
    'harvest_seasons',
    target_season_id,
    'update',
    jsonb_build_object('status', season_record.status),
    jsonb_build_object('status', target_status, 'reopen_reason', nullif(btrim(target_reason), ''))
  );
end;
$$;

grant execute on function public.update_season_status(uuid,public.season_status,text) to authenticated;
