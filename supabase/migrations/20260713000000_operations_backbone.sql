create type if not exists public.operation_origin as enum ('manual', 'pdf', 'import', 'integration', 'system');

create table if not exists public.operation_types (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (btrim(code) <> ''),
  label text not null check (btrim(label) <> ''),
  description text,
  default_unit text check (default_unit is null or btrim(default_unit) <> ''),
  category text not null default 'operational',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.operation_types
  add constraint if not exists operation_types_code_format_chk check (code ~ '^[a-z_][a-z0-9_]*$');

create or replace function public.touch_operation_types()
returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists touch_operation_types on public.operation_types;
create trigger touch_operation_types
before update on public.operation_types
for each row execute procedure public.touch_operation_types();

create table if not exists public.operation_record_attachments (
  id uuid primary key default gen_random_uuid(),
  operational_record_id uuid not null references public.operational_records(id) on delete cascade,
  attachment_type text not null check (btrim(attachment_type) <> ''),
  filename text not null check (btrim(filename) <> ''),
  storage_path text not null check (btrim(storage_path) <> ''),
  mime_type text not null check (btrim(mime_type) <> ''),
  size_bytes bigint not null check (size_bytes > 0),
  uploader_id uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists operation_record_attachments_record_idx
  on public.operation_record_attachments (operational_record_id)
  where deleted_at is null;

create table if not exists public.operation_external_entities (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('supplier', 'buyer', 'laboratory', 'service_provider')),
  name text not null check (btrim(name) <> ''),
  category text,
  created_at timestamptz not null default now(),
  active boolean not null default true
);

create unique index if not exists operation_external_entities_name_type_idx
  on public.operation_external_entities (entity_type, btrim(name))
  where active;

alter table public.operational_records
  add column if not exists client_id uuid not null default gen_random_uuid(),
  add column if not exists deleted_by uuid references public.profiles(id) on delete set null;

alter table public.operational_records
  add constraint if not exists operational_records_client_scope_uniq unique (property_id, client_id);

alter table public.operational_records
  alter column record_type set not null;

alter table public.operational_records
  alter column origin set default 'manual'::public.operation_origin;

alter table public.operational_records
  alter column origin type public.operation_origin using (origin::public.operation_origin);

do $$ begin
  if not exists (
    select 1
    from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'operational_records'
      and constraint_name = 'operational_records_record_type_fkey'
  ) then
    alter table public.operational_records
      add constraint operational_records_record_type_fkey
      foreign key (record_type) references public.operation_types(code)
      on update cascade
      on delete restrict;
  end if;
end $$;

create or replace function public.can_manage_operational_records(target_property_id uuid)
returns boolean
language sql stable security definer set search_path = '' as $$
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

create or replace function public.resolve_operational_record_account_id(target_property_id uuid)
returns uuid
language sql stable security definer set search_path = '' as $$
  select account_id from public.properties where id = target_property_id;
$$;

create or replace function public.extract_operational_record_id_from_path(storage_name text)
returns uuid
language plpgsql stable as $$
begin
  if storage_name is null then
    return null;
  end if;
  return split_part(storage_name, '/', 2)::uuid;
exception
  when invalid_text_representation then
    return null;
end;
$$;

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
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  target_account_id uuid;
  existing_record public.operational_records%rowtype;
  chosen_client_id uuid := coalesce(target_client_id, gen_random_uuid());
  season_property_id uuid;
  season_status public.season_status;
  record_id uuid;
  record_payload jsonb := coalesce(target_payload, '{}'::jsonb);
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
    select property_id, status into season_property_id, season_status
    from public.harvest_seasons where id = target_season_id;
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

  select * into existing_record
  from public.operational_records
  where property_id = target_property_id and client_id = chosen_client_id
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
          payload = record_payload,
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
      jsonb_build_object('client_id', chosen_client_id, 'restored', false)
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
    record_payload,
    target_notes,
    coalesce(target_responsible_user_id, actor),
    actor,
    chosen_client_id
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
language plpgsql security definer set search_path = '' as $$
declare
  current_record public.operational_records%rowtype;
  record_account_id uuid;
  season_status public.season_status;
  final_status public.record_status;
  final_type text := nullif(btrim(target_record_type), '');
  final_payload jsonb := coalesce(target_payload, '{}'::jsonb);
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
    jsonb_build_object('status', final_status)
  );
