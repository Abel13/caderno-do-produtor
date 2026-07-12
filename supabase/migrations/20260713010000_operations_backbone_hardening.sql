create or replace function public.can_manage_operational_records(target_property_id uuid)
returns boolean
language sql
stable security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.properties p
    join public.account_memberships m
      on m.account_id = p.account_id
     and m.user_id = auth.uid()
     and m.status = 'active'
    where p.id = target_property_id
      and m.role in ('owner', 'manager')
  );
$$;

create or replace function public.extract_operational_record_id_from_path(storage_name text)
returns uuid
language sql
stable
as $$
  select nullif((regexp_match(storage_name, '([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})'))[1], '')::uuid;
$$;

alter table public.operational_records
  alter column client_id drop not null,
  alter column client_id drop default;

alter table public.operational_records
  drop constraint if exists operational_records_client_scope_uniq;
create unique index if not exists operational_records_property_client_uq
  on public.operational_records (property_id, client_id)
  where client_id is not null;

create or replace function public.create_operational_record(
  target_property_id uuid,
  target_record_type text,
  target_occurred_at timestamptz,
  target_plot_id uuid default null,
  target_planting_id uuid default null,
  target_season_id uuid default null,
  target_payload jsonb default '{}'::jsonb,
  target_notes text default null,
  target_status public.record_status default 'draft',
  target_origin public.operation_origin default 'manual',
  target_responsible_user_id uuid default null,
  target_client_id uuid default null
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  target_account_id uuid;
  existing_record public.operational_records%rowtype;
  selected_client_id uuid := target_client_id;
  season_property_id uuid;
  season_status public.season_status;
  record_id uuid;
  valid_payload jsonb := coalesce(target_payload, '{}'::jsonb);
begin
  if actor is null then
    raise exception 'authentication_required';
  end if;
  if target_property_id is null then
    raise exception 'record_property_required';
  end if;
  if target_record_type is null or btrim(target_record_type) = '' then
    raise exception 'record_type_required';
  end if;
  if target_occurred_at is null then
    raise exception 'occurred_at_required';
  end if;
  if target_occurred_at > now() + interval '1 day' then
    raise exception 'occurred_at_invalid';
  end if;
  if not public.can_manage_operational_records(target_property_id) then
    raise exception 'permission_denied';
  end if;

  if target_plot_id is not null then
    if not exists (select 1 from public.plots where id = target_plot_id and property_id = target_property_id) then
      raise exception 'record_context_mismatch';
    end if;
  end if;

  if target_planting_id is not null then
    if not exists (
      select 1
      from public.plantings p
      join public.plots pl on pl.id = p.plot_id
      where p.id = target_planting_id and pl.property_id = target_property_id
    ) then
      raise exception 'record_context_mismatch';
    end if;
  end if;

  if target_season_id is not null then
    select property_id, status
    into season_property_id, season_status
    from public.harvest_seasons
    where id = target_season_id;

    if season_property_id is null then
      raise exception 'season_not_found';
    end if;
    if season_property_id <> target_property_id then
      raise exception 'record_context_mismatch';
    end if;
    if season_status = 'closed' then
      raise exception 'season_closed_record';
    end if;
  end if;

  if selected_client_id is null then
    selected_client_id := gen_random_uuid();
  end if;

  select * into existing_record
  from public.operational_records
  where property_id = target_property_id and client_id = selected_client_id
  for update;

  if existing_record.id is not null then
    update public.operational_records
      set occurred_at = target_occurred_at,
          record_type = target_record_type,
          plot_id = target_plot_id,
          planting_id = target_planting_id,
          season_id = target_season_id,
          status = target_status,
          origin = target_origin,
          payload = valid_payload,
          notes = target_notes,
          responsible_user_id = coalesce(target_responsible_user_id, actor),
          deleted_at = null,
          deleted_by = null,
          updated_at = now(),
          version = existing_record.version + 1
      where id = existing_record.id
      returning id into record_id;

    target_account_id := public.resolve_operational_record_account_id(target_property_id);
    perform public.audit_structure(
      target_account_id,
      'operational_records',
      record_id,
      'update',
      to_jsonb(existing_record),
      jsonb_build_object('client_id', selected_client_id, 'status', target_status)
    );
    return record_id;
  end if;

  insert into public.operational_records(
    property_id,
    plot_id,
    planting_id,
    season_id,
    record_type,
    occurred_at,
    status,
    origin,
    payload,
    notes,
    responsible_user_id,
    created_by,
    client_id
  )
  values (
    target_property_id,
    target_plot_id,
    target_planting_id,
    target_season_id,
    target_record_type,
    target_occurred_at,
    target_status,
    target_origin,
    valid_payload,
    target_notes,
    coalesce(target_responsible_user_id, actor),
    actor,
    selected_client_id
  )
  returning id into record_id;

  target_account_id := public.resolve_operational_record_account_id(target_property_id);
  perform public.audit_structure(
    target_account_id,
    'operational_records',
    record_id,
    'insert',
    null,
    jsonb_build_object('record_type', target_record_type, 'occurred_at', target_occurred_at, 'status', target_status)
  );
  return record_id;
end;
$$;

create or replace function public.update_operational_record(
  target_record_id uuid,
  target_record_type text,
  target_occurred_at timestamptz,
  target_plot_id uuid default null,
  target_planting_id uuid default null,
  target_season_id uuid default null,
  target_payload jsonb default null,
  target_notes text default null,
  target_status public.record_status default null,
  target_responsible_user_id uuid default null
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_record public.operational_records%rowtype;
  record_account_id uuid;
  season_status public.season_status;
  final_status public.record_status;
  final_type text := nullif(btrim(target_record_type), '');
  final_payload jsonb;
begin
  select * into current_record from public.operational_records where id = target_record_id for update;
  if current_record.id is null then
    raise exception 'operational_record_not_found';
  end if;
  if current_record.deleted_at is not null then
    raise exception 'operational_record_deleted';
  end if;
  if not public.can_manage_operational_records(current_record.property_id) then
    raise exception 'permission_denied';
  end if;
  if current_record.season_id is not null then
    select status into season_status from public.harvest_seasons where id = current_record.season_id;
    if season_status = 'closed' then
      raise exception 'season_closed_record';
    end if;
  end if;
  if target_occurred_at is null then
    raise exception 'occurred_at_required';
  end if;
  if target_occurred_at > now() + interval '1 day' then
    raise exception 'occurred_at_invalid';
  end if;

  final_status := coalesce(target_status, current_record.status);
  final_payload := coalesce(target_payload, current_record.payload);

  if target_plot_id is not null and not exists (
    select 1 from public.plots where id = target_plot_id and property_id = current_record.property_id
  ) then
    raise exception 'record_context_mismatch';
  end if;
  if target_planting_id is not null and not exists (
    select 1 from public.plantings p
    join public.plots pl on pl.id = p.plot_id
    where p.id = target_planting_id and pl.property_id = current_record.property_id
  ) then
    raise exception 'record_context_mismatch';
  end if;
  if target_season_id is not null then
    select status into season_status from public.harvest_seasons where id = target_season_id;
    if season_status is null then
      raise exception 'season_not_found';
    end if;
    if season_status = 'closed' then
      raise exception 'season_closed_record';
    end if;
  end if;
  if target_record_type is not null and btrim(target_record_type) = '' then
    raise exception 'record_type_required';
  end if;

  update public.operational_records
    set occurred_at = target_occurred_at,
        record_type = coalesce(final_type, current_record.record_type),
        plot_id = target_plot_id,
        planting_id = target_planting_id,
        season_id = coalesce(target_season_id, current_record.season_id),
        status = final_status,
        payload = final_payload,
        notes = coalesce(target_notes, current_record.notes),
        responsible_user_id = coalesce(target_responsible_user_id, current_record.responsible_user_id),
        updated_at = now(),
        version = current_record.version + 1
    where id = target_record_id;

  record_account_id := public.resolve_operational_record_account_id(current_record.property_id);
  perform public.audit_structure(
    record_account_id,
    'operational_records',
    target_record_id,
    'update',
    to_jsonb(current_record),
    jsonb_build_object(
      'status', final_status,
      'record_type', coalesce(final_type, current_record.record_type),
      'occurred_at', target_occurred_at
    )
  );
end;
$$;

create or replace function public.change_operational_record_status(
  target_record_id uuid,
  target_status public.record_status,
  target_notes text default null
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_record public.operational_records%rowtype;
  season_status public.season_status;
  record_account_id uuid;
begin
  select * into current_record from public.operational_records where id = target_record_id for update;
  if current_record.id is null or current_record.deleted_at is not null then
    raise exception 'operational_record_not_found';
  end if;
  if not public.can_manage_operational_records(current_record.property_id) then
    raise exception 'permission_denied';
  end if;
  if current_record.season_id is not null then
    select status into season_status from public.harvest_seasons where id = current_record.season_id;
    if season_status = 'closed' then
      raise exception 'season_closed_record';
    end if;
  end if;

  update public.operational_records
    set status = target_status,
        notes = coalesce(target_notes, current_record.notes),
        updated_at = now(),
        version = current_record.version + 1
    where id = target_record_id;

  record_account_id := public.resolve_operational_record_account_id(current_record.property_id);
  perform public.audit_structure(
    record_account_id,
    'operational_records',
    target_record_id,
    'update',
    jsonb_build_object('status', current_record.status),
    jsonb_build_object('status', target_status)
  );
end;
$$;

create or replace function public.delete_operational_record(target_record_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_record public.operational_records%rowtype;
  season_status public.season_status;
  record_account_id uuid;
begin
  select * into current_record from public.operational_records where id = target_record_id for update;
  if current_record.id is null then
    raise exception 'operational_record_not_found';
  end if;
  if current_record.deleted_at is not null then
    return;
  end if;
  if not public.can_manage_operational_records(current_record.property_id) then
    raise exception 'permission_denied';
  end if;
  if current_record.season_id is not null then
    select status into season_status from public.harvest_seasons where id = current_record.season_id;
    if season_status = 'closed' then
      raise exception 'season_closed_record';
    end if;
  end if;

  update public.operational_records
    set deleted_at = now(),
        deleted_by = auth.uid(),
        updated_at = now(),
        version = current_record.version + 1
    where id = target_record_id;

  record_account_id := public.resolve_operational_record_account_id(current_record.property_id);
  perform public.audit_structure(
    record_account_id,
    'operational_records',
    target_record_id,
    'delete',
    null,
    jsonb_build_object('deleted_at', now())
  );
end;
$$;

create or replace function public.restore_operational_record(target_record_id uuid, target_notes text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_record public.operational_records%rowtype;
  season_status public.season_status;
  record_account_id uuid;
begin
  select * into current_record from public.operational_records where id = target_record_id for update;
  if current_record.id is null then
    raise exception 'operational_record_not_found';
  end if;
  if current_record.deleted_at is null then
    raise exception 'operational_record_not_deleted';
  end if;
  if not public.can_manage_operational_records(current_record.property_id) then
    raise exception 'permission_denied';
  end if;
  if current_record.season_id is not null then
    select status into season_status from public.harvest_seasons where id = current_record.season_id;
    if season_status = 'closed' then
      raise exception 'season_closed_record';
    end if;
  end if;

  update public.operational_records
    set deleted_at = null,
        deleted_by = null,
        notes = coalesce(target_notes, current_record.notes),
        updated_at = now(),
        version = current_record.version + 1
    where id = target_record_id;

  record_account_id := public.resolve_operational_record_account_id(current_record.property_id);
  perform public.audit_structure(
    record_account_id,
    'operational_records',
    target_record_id,
    'restore',
    jsonb_build_object('deleted_at', current_record.deleted_at),
    jsonb_build_object('deleted_at', null)
  );
end;
$$;

grant execute on function public.create_operational_record(
  uuid, text, timestamptz, uuid, uuid, uuid, jsonb, text, public.record_status, public.operation_origin, uuid, uuid
) to authenticated;
grant execute on function public.update_operational_record(
  uuid, text, timestamptz, uuid, uuid, uuid, jsonb, text, public.record_status, uuid
) to authenticated;
grant execute on function public.change_operational_record_status(
  uuid, public.record_status, text
) to authenticated;
grant execute on function public.delete_operational_record(uuid) to authenticated;
grant execute on function public.restore_operational_record(uuid, text) to authenticated;

drop policy if exists "operation records insert via rpc" on public.operational_records;
drop policy if exists "operation records update via rpc" on public.operational_records;
drop policy if exists "operation records delete via rpc" on public.operational_records;
drop policy if exists "authorized users insert records" on public.operational_records;
drop policy if exists "authorized users update own records" on public.operational_records;
drop policy if exists "authorized users soft delete own records" on public.operational_records;

alter table public.operational_records enable row level security;
drop policy if exists "operation records read" on public.operational_records;
create policy "operation records read" on public.operational_records
  for select using (public.can_access_property(property_id));

drop policy if exists "operation records insert" on public.operational_records;
create policy "operation records insert" on public.operational_records
  for insert with check (false);

drop policy if exists "operation records update" on public.operational_records;
create policy "operation records update" on public.operational_records
  for update using (false)
  with check (false);

drop policy if exists "operation records delete" on public.operational_records;
create policy "operation records delete" on public.operational_records
  for delete using (false)
  with check (false);

create or replace function public.can_upload_operational_attachment(storage_record_name text)
returns boolean
language sql stable
as $$
  select exists (
    select 1
    from public.operational_records op
    where op.id = public.extract_operational_record_id_from_path(storage_record_name)
      and public.can_manage_operational_records(op.property_id)
  );
$$;

drop policy if exists "storage private operational records read" on storage.objects;
create policy "storage private operational records read" on storage.objects
  for select using (
    bucket_id = 'private-documents'
    and public.can_access_property(
      (select property_id from public.operational_records where id = public.extract_operational_record_id_from_path(name))
    )
  );
drop policy if exists "storage private operational records write" on storage.objects;
create policy "storage private operational records write" on storage.objects
  for insert with check (
    bucket_id = 'private-documents'
    and public.can_upload_operational_attachment(name)
  );
drop policy if exists "storage private operational records delete" on storage.objects;
create policy "storage private operational records delete" on storage.objects
  for delete using (
    bucket_id = 'private-documents'
    and public.can_upload_operational_attachment(name)
  );
