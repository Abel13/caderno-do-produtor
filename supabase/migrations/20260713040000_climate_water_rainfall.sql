create table if not exists public.climate_measurement_points (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 80),
  description text,
  active boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (property_id, name)
);

create table if not exists public.climate_readings (
  id uuid primary key default gen_random_uuid(),
  operational_record_id uuid not null unique references public.operational_records(id) on delete restrict,
  property_id uuid not null references public.properties(id) on delete restrict,
  measurement_point_id uuid references public.climate_measurement_points(id) on delete restrict,
  control_type text not null check (control_type in ('rainfall', 'daily_weather')),
  occurred_on date not null,
  occurred_at timestamptz not null,
  plot_id uuid references public.plots(id) on delete restrict,
  season_id uuid references public.harvest_seasons(id) on delete restrict,
  rainfall_mm numeric(10,2) not null check (rainfall_mm >= 0),
  temperature_min_c numeric(5,2),
  temperature_avg_c numeric(5,2),
  temperature_max_c numeric(5,2),
  relative_humidity_pct numeric(5,2) check (relative_humidity_pct is null or relative_humidity_pct between 0 and 100),
  harmful_occurrences text,
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    temperature_min_c is null
    or temperature_max_c is null
    or temperature_min_c <= temperature_max_c
  ),
  check (
    temperature_avg_c is null
    or temperature_min_c is null
    or temperature_avg_c >= temperature_min_c
  ),
  check (
    temperature_avg_c is null
    or temperature_max_c is null
    or temperature_avg_c <= temperature_max_c
  )
);

create index if not exists climate_points_property_idx on public.climate_measurement_points(property_id) where active;
create index if not exists climate_readings_property_date_idx on public.climate_readings(property_id, occurred_on desc);
create index if not exists climate_readings_point_date_idx on public.climate_readings(measurement_point_id, occurred_on desc);
create index if not exists climate_readings_season_idx on public.climate_readings(season_id);

drop trigger if exists touch_climate_measurement_points on public.climate_measurement_points;
create trigger touch_climate_measurement_points
before update on public.climate_measurement_points
for each row execute procedure public.touch_updated_at();

drop trigger if exists touch_climate_readings on public.climate_readings;
create trigger touch_climate_readings
before update on public.climate_readings
for each row execute procedure public.touch_updated_at();

insert into public.operation_types (code, label, description, default_unit, category)
values
  ('chuva', 'Chuva', 'Controle pluviométrico simples', 'mm', 'agua'),
  ('clima_diario', 'Clima diário', 'Controle climático diário com chuva, temperatura, umidade e ocorrências', 'mm', 'agua')
on conflict (code)
do update
set
  label = excluded.label,
  description = excluded.description,
  default_unit = excluded.default_unit,
  category = excluded.category,
  active = true,
  updated_at = now();

