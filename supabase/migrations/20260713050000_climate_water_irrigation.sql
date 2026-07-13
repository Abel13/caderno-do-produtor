create table if not exists public.irrigation_systems (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  plot_id uuid references public.plots(id) on delete set null,
  name text not null check (length(trim(name)) between 1 and 80),
  system_type text,
  water_source text,
  emitters_description text,
  efficiency_pct numeric(5,2) check (efficiency_pct is null or efficiency_pct between 0 and 100),
  wetted_area_m2 numeric(12,2) check (wetted_area_m2 is null or wetted_area_m2 >= 0),
  flow_lh numeric(12,2) check (flow_lh is null or flow_lh >= 0),
  motor_description text,
  pump_description text,
  pressure_bar numeric(8,2) check (pressure_bar is null or pressure_bar >= 0),
  spacing_description text,
  notes text,
  active boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (property_id, name)
);

create table if not exists public.irrigation_events (
  id uuid primary key default gen_random_uuid(),
  operational_record_id uuid not null unique references public.operational_records(id) on delete restrict,
  property_id uuid not null references public.properties(id) on delete restrict,
  irrigation_system_id uuid references public.irrigation_systems(id) on delete restrict,
  plot_id uuid references public.plots(id) on delete restrict,
  season_id uuid references public.harvest_seasons(id) on delete restrict,
  occurred_on date not null,
  occurred_at timestamptz not null,
  started_at time,
  ended_at time,
  duration_minutes integer check (duration_minutes is null or duration_minutes > 0),
  applied_mm numeric(10,2) check (applied_mm is null or applied_mm >= 0),
  frequency_days integer check (frequency_days is null or frequency_days > 0),
  average_volume_l numeric(14,2) check (average_volume_l is null or average_volume_l >= 0),
  responsible_name text,
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (started_at is null or ended_at is null or ended_at >= started_at)
);

create index if not exists irrigation_systems_property_idx on public.irrigation_systems(property_id) where active;
create index if not exists irrigation_events_property_date_idx on public.irrigation_events(property_id, occurred_on desc);
create index if not exists irrigation_events_season_idx on public.irrigation_events(season_id);
create index if not exists irrigation_events_plot_idx on public.irrigation_events(plot_id);

drop trigger if exists touch_irrigation_systems on public.irrigation_systems;
create trigger touch_irrigation_systems
before update on public.irrigation_systems
for each row execute procedure public.touch_updated_at();

drop trigger if exists touch_irrigation_events on public.irrigation_events;
create trigger touch_irrigation_events
before update on public.irrigation_events
for each row execute procedure public.touch_updated_at();

insert into public.operation_types (code, label, description, default_unit, category)
values ('irrigacao', 'Irrigação', 'Ficha de controle da irrigação realizada', 'mm', 'agua')
on conflict (code)
do update
set
  label = excluded.label,
  description = excluded.description,
  default_unit = excluded.default_unit,
  category = excluded.category,
  active = true,
  updated_at = now();