end;
$$;

create or replace function public.change_operational_record_status(
  target_record_id uuid,
  target_status public.record_status,
  target_notes text default null
) returns void
language plpgsql security definer set search_path = '' as $$
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
language plpgsql security definer set search_path = '' as $$
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
language plpgsql security definer set search_path = '' as $$
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

alter table public.operation_types enable row level security;
alter table public.operation_record_attachments enable row level security;
alter table public.operation_external_entities enable row level security;

create policy if not exists "operation types read" on public.operation_types
  for select using (true);

create policy if not exists "operation records read" on public.operational_records
  for select using (public.can_access_property(property_id));

create policy if not exists "operation records insert via rpc" on public.operational_records
  for insert with check (false);

create policy if not exists "operation records update via rpc" on public.operational_records
  for update using (public.can_manage_operational_records(property_id))
  with check (public.can_manage_operational_records(property_id));

create policy if not exists "operation records delete via rpc" on public.operational_records
  for delete using (public.can_manage_operational_records(property_id))
  with check (public.can_manage_operational_records(property_id));

create policy if not exists "operation attachments read" on public.operation_record_attachments
  for select using (
    exists (
      select 1
      from public.operational_records op
      where op.id = operational_record_id
        and public.can_access_property(op.property_id)
    )
  );

create policy if not exists "operation attachments write" on public.operation_record_attachments
  for insert with check (
    exists (
      select 1
      from public.operational_records op
      where op.id = operational_record_id
        and public.can_manage_operational_records(op.property_id)
    )
  );

create policy if not exists "operation attachments update/delete" on public.operation_record_attachments
  for update using (
    exists (
      select 1
      from public.operational_records op
      where op.id = operational_record_id
        and public.can_manage_operational_records(op.property_id)
    )
  )
  with check (
    exists (
      select 1
      from public.operational_records op
      where op.id = operational_record_id
        and public.can_manage_operational_records(op.property_id)
    )
  );

create policy if not exists "operation attachments delete" on public.operation_record_attachments
  for delete using (
    exists (
      select 1
      from public.operational_records op
      where op.id = operational_record_id
        and public.can_manage_operational_records(op.property_id)
    )
  );

create policy if not exists "operation external entities read" on public.operation_external_entities
  for select using (active = true);

create policy if not exists "operation external entities write blocked" on public.operation_external_entities
  for all with check (false);

create or replace function public.can_upload_operational_attachment(storage_record_name text)
returns boolean
language sql stable as $$
  select exists (
    select 1
    from public.operational_records op
    where op.id = public.extract_operational_record_id_from_path(storage_record_name)
      and public.can_manage_operational_records(op.property_id)
  );
$$;

insert into public.operation_types (code, label, description, default_unit, category)
values
  ('chuva', 'Chuva', 'Registro de precipitação', 'mm', 'agua'),
  ('irrigacao', 'Irrigação', 'Registro de aplicação de água', 'mm', 'agua'),
  ('fertilizacao', 'Fertilização', 'Registro de adubação e corretivo', 'kg', 'solo'),
  ('aplicacao', 'Aplicação', 'Registro de aplicação de insumo ou manejo', 'un', 'operacao'),
  ('monitoramento', 'Monitoramento', 'Observações e inspeções no campo', null, 'monitoramento')
on conflict (code)
do update
set
  label = excluded.label,
  description = excluded.description,
  default_unit = excluded.default_unit,
  category = excluded.category,
  updated_at = now();

create policy if not exists "storage private operational records read" on storage.objects
  for select using (
    bucket_id = 'private-documents'
    and public.can_access_property(
      (select property_id from public.operational_records where id = public.extract_operational_record_id_from_path(name))
    )
  );

create policy if not exists "storage private operational records write" on storage.objects
  for insert with check (
    bucket_id = 'private-documents'
    and public.can_upload_operational_attachment(name)
  );

create policy if not exists "storage private operational records write owner" on storage.objects
  for delete using (
    bucket_id = 'private-documents'
    and public.can_upload_operational_attachment(name)
  );