create or replace function public.assert_climate_context(
  target_property_id uuid,
  target_measurement_point_id uuid,
  target_plot_id uuid,
  target_season_id uuid,
  require_point_when_many boolean default true
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  active_point_count integer;
  season_property uuid;
  season_state public.season_status;
begin
  if target_property_id is null then
    raise exception 'record_property_required';
  end if;
  if not public.can_manage_operational_records(target_property_id) then
    raise exception 'permission_denied';
  end if;

  if target_measurement_point_id is not null and not exists (
    select 1 from public.climate_measurement_points
    where id = target_measurement_point_id
      and property_id = target_property_id
      and active
  ) then
    raise exception 'measurement_point_not_found';
  end if;

  select count(*) into active_point_count
  from public.climate_measurement_points
  where property_id = target_property_id and active;

  if require_point_when_many and active_point_count > 1 and target_measurement_point_id is null then
    raise exception 'measurement_point_required';
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

create or replace function public.validate_climate_reading_values(
  rainfall_mm numeric,
  temperature_min_c numeric,
  temperature_avg_c numeric,
  temperature_max_c numeric,
  relative_humidity_pct numeric
) returns void
language plpgsql
immutable
set search_path = ''
as $$
begin
  if rainfall_mm is null then
    raise exception 'rainfall_volume_required';
  end if;
  if rainfall_mm < 0 then
    raise exception 'rainfall_volume_negative';
  end if;
  if relative_humidity_pct is not null and (relative_humidity_pct < 0 or relative_humidity_pct > 100) then
    raise exception 'humidity_invalid';
  end if;
  if temperature_min_c is not null and temperature_max_c is not null and temperature_min_c > temperature_max_c then
    raise exception 'temperature_range_invalid';
  end if;
  if temperature_avg_c is not null and temperature_min_c is not null and temperature_avg_c < temperature_min_c then
    raise exception 'temperature_range_invalid';
  end if;
  if temperature_avg_c is not null and temperature_max_c is not null and temperature_avg_c > temperature_max_c then
    raise exception 'temperature_range_invalid';
  end if;
end;
$$;

create or replace function public.create_climate_measurement_point(
  target_property_id uuid,
  target_name text,
  target_description text default null
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
    raise exception 'measurement_point_name_required';
  end if;
  if not public.can_manage_operational_records(target_property_id) then
    raise exception 'permission_denied';
  end if;

  insert into public.climate_measurement_points(property_id, name, description, created_by)
  values (target_property_id, btrim(target_name), nullif(btrim(coalesce(target_description, '')), ''), auth.uid())
  on conflict (property_id, name)
  do update set active = true, description = excluded.description, updated_at = now()
  returning id into new_id;

  target_account_id := public.resolve_operational_record_account_id(target_property_id);
  perform public.audit_structure(
    target_account_id,
    'climate_measurement_points',
    new_id,
    'insert',
    null,
    jsonb_build_object('name', btrim(target_name))
  );
  return new_id;
end;
$$;

create or replace function public.create_rainfall_record(
  target_property_id uuid,
  target_occurred_on date,
  target_measurement_point_id uuid,
  target_rainfall_mm numeric,
  target_plot_id uuid default null,
  target_season_id uuid default null,
  target_notes text default null,
  target_status public.record_status default 'confirmed',
  target_client_id uuid default null
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  record_id uuid;
  reading_id uuid;
  target_account_id uuid;
  target_occurred_at_value timestamptz := (target_occurred_on::timestamp + time '12:00')::timestamptz;
begin
  if target_occurred_on is null then
    raise exception 'occurred_at_required';
  end if;
  if target_occurred_on > current_date + 1 then
    raise exception 'occurred_at_invalid';
  end if;
  perform public.validate_climate_reading_values(target_rainfall_mm, null, null, null, null);
  perform public.assert_climate_context(target_property_id, target_measurement_point_id, target_plot_id, target_season_id, true);

  record_id := public.create_operational_record(
    target_property_id,
    'chuva',
    target_occurred_at_value,
    target_plot_id,
    null::uuid,
    target_season_id,
    jsonb_build_object('value', target_rainfall_mm, 'value_unit', 'mm'),
    target_notes,
    target_status,
    'manual'::public.operation_origin,
    null::uuid,
    target_client_id
  );

  insert into public.climate_readings(
    operational_record_id, property_id, measurement_point_id, control_type, occurred_on, occurred_at,
    plot_id, season_id, rainfall_mm, notes, created_by
  )
  values (
    record_id, target_property_id, target_measurement_point_id, 'rainfall', target_occurred_on, target_occurred_at_value,
    target_plot_id, target_season_id, target_rainfall_mm, target_notes, auth.uid()
  )
  on conflict (operational_record_id)
  do update set
    measurement_point_id = excluded.measurement_point_id,
    occurred_on = excluded.occurred_on,
    occurred_at = excluded.occurred_at,
    plot_id = excluded.plot_id,
    season_id = excluded.season_id,
    rainfall_mm = excluded.rainfall_mm,
    notes = excluded.notes,
    updated_at = now()
  returning id into reading_id;

  target_account_id := public.resolve_operational_record_account_id(target_property_id);
  perform public.audit_structure(
    target_account_id,
    'climate_readings',
    reading_id,
    'insert',
    null,
    jsonb_build_object('control_type', 'rainfall', 'rainfall_mm', target_rainfall_mm)
  );
  return reading_id;
end;
$$;

create or replace function public.create_daily_weather_record(
  target_property_id uuid,
  target_occurred_on date,
  target_measurement_point_id uuid,
  target_rainfall_mm numeric,
  target_temperature_min_c numeric default null,
  target_temperature_avg_c numeric default null,
  target_temperature_max_c numeric default null,
  target_relative_humidity_pct numeric default null,
  target_harmful_occurrences text default null,
  target_plot_id uuid default null,
  target_season_id uuid default null,
  target_notes text default null,
  target_status public.record_status default 'confirmed',
  target_client_id uuid default null
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  record_id uuid;
  reading_id uuid;
  target_account_id uuid;
  target_occurred_at_value timestamptz := (target_occurred_on::timestamp + time '12:00')::timestamptz;
  payload jsonb;
begin
  if target_occurred_on is null then
    raise exception 'occurred_at_required';
  end if;
  if target_occurred_on > current_date + 1 then
    raise exception 'occurred_at_invalid';
  end if;
  perform public.validate_climate_reading_values(target_rainfall_mm, target_temperature_min_c, target_temperature_avg_c, target_temperature_max_c, target_relative_humidity_pct);
  perform public.assert_climate_context(target_property_id, target_measurement_point_id, target_plot_id, target_season_id, true);

  payload := jsonb_build_object('value', target_rainfall_mm, 'value_unit', 'mm')
    || jsonb_strip_nulls(jsonb_build_object(
      'temperature_min_c', target_temperature_min_c,
      'temperature_avg_c', target_temperature_avg_c,
      'temperature_max_c', target_temperature_max_c,
      'relative_humidity_pct', target_relative_humidity_pct,
      'harmful_occurrences', nullif(btrim(coalesce(target_harmful_occurrences, '')), '')
    ));

  record_id := public.create_operational_record(
    target_property_id,
    'clima_diario',
    target_occurred_at_value,
    target_plot_id,
    null::uuid,
    target_season_id,
    payload,
    target_notes,
    target_status,
    'manual'::public.operation_origin,
    null::uuid,
    target_client_id
  );

  insert into public.climate_readings(
    operational_record_id, property_id, measurement_point_id, control_type, occurred_on, occurred_at,
    plot_id, season_id, rainfall_mm, temperature_min_c, temperature_avg_c, temperature_max_c,
    relative_humidity_pct, harmful_occurrences, notes, created_by
  )
  values (
    record_id, target_property_id, target_measurement_point_id, 'daily_weather', target_occurred_on, target_occurred_at_value,
    target_plot_id, target_season_id, target_rainfall_mm, target_temperature_min_c, target_temperature_avg_c, target_temperature_max_c,
    target_relative_humidity_pct, nullif(btrim(coalesce(target_harmful_occurrences, '')), ''), target_notes, auth.uid()
  )
  on conflict (operational_record_id)
  do update set
    measurement_point_id = excluded.measurement_point_id,
    occurred_on = excluded.occurred_on,
    occurred_at = excluded.occurred_at,
    plot_id = excluded.plot_id,
    season_id = excluded.season_id,
    rainfall_mm = excluded.rainfall_mm,
    temperature_min_c = excluded.temperature_min_c,
    temperature_avg_c = excluded.temperature_avg_c,
    temperature_max_c = excluded.temperature_max_c,
    relative_humidity_pct = excluded.relative_humidity_pct,
    harmful_occurrences = excluded.harmful_occurrences,
    notes = excluded.notes,
    updated_at = now()
  returning id into reading_id;

  target_account_id := public.resolve_operational_record_account_id(target_property_id);
  perform public.audit_structure(
    target_account_id,
    'climate_readings',
    reading_id,
    'insert',
    null,
    jsonb_build_object('control_type', 'daily_weather', 'rainfall_mm', target_rainfall_mm)
  );
  return reading_id;
end;
$$;

create or replace function public.update_climate_reading(
  target_reading_id uuid,
  target_occurred_on date,
  target_measurement_point_id uuid,
  target_rainfall_mm numeric,
  target_temperature_min_c numeric default null,
  target_temperature_avg_c numeric default null,
  target_temperature_max_c numeric default null,
  target_relative_humidity_pct numeric default null,
  target_harmful_occurrences text default null,
  target_plot_id uuid default null,
  target_season_id uuid default null,
  target_notes text default null,
  target_status public.record_status default 'confirmed'
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_reading public.climate_readings%rowtype;
  target_account_id uuid;
  target_type text;
  payload jsonb;
  target_occurred_at_value timestamptz := (target_occurred_on::timestamp + time '12:00')::timestamptz;
begin
  select * into current_reading from public.climate_readings where id = target_reading_id for update;
  if current_reading.id is null then
    raise exception 'climate_reading_not_found';
  end if;
  if target_occurred_on is null then
    raise exception 'occurred_at_required';
  end if;
  if target_occurred_on > current_date + 1 then
    raise exception 'occurred_at_invalid';
  end if;
  perform public.validate_climate_reading_values(target_rainfall_mm, target_temperature_min_c, target_temperature_avg_c, target_temperature_max_c, target_relative_humidity_pct);
  perform public.assert_climate_context(current_reading.property_id, target_measurement_point_id, target_plot_id, target_season_id, true);

  target_type := case when current_reading.control_type = 'daily_weather' then 'clima_diario' else 'chuva' end;
  payload := jsonb_build_object('value', target_rainfall_mm, 'value_unit', 'mm')
    || jsonb_strip_nulls(jsonb_build_object(
      'temperature_min_c', case when current_reading.control_type = 'daily_weather' then target_temperature_min_c else null end,
      'temperature_avg_c', case when current_reading.control_type = 'daily_weather' then target_temperature_avg_c else null end,
      'temperature_max_c', case when current_reading.control_type = 'daily_weather' then target_temperature_max_c else null end,
      'relative_humidity_pct', case when current_reading.control_type = 'daily_weather' then target_relative_humidity_pct else null end,
      'harmful_occurrences', case when current_reading.control_type = 'daily_weather' then nullif(btrim(coalesce(target_harmful_occurrences, '')), '') else null end
    ));

  perform public.update_operational_record(
    current_reading.operational_record_id,
    target_type,
    target_occurred_at_value,
    target_plot_id,
    null::uuid,
    target_season_id,
    payload,
    target_notes,
    target_status,
    null::uuid
  );

  update public.climate_readings
    set measurement_point_id = target_measurement_point_id,
        occurred_on = target_occurred_on,
        occurred_at = target_occurred_at_value,
        plot_id = target_plot_id,
        season_id = target_season_id,
        rainfall_mm = target_rainfall_mm,
        temperature_min_c = case when control_type = 'daily_weather' then target_temperature_min_c else null end,
        temperature_avg_c = case when control_type = 'daily_weather' then target_temperature_avg_c else null end,
        temperature_max_c = case when control_type = 'daily_weather' then target_temperature_max_c else null end,
        relative_humidity_pct = case when control_type = 'daily_weather' then target_relative_humidity_pct else null end,
        harmful_occurrences = case when control_type = 'daily_weather' then nullif(btrim(coalesce(target_harmful_occurrences, '')), '') else null end,
        notes = target_notes,
        updated_at = now()
    where id = target_reading_id;

  target_account_id := public.resolve_operational_record_account_id(current_reading.property_id);
  perform public.audit_structure(
    target_account_id,
    'climate_readings',
    target_reading_id,
    'update',
    to_jsonb(current_reading),
    jsonb_build_object('rainfall_mm', target_rainfall_mm, 'occurred_on', target_occurred_on)
  );
end;
$$;

create or replace function public.delete_climate_reading(target_reading_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_reading public.climate_readings%rowtype;
  target_account_id uuid;
begin
  select * into current_reading from public.climate_readings where id = target_reading_id for update;
  if current_reading.id is null then
    raise exception 'climate_reading_not_found';
  end if;
  if not public.can_manage_operational_records(current_reading.property_id) then
    raise exception 'permission_denied';
  end if;
  perform public.delete_operational_record(current_reading.operational_record_id);
  target_account_id := public.resolve_operational_record_account_id(current_reading.property_id);
  perform public.audit_structure(target_account_id, 'climate_readings', target_reading_id, 'delete', null, jsonb_build_object('operational_record_id', current_reading.operational_record_id));
end;
$$;

create or replace function public.restore_climate_reading(target_reading_id uuid, target_notes text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_reading public.climate_readings%rowtype;
  target_account_id uuid;
begin
  select * into current_reading from public.climate_readings where id = target_reading_id for update;
  if current_reading.id is null then
    raise exception 'climate_reading_not_found';
  end if;
  if not public.can_manage_operational_records(current_reading.property_id) then
    raise exception 'permission_denied';
  end if;
  perform public.restore_operational_record(current_reading.operational_record_id, target_notes);
  target_account_id := public.resolve_operational_record_account_id(current_reading.property_id);
  perform public.audit_structure(target_account_id, 'climate_readings', target_reading_id, 'restore', null, jsonb_build_object('operational_record_id', current_reading.operational_record_id));
end;
$$;

grant execute on function public.create_climate_measurement_point(uuid, text, text) to authenticated;
grant execute on function public.create_rainfall_record(uuid, date, uuid, numeric, uuid, uuid, text, public.record_status, uuid) to authenticated;
grant execute on function public.create_daily_weather_record(uuid, date, uuid, numeric, numeric, numeric, numeric, numeric, text, uuid, uuid, text, public.record_status, uuid) to authenticated;
grant execute on function public.update_climate_reading(uuid, date, uuid, numeric, numeric, numeric, numeric, numeric, text, uuid, uuid, text, public.record_status) to authenticated;
grant execute on function public.delete_climate_reading(uuid) to authenticated;
grant execute on function public.restore_climate_reading(uuid, text) to authenticated;

alter table public.climate_measurement_points enable row level security;
alter table public.climate_readings enable row level security;

drop policy if exists "climate points read" on public.climate_measurement_points;
create policy "climate points read" on public.climate_measurement_points
  for select using (public.can_access_property(property_id));

drop policy if exists "climate points insert blocked" on public.climate_measurement_points;
create policy "climate points insert blocked" on public.climate_measurement_points
  for insert with check (false);

drop policy if exists "climate points update blocked" on public.climate_measurement_points;
create policy "climate points update blocked" on public.climate_measurement_points
  for update using (false) with check (false);

drop policy if exists "climate points delete blocked" on public.climate_measurement_points;
create policy "climate points delete blocked" on public.climate_measurement_points
  for delete using (false);

drop policy if exists "climate readings read" on public.climate_readings;
create policy "climate readings read" on public.climate_readings
  for select using (public.can_access_property(property_id));

drop policy if exists "climate readings insert blocked" on public.climate_readings;
create policy "climate readings insert blocked" on public.climate_readings
  for insert with check (false);

drop policy if exists "climate readings update blocked" on public.climate_readings;
create policy "climate readings update blocked" on public.climate_readings
  for update using (false) with check (false);

drop policy if exists "climate readings delete blocked" on public.climate_readings;
create policy "climate readings delete blocked" on public.climate_readings
  for delete using (false);