create or replace function public.assert_irrigation_context(
  target_property_id uuid,
  target_system_id uuid,
  target_plot_id uuid,
  target_season_id uuid
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  season_property uuid;
  season_state public.season_status;
  system_property uuid;
  system_plot uuid;
begin
  if target_property_id is null then
    raise exception 'record_property_required';
  end if;
  if not public.can_manage_operational_records(target_property_id) then
    raise exception 'permission_denied';
  end if;

  if target_system_id is not null then
    select property_id, plot_id into system_property, system_plot
    from public.irrigation_systems
    where id = target_system_id and active;
    if system_property is null then
      raise exception 'irrigation_system_not_found';
    end if;
    if system_property <> target_property_id then
      raise exception 'record_context_mismatch';
    end if;
    if target_plot_id is not null and system_plot is not null and system_plot <> target_plot_id then
      raise exception 'record_context_mismatch';
    end if;
  end if;

  if target_plot_id is not null and not exists (
    select 1 from public.plots where id = target_plot_id and property_id = target_property_id
  ) then
    raise exception 'record_context_mismatch';
  end if;

  if target_season_id is not null then
    select property_id, status into season_property, season_state
    from public.harvest_seasons
    where id = target_season_id;
    if season_property is null then
      raise exception 'season_not_found';
    end if;
    if season_property <> target_property_id then
      raise exception 'record_context_mismatch';
    end if;
    if season_state = 'closed' then
      raise exception 'season_closed_record';
    end if;
  end if;
end;
$$;

create or replace function public.validate_irrigation_values(
  target_occurred_on date,
  target_started_at time,
  target_ended_at time,
  target_duration_minutes integer,
  target_applied_mm numeric,
  target_frequency_days integer,
  target_average_volume_l numeric
) returns integer
language plpgsql
immutable
set search_path = ''
as $$
declare
  final_duration integer := target_duration_minutes;
begin
  if target_occurred_on is null then
    raise exception 'occurred_at_required';
  end if;
  if target_occurred_on > current_date + 1 then
    raise exception 'occurred_at_invalid';
  end if;
  if target_started_at is not null and target_ended_at is not null then
    if target_ended_at < target_started_at then
      raise exception 'irrigation_time_invalid';
    end if;
    final_duration := extract(epoch from (target_ended_at - target_started_at))::integer / 60;
  end if;
  if final_duration is null or final_duration <= 0 then
    raise exception 'irrigation_duration_required';
  end if;
  if target_applied_mm is not null and target_applied_mm < 0 then
    raise exception 'irrigation_depth_negative';
  end if;
  if target_frequency_days is not null and target_frequency_days <= 0 then
    raise exception 'irrigation_frequency_invalid';
  end if;
  if target_average_volume_l is not null and target_average_volume_l < 0 then
    raise exception 'irrigation_volume_negative';
  end if;
  return final_duration;
end;
$$;

create or replace function public.create_irrigation_system(
  target_property_id uuid,
  target_plot_id uuid,
  target_name text,
  target_system_type text default null,
  target_water_source text default null,
  target_emitters_description text default null,
  target_efficiency_pct numeric default null,
  target_wetted_area_m2 numeric default null,
  target_flow_lh numeric default null,
  target_motor_description text default null,
  target_pump_description text default null,
  target_pressure_bar numeric default null,
  target_spacing_description text default null,
  target_notes text default null
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_id uuid;
  target_account_id uuid;
begin
  if target_name is null or btrim(target_name) = '' then
    raise exception 'irrigation_system_name_required';
  end if;
  perform public.assert_irrigation_context(target_property_id, null, target_plot_id, null);
  if target_efficiency_pct is not null and (target_efficiency_pct < 0 or target_efficiency_pct > 100) then
    raise exception 'irrigation_efficiency_invalid';
  end if;
  if target_wetted_area_m2 is not null and target_wetted_area_m2 < 0 then
    raise exception 'irrigation_wetted_area_negative';
  end if;
  if target_flow_lh is not null and target_flow_lh < 0 then
    raise exception 'irrigation_flow_negative';
  end if;
  if target_pressure_bar is not null and target_pressure_bar < 0 then
    raise exception 'irrigation_pressure_negative';
  end if;

  insert into public.irrigation_systems(
    property_id, plot_id, name, system_type, water_source, emitters_description, efficiency_pct,
    wetted_area_m2, flow_lh, motor_description, pump_description, pressure_bar, spacing_description,
    notes, created_by
  )
  values (
    target_property_id, target_plot_id, btrim(target_name), nullif(btrim(coalesce(target_system_type, '')), ''),
    nullif(btrim(coalesce(target_water_source, '')), ''), nullif(btrim(coalesce(target_emitters_description, '')), ''),
    target_efficiency_pct, target_wetted_area_m2, target_flow_lh, nullif(btrim(coalesce(target_motor_description, '')), ''),
    nullif(btrim(coalesce(target_pump_description, '')), ''), target_pressure_bar,
    nullif(btrim(coalesce(target_spacing_description, '')), ''), target_notes, auth.uid()
  )
  on conflict (property_id, name)
  do update set
    plot_id = excluded.plot_id,
    system_type = excluded.system_type,
    water_source = excluded.water_source,
    emitters_description = excluded.emitters_description,
    efficiency_pct = excluded.efficiency_pct,
    wetted_area_m2 = excluded.wetted_area_m2,
    flow_lh = excluded.flow_lh,
    motor_description = excluded.motor_description,
    pump_description = excluded.pump_description,
    pressure_bar = excluded.pressure_bar,
    spacing_description = excluded.spacing_description,
    notes = excluded.notes,
    active = true,
    updated_at = now()
  returning id into new_id;

  target_account_id := public.resolve_operational_record_account_id(target_property_id);
  perform public.audit_structure(target_account_id, 'irrigation_systems', new_id, 'insert', null, jsonb_build_object('name', btrim(target_name)));
  return new_id;
end;
$$;

create or replace function public.update_irrigation_system(
  target_system_id uuid,
  target_plot_id uuid,
  target_name text,
  target_system_type text default null,
  target_water_source text default null,
  target_emitters_description text default null,
  target_efficiency_pct numeric default null,
  target_wetted_area_m2 numeric default null,
  target_flow_lh numeric default null,
  target_motor_description text default null,
  target_pump_description text default null,
  target_pressure_bar numeric default null,
  target_spacing_description text default null,
  target_notes text default null
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_system public.irrigation_systems%rowtype;
  target_account_id uuid;
begin
  select * into current_system from public.irrigation_systems where id = target_system_id for update;
  if current_system.id is null then
    raise exception 'irrigation_system_not_found';
  end if;
  if target_name is null or btrim(target_name) = '' then
    raise exception 'irrigation_system_name_required';
  end if;
  perform public.assert_irrigation_context(current_system.property_id, null, target_plot_id, null);
  if target_efficiency_pct is not null and (target_efficiency_pct < 0 or target_efficiency_pct > 100) then
    raise exception 'irrigation_efficiency_invalid';
  end if;
  if target_wetted_area_m2 is not null and target_wetted_area_m2 < 0 then
    raise exception 'irrigation_wetted_area_negative';
  end if;
  if target_flow_lh is not null and target_flow_lh < 0 then
    raise exception 'irrigation_flow_negative';
  end if;
  if target_pressure_bar is not null and target_pressure_bar < 0 then
    raise exception 'irrigation_pressure_negative';
  end if;

  update public.irrigation_systems
  set plot_id = target_plot_id,
      name = btrim(target_name),
      system_type = nullif(btrim(coalesce(target_system_type, '')), ''),
      water_source = nullif(btrim(coalesce(target_water_source, '')), ''),
      emitters_description = nullif(btrim(coalesce(target_emitters_description, '')), ''),
      efficiency_pct = target_efficiency_pct,
      wetted_area_m2 = target_wetted_area_m2,
      flow_lh = target_flow_lh,
      motor_description = nullif(btrim(coalesce(target_motor_description, '')), ''),
      pump_description = nullif(btrim(coalesce(target_pump_description, '')), ''),
      pressure_bar = target_pressure_bar,
      spacing_description = nullif(btrim(coalesce(target_spacing_description, '')), ''),
      notes = target_notes,
      updated_at = now()
  where id = target_system_id;

  target_account_id := public.resolve_operational_record_account_id(current_system.property_id);
  perform public.audit_structure(target_account_id, 'irrigation_systems', target_system_id, 'update', to_jsonb(current_system), jsonb_build_object('name', btrim(target_name)));
end;
$$;

create or replace function public.create_irrigation_event(
  target_property_id uuid,
  target_irrigation_system_id uuid,
  target_plot_id uuid,
  target_season_id uuid,
  target_occurred_on date,
  target_started_at time,
  target_ended_at time,
  target_duration_minutes integer,
  target_applied_mm numeric,
  target_frequency_days integer,
  target_average_volume_l numeric,
  target_responsible_name text default null,
  target_notes text default null,
  target_client_id uuid default null
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  record_id uuid;
  event_id uuid;
  target_account_id uuid;
  final_duration integer;
  target_occurred_at_value timestamptz := (target_occurred_on::timestamp + coalesce(target_started_at, time '12:00'))::timestamptz;
begin
  perform public.assert_irrigation_context(target_property_id, target_irrigation_system_id, target_plot_id, target_season_id);
  final_duration := public.validate_irrigation_values(target_occurred_on, target_started_at, target_ended_at, target_duration_minutes, target_applied_mm, target_frequency_days, target_average_volume_l);

  record_id := public.create_operational_record(
    target_property_id,
    'irrigacao',
    target_occurred_at_value,
    target_plot_id,
    null::uuid,
    target_season_id,
    jsonb_strip_nulls(jsonb_build_object(
      'value', target_applied_mm,
      'value_unit', 'mm',
      'duration_minutes', final_duration,
      'average_volume_l', target_average_volume_l,
      'frequency_days', target_frequency_days
    )),
    target_notes,
    'confirmed'::public.record_status,
    'manual'::public.operation_origin,
    null::uuid,
    target_client_id
  );

  insert into public.irrigation_events(
    operational_record_id, property_id, irrigation_system_id, plot_id, season_id, occurred_on, occurred_at,
    started_at, ended_at, duration_minutes, applied_mm, frequency_days, average_volume_l,
    responsible_name, notes, created_by
  )
  values (
    record_id, target_property_id, target_irrigation_system_id, target_plot_id, target_season_id, target_occurred_on, target_occurred_at_value,
    target_started_at, target_ended_at, final_duration, target_applied_mm, target_frequency_days, target_average_volume_l,
    nullif(btrim(coalesce(target_responsible_name, '')), ''), target_notes, auth.uid()
  )
  on conflict (operational_record_id)
  do update set
    irrigation_system_id = excluded.irrigation_system_id,
    plot_id = excluded.plot_id,
    season_id = excluded.season_id,
    occurred_on = excluded.occurred_on,
    occurred_at = excluded.occurred_at,
    started_at = excluded.started_at,
    ended_at = excluded.ended_at,
    duration_minutes = excluded.duration_minutes,
    applied_mm = excluded.applied_mm,
    frequency_days = excluded.frequency_days,
    average_volume_l = excluded.average_volume_l,
    responsible_name = excluded.responsible_name,
    notes = excluded.notes,
    updated_at = now()
  returning id into event_id;

  target_account_id := public.resolve_operational_record_account_id(target_property_id);
  perform public.audit_structure(target_account_id, 'irrigation_events', event_id, 'insert', null, jsonb_build_object('occurred_on', target_occurred_on, 'duration_minutes', final_duration));
  return event_id;
end;
$$;

create or replace function public.update_irrigation_event(
  target_event_id uuid,
  target_irrigation_system_id uuid,
  target_plot_id uuid,
  target_season_id uuid,
  target_occurred_on date,
  target_started_at time,
  target_ended_at time,
  target_duration_minutes integer,
  target_applied_mm numeric,
  target_frequency_days integer,
  target_average_volume_l numeric,
  target_responsible_name text default null,
  target_notes text default null
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_event public.irrigation_events%rowtype;
  target_account_id uuid;
  final_duration integer;
  target_occurred_at_value timestamptz := (target_occurred_on::timestamp + coalesce(target_started_at, time '12:00'))::timestamptz;
begin
  select * into current_event from public.irrigation_events where id = target_event_id for update;
  if current_event.id is null then
    raise exception 'irrigation_event_not_found';
  end if;

  perform public.assert_irrigation_context(current_event.property_id, target_irrigation_system_id, target_plot_id, target_season_id);
  final_duration := public.validate_irrigation_values(target_occurred_on, target_started_at, target_ended_at, target_duration_minutes, target_applied_mm, target_frequency_days, target_average_volume_l);

  perform public.update_operational_record(
    current_event.operational_record_id,
    'irrigacao',
    target_occurred_at_value,
    target_plot_id,
    null::uuid,
    target_season_id,
    jsonb_strip_nulls(jsonb_build_object(
      'value', target_applied_mm,
      'value_unit', 'mm',
      'duration_minutes', final_duration,
      'average_volume_l', target_average_volume_l,
      'frequency_days', target_frequency_days
    )),
    target_notes,
    'confirmed'::public.record_status,
    null::uuid
  );

  update public.irrigation_events
  set irrigation_system_id = target_irrigation_system_id,
      plot_id = target_plot_id,
      season_id = target_season_id,
      occurred_on = target_occurred_on,
      occurred_at = target_occurred_at_value,
      started_at = target_started_at,
      ended_at = target_ended_at,
      duration_minutes = final_duration,
      applied_mm = target_applied_mm,
      frequency_days = target_frequency_days,
      average_volume_l = target_average_volume_l,
      responsible_name = nullif(btrim(coalesce(target_responsible_name, '')), ''),
      notes = target_notes,
      updated_at = now()
  where id = target_event_id;

  target_account_id := public.resolve_operational_record_account_id(current_event.property_id);
  perform public.audit_structure(target_account_id, 'irrigation_events', target_event_id, 'update', to_jsonb(current_event), jsonb_build_object('occurred_on', target_occurred_on, 'duration_minutes', final_duration));
end;
$$;

create or replace function public.delete_irrigation_event(target_event_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_event public.irrigation_events%rowtype;
  target_account_id uuid;
begin
  select * into current_event from public.irrigation_events where id = target_event_id for update;
  if current_event.id is null then
    raise exception 'irrigation_event_not_found';
  end if;
  if not public.can_manage_operational_records(current_event.property_id) then
    raise exception 'permission_denied';
  end if;
  perform public.delete_operational_record(current_event.operational_record_id);
  target_account_id := public.resolve_operational_record_account_id(current_event.property_id);
  perform public.audit_structure(target_account_id, 'irrigation_events', target_event_id, 'delete', null, jsonb_build_object('operational_record_id', current_event.operational_record_id));
end;
$$;

create or replace function public.restore_irrigation_event(target_event_id uuid, target_notes text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_event public.irrigation_events%rowtype;
  target_account_id uuid;
begin
  select * into current_event from public.irrigation_events where id = target_event_id for update;
  if current_event.id is null then
    raise exception 'irrigation_event_not_found';
  end if;
  if not public.can_manage_operational_records(current_event.property_id) then
    raise exception 'permission_denied';
  end if;
  perform public.restore_operational_record(current_event.operational_record_id, target_notes);
  target_account_id := public.resolve_operational_record_account_id(current_event.property_id);
  perform public.audit_structure(target_account_id, 'irrigation_events', target_event_id, 'restore', null, jsonb_build_object('operational_record_id', current_event.operational_record_id));
end;
$$;

grant execute on function public.create_irrigation_system(uuid, uuid, text, text, text, text, numeric, numeric, numeric, text, text, numeric, text, text) to authenticated;
grant execute on function public.update_irrigation_system(uuid, uuid, text, text, text, text, numeric, numeric, numeric, text, text, numeric, text, text) to authenticated;
grant execute on function public.create_irrigation_event(uuid, uuid, uuid, uuid, date, time, time, integer, numeric, integer, numeric, text, text, uuid) to authenticated;
grant execute on function public.update_irrigation_event(uuid, uuid, uuid, uuid, date, time, time, integer, numeric, integer, numeric, text, text) to authenticated;
grant execute on function public.delete_irrigation_event(uuid) to authenticated;
grant execute on function public.restore_irrigation_event(uuid, text) to authenticated;

alter table public.irrigation_systems enable row level security;
alter table public.irrigation_events enable row level security;

drop policy if exists "irrigation systems read" on public.irrigation_systems;
create policy "irrigation systems read" on public.irrigation_systems
  for select using (public.can_access_property(property_id));

drop policy if exists "irrigation systems insert blocked" on public.irrigation_systems;
create policy "irrigation systems insert blocked" on public.irrigation_systems
  for insert with check (false);

drop policy if exists "irrigation systems update blocked" on public.irrigation_systems;
create policy "irrigation systems update blocked" on public.irrigation_systems
  for update using (false) with check (false);

drop policy if exists "irrigation systems delete blocked" on public.irrigation_systems;
create policy "irrigation systems delete blocked" on public.irrigation_systems
  for delete using (false);

drop policy if exists "irrigation events read" on public.irrigation_events;
create policy "irrigation events read" on public.irrigation_events
  for select using (public.can_access_property(property_id));

drop policy if exists "irrigation events insert blocked" on public.irrigation_events;
create policy "irrigation events insert blocked" on public.irrigation_events
  for insert with check (false);

drop policy if exists "irrigation events update blocked" on public.irrigation_events;
create policy "irrigation events update blocked" on public.irrigation_events
  for update using (false) with check (false);

drop policy if exists "irrigation events delete blocked" on public.irrigation_events;
create policy "irrigation events delete blocked" on public.irrigation_events
  for delete using (false);
