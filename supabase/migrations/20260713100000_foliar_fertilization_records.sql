create table if not exists public.foliar_fertilization_records (
  id uuid primary key default gen_random_uuid(),
  operational_record_id uuid not null unique references public.operational_records(id) on delete restrict,
  property_id uuid not null references public.properties(id) on delete restrict,
  plot_id uuid not null references public.plots(id) on delete restrict,
  planting_id uuid references public.plantings(id) on delete restrict,
  season_id uuid references public.harvest_seasons(id) on delete restrict,
  applied_on date not null,
  purpose text not null check (length(btrim(purpose)) between 1 and 120),
  spray_volume_l_ha numeric(12,3) check (spray_volume_l_ha is null or spray_volume_l_ha >= 0),
  temperature_c numeric(5,2) check (temperature_c is null or temperature_c between -10 and 60),
  humidity_pct numeric(5,2) check (humidity_pct is null or humidity_pct between 0 and 100),
  wind_speed_km_h numeric(6,2) check (wind_speed_km_h is null or wind_speed_km_h >= 0),
  weather_notes text,
  labor_type text check (labor_type is null or labor_type in ('hh','hm')),
  labor_quantity numeric(12,2) check (labor_quantity is null or labor_quantity >= 0),
  fuel_l numeric(12,2) check (fuel_l is null or fuel_l >= 0),
  responsible_name text,
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.foliar_fertilization_components (
  id uuid primary key default gen_random_uuid(),
  foliar_fertilization_id uuid not null references public.foliar_fertilization_records(id) on delete cascade,
  position integer not null check (position > 0),
  product_name text not null check (length(btrim(product_name)) between 1 and 120),
  dose_value numeric(12,4) not null check (dose_value >= 0),
  dose_unit text not null check (length(btrim(dose_unit)) between 1 and 40),
  total_quantity numeric(12,3) check (total_quantity is null or total_quantity >= 0),
  notes text,
  created_at timestamptz not null default now(),
  unique (foliar_fertilization_id, position)
);

create index if not exists foliar_fertilizations_property_date_idx on public.foliar_fertilization_records(property_id, applied_on desc);
create index if not exists foliar_fertilizations_plot_idx on public.foliar_fertilization_records(plot_id);
create index if not exists foliar_fertilizations_season_idx on public.foliar_fertilization_records(season_id);
create index if not exists foliar_fertilization_components_record_idx on public.foliar_fertilization_components(foliar_fertilization_id, position);
create index if not exists foliar_fertilization_components_product_idx on public.foliar_fertilization_components(product_name);

drop trigger if exists touch_foliar_fertilization_records on public.foliar_fertilization_records;
create trigger touch_foliar_fertilization_records
before update on public.foliar_fertilization_records
for each row execute procedure public.touch_updated_at();

insert into public.operation_types (code, label, description, default_unit, category)
values ('adubacao_foliar', 'Adubação via folha', 'Ficha de controle de adubação foliar com componentes de mistura', 'L/ha', 'solo')
on conflict (code)
do update set
  label = excluded.label,
  description = excluded.description,
  default_unit = excluded.default_unit,
  category = excluded.category,
  active = true,
  updated_at = now();

create or replace function public.assert_foliar_fertilization_context(
  target_property_id uuid,
  target_plot_id uuid,
  target_planting_id uuid,
  target_season_id uuid,
  target_applied_on date
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  plot_property uuid;
  plot_status public.plot_status;
  planting_property uuid;
  planting_plot uuid;
  season_property uuid;
  season_state public.season_status;
begin
  if target_property_id is null then raise exception 'record_property_required'; end if;
  if not public.can_manage_operational_records(target_property_id) then raise exception 'permission_denied'; end if;
  if target_plot_id is null then raise exception 'foliar_fertilization_context_mismatch'; end if;
  if target_applied_on is null then raise exception 'occurred_at_required'; end if;
  if target_applied_on > current_date + 1 then raise exception 'occurred_at_invalid'; end if;

  select property_id, status into plot_property, plot_status from public.plots where id = target_plot_id;
  if plot_property is null or plot_property <> target_property_id then raise exception 'foliar_fertilization_context_mismatch'; end if;
  if plot_status = 'closed' then raise exception 'foliar_fertilization_context_mismatch'; end if;

  if target_planting_id is not null then
    select p.property_id, pl.plot_id into planting_property, planting_plot
    from public.plantings pl
    join public.plots p on p.id = pl.plot_id
    where pl.id = target_planting_id;
    if planting_property is null or planting_property <> target_property_id or planting_plot <> target_plot_id then
      raise exception 'foliar_fertilization_context_mismatch';
    end if;
  end if;

  if target_season_id is not null then
    select property_id, status into season_property, season_state from public.harvest_seasons where id = target_season_id;
    if season_property is null or season_property <> target_property_id then raise exception 'foliar_fertilization_context_mismatch'; end if;
    if season_state = 'closed' then raise exception 'season_closed_record'; end if;
  end if;
end;
$$;

create or replace function public.validate_foliar_fertilization_values(
  target_purpose text,
  target_spray_volume_l_ha numeric,
  target_temperature_c numeric,
  target_humidity_pct numeric,
  target_wind_speed_km_h numeric,
  target_labor_type text,
  target_labor_quantity numeric,
  target_fuel_l numeric,
  target_components jsonb
) returns void
language plpgsql
immutable
set search_path = ''
as $$
declare
  component jsonb;
begin
  if target_purpose is null or btrim(target_purpose) = '' then raise exception 'foliar_fertilization_invalid_values'; end if;
  if target_spray_volume_l_ha is not null and target_spray_volume_l_ha < 0 then raise exception 'foliar_fertilization_invalid_values'; end if;
  if target_temperature_c is not null and (target_temperature_c < -10 or target_temperature_c > 60) then raise exception 'foliar_fertilization_invalid_values'; end if;
  if target_humidity_pct is not null and (target_humidity_pct < 0 or target_humidity_pct > 100) then raise exception 'foliar_fertilization_invalid_values'; end if;
  if target_wind_speed_km_h is not null and target_wind_speed_km_h < 0 then raise exception 'foliar_fertilization_invalid_values'; end if;
  if target_labor_type is not null and target_labor_type not in ('hh','hm') then raise exception 'foliar_fertilization_invalid_values'; end if;
  if target_labor_quantity is not null and target_labor_quantity < 0 then raise exception 'foliar_fertilization_invalid_values'; end if;
  if target_fuel_l is not null and target_fuel_l < 0 then raise exception 'foliar_fertilization_invalid_values'; end if;
  if target_components is null or jsonb_typeof(target_components) <> 'array' or jsonb_array_length(target_components) = 0 then raise exception 'foliar_fertilization_invalid_components'; end if;

  for component in select * from jsonb_array_elements(target_components)
  loop
    if nullif(btrim(coalesce(component->>'product_name', '')), '') is null then raise exception 'foliar_fertilization_invalid_components'; end if;
    if nullif(btrim(coalesce(component->>'dose_unit', '')), '') is null then raise exception 'foliar_fertilization_invalid_components'; end if;
    if (component->>'dose_value') is null or (component->>'dose_value')::numeric < 0 then raise exception 'foliar_fertilization_invalid_components'; end if;
    if (component->>'total_quantity') is not null and (component->>'total_quantity')::numeric < 0 then raise exception 'foliar_fertilization_invalid_components'; end if;
  end loop;
end;
$$;

create or replace function public.replace_foliar_fertilization_components(
  target_foliar_fertilization_id uuid,
  target_components jsonb
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  component jsonb;
  component_position integer := 0;
begin
  delete from public.foliar_fertilization_components where foliar_fertilization_id = target_foliar_fertilization_id;

  for component in select * from jsonb_array_elements(target_components)
  loop
    component_position := component_position + 1;
    insert into public.foliar_fertilization_components(
      foliar_fertilization_id, position, product_name, dose_value, dose_unit, total_quantity, notes
    )
    values (
      target_foliar_fertilization_id,
      component_position,
      btrim(component->>'product_name'),
      (component->>'dose_value')::numeric,
      btrim(component->>'dose_unit'),
      nullif(component->>'total_quantity', '')::numeric,
      nullif(btrim(coalesce(component->>'notes', '')), '')
    );
  end loop;
end;
$$;

revoke all on function public.replace_foliar_fertilization_components(uuid, jsonb) from public;
revoke all on function public.replace_foliar_fertilization_components(uuid, jsonb) from anon;
revoke all on function public.replace_foliar_fertilization_components(uuid, jsonb) from authenticated;

create or replace function public.create_foliar_fertilization_record(
  target_property_id uuid,
  target_plot_id uuid,
  target_planting_id uuid,
  target_season_id uuid,
  target_applied_on date,
  target_purpose text,
  target_spray_volume_l_ha numeric default null,
  target_temperature_c numeric default null,
  target_humidity_pct numeric default null,
  target_wind_speed_km_h numeric default null,
  target_weather_notes text default null,
  target_labor_type text default null,
  target_labor_quantity numeric default null,
  target_fuel_l numeric default null,
  target_responsible_name text default null,
  target_notes text default null,
  target_components jsonb default '[]'::jsonb,
  target_client_id uuid default null
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  record_id uuid;
  foliar_fertilization_id uuid;
  account_id uuid;
  occurred_at_value timestamptz := (target_applied_on::timestamp + time '12:00')::timestamptz;
begin
  perform public.assert_foliar_fertilization_context(target_property_id, target_plot_id, target_planting_id, target_season_id, target_applied_on);
  perform public.validate_foliar_fertilization_values(target_purpose, target_spray_volume_l_ha, target_temperature_c, target_humidity_pct, target_wind_speed_km_h, target_labor_type, target_labor_quantity, target_fuel_l, target_components);

  record_id := public.create_operational_record(
    target_property_id,
    'adubacao_foliar',
    occurred_at_value,
    target_plot_id,
    target_planting_id,
    target_season_id,
    jsonb_strip_nulls(jsonb_build_object(
      'value', target_spray_volume_l_ha,
      'value_unit', 'L/ha',
      'purpose', btrim(target_purpose),
      'components_count', jsonb_array_length(target_components)
    )),
    target_notes,
    'confirmed'::public.record_status,
    'manual'::public.operation_origin,
    null::uuid,
    target_client_id
  );

  insert into public.foliar_fertilization_records(
    operational_record_id, property_id, plot_id, planting_id, season_id, applied_on, purpose,
    spray_volume_l_ha, temperature_c, humidity_pct, wind_speed_km_h, weather_notes,
    labor_type, labor_quantity, fuel_l, responsible_name, notes, created_by
  )
  values (
    record_id, target_property_id, target_plot_id, target_planting_id, target_season_id, target_applied_on, btrim(target_purpose),
    target_spray_volume_l_ha, target_temperature_c, target_humidity_pct, target_wind_speed_km_h, nullif(btrim(coalesce(target_weather_notes, '')), ''),
    nullif(target_labor_type, ''), target_labor_quantity, target_fuel_l, nullif(btrim(coalesce(target_responsible_name, '')), ''), target_notes, auth.uid()
  )
  returning id into foliar_fertilization_id;

  perform public.replace_foliar_fertilization_components(foliar_fertilization_id, target_components);
  account_id := public.resolve_operational_record_account_id(target_property_id);
  perform public.audit_structure(account_id, 'foliar_fertilization_records', foliar_fertilization_id, 'insert', null, jsonb_build_object('applied_on', target_applied_on, 'purpose', btrim(target_purpose)));
  return foliar_fertilization_id;
end;
$$;

create or replace function public.update_foliar_fertilization_record(
  target_foliar_fertilization_id uuid,
  target_plot_id uuid,
  target_planting_id uuid,
  target_season_id uuid,
  target_applied_on date,
  target_purpose text,
  target_spray_volume_l_ha numeric default null,
  target_temperature_c numeric default null,
  target_humidity_pct numeric default null,
  target_wind_speed_km_h numeric default null,
  target_weather_notes text default null,
  target_labor_type text default null,
  target_labor_quantity numeric default null,
  target_fuel_l numeric default null,
  target_responsible_name text default null,
  target_notes text default null,
  target_components jsonb default '[]'::jsonb
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_record public.foliar_fertilization_records%rowtype;
  account_id uuid;
  occurred_at_value timestamptz := (target_applied_on::timestamp + time '12:00')::timestamptz;
begin
  select * into current_record from public.foliar_fertilization_records where id = target_foliar_fertilization_id for update;
  if current_record.id is null then raise exception 'foliar_fertilization_not_found'; end if;
  perform public.assert_foliar_fertilization_context(current_record.property_id, target_plot_id, target_planting_id, target_season_id, target_applied_on);
  perform public.validate_foliar_fertilization_values(target_purpose, target_spray_volume_l_ha, target_temperature_c, target_humidity_pct, target_wind_speed_km_h, target_labor_type, target_labor_quantity, target_fuel_l, target_components);

  perform public.update_operational_record(
    current_record.operational_record_id,
    'adubacao_foliar',
    occurred_at_value,
    target_plot_id,
    target_planting_id,
    target_season_id,
    jsonb_strip_nulls(jsonb_build_object(
      'value', target_spray_volume_l_ha,
      'value_unit', 'L/ha',
      'purpose', btrim(target_purpose),
      'components_count', jsonb_array_length(target_components)
    )),
    target_notes,
    'confirmed'::public.record_status,
    null::uuid
  );

  update public.foliar_fertilization_records
  set plot_id = target_plot_id,
      planting_id = target_planting_id,
      season_id = target_season_id,
      applied_on = target_applied_on,
      purpose = btrim(target_purpose),
      spray_volume_l_ha = target_spray_volume_l_ha,
      temperature_c = target_temperature_c,
      humidity_pct = target_humidity_pct,
      wind_speed_km_h = target_wind_speed_km_h,
      weather_notes = nullif(btrim(coalesce(target_weather_notes, '')), ''),
      labor_type = nullif(target_labor_type, ''),
      labor_quantity = target_labor_quantity,
      fuel_l = target_fuel_l,
      responsible_name = nullif(btrim(coalesce(target_responsible_name, '')), ''),
      notes = target_notes,
      updated_at = now()
  where id = target_foliar_fertilization_id;

  perform public.replace_foliar_fertilization_components(target_foliar_fertilization_id, target_components);
  account_id := public.resolve_operational_record_account_id(current_record.property_id);
  perform public.audit_structure(account_id, 'foliar_fertilization_records', target_foliar_fertilization_id, 'update', to_jsonb(current_record), jsonb_build_object('applied_on', target_applied_on, 'purpose', btrim(target_purpose)));
end;
$$;

create or replace function public.delete_foliar_fertilization_record(target_foliar_fertilization_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_record public.foliar_fertilization_records%rowtype;
  account_id uuid;
begin
  select * into current_record from public.foliar_fertilization_records where id = target_foliar_fertilization_id for update;
  if current_record.id is null then raise exception 'foliar_fertilization_not_found'; end if;
  if not public.can_manage_operational_records(current_record.property_id) then raise exception 'permission_denied'; end if;
  perform public.delete_operational_record(current_record.operational_record_id);
  account_id := public.resolve_operational_record_account_id(current_record.property_id);
  perform public.audit_structure(account_id, 'foliar_fertilization_records', target_foliar_fertilization_id, 'delete', null, jsonb_build_object('operational_record_id', current_record.operational_record_id));
end;
$$;

create or replace function public.restore_foliar_fertilization_record(target_foliar_fertilization_id uuid, target_notes text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_record public.foliar_fertilization_records%rowtype;
  account_id uuid;
begin
  select * into current_record from public.foliar_fertilization_records where id = target_foliar_fertilization_id for update;
  if current_record.id is null then raise exception 'foliar_fertilization_not_found'; end if;
  if not public.can_manage_operational_records(current_record.property_id) then raise exception 'permission_denied'; end if;
  perform public.restore_operational_record(current_record.operational_record_id, target_notes);
  account_id := public.resolve_operational_record_account_id(current_record.property_id);
  perform public.audit_structure(account_id, 'foliar_fertilization_records', target_foliar_fertilization_id, 'restore', null, jsonb_build_object('operational_record_id', current_record.operational_record_id));
end;
$$;

grant execute on function public.create_foliar_fertilization_record(uuid, uuid, uuid, uuid, date, text, numeric, numeric, numeric, numeric, text, text, numeric, numeric, text, text, jsonb, uuid) to authenticated;
grant execute on function public.update_foliar_fertilization_record(uuid, uuid, uuid, uuid, date, text, numeric, numeric, numeric, numeric, text, text, numeric, numeric, text, text, jsonb) to authenticated;
grant execute on function public.delete_foliar_fertilization_record(uuid) to authenticated;
grant execute on function public.restore_foliar_fertilization_record(uuid, text) to authenticated;

alter table public.foliar_fertilization_records enable row level security;
alter table public.foliar_fertilization_components enable row level security;

drop policy if exists "foliar fertilizations read" on public.foliar_fertilization_records;
create policy "foliar fertilizations read" on public.foliar_fertilization_records
  for select using (public.can_access_property(property_id));

drop policy if exists "foliar fertilizations insert blocked" on public.foliar_fertilization_records;
create policy "foliar fertilizations insert blocked" on public.foliar_fertilization_records
  for insert with check (false);

drop policy if exists "foliar fertilizations update blocked" on public.foliar_fertilization_records;
create policy "foliar fertilizations update blocked" on public.foliar_fertilization_records
  for update using (false) with check (false);

drop policy if exists "foliar fertilizations delete blocked" on public.foliar_fertilization_records;
create policy "foliar fertilizations delete blocked" on public.foliar_fertilization_records
  for delete using (false);

drop policy if exists "foliar components read" on public.foliar_fertilization_components;
create policy "foliar components read" on public.foliar_fertilization_components
  for select using (
    exists (
      select 1 from public.foliar_fertilization_records r
      where r.id = foliar_fertilization_id
        and public.can_access_property(r.property_id)
    )
  );

drop policy if exists "foliar components insert blocked" on public.foliar_fertilization_components;
create policy "foliar components insert blocked" on public.foliar_fertilization_components
  for insert with check (false);

drop policy if exists "foliar components update blocked" on public.foliar_fertilization_components;
create policy "foliar components update blocked" on public.foliar_fertilization_components
  for update using (false) with check (false);

drop policy if exists "foliar components delete blocked" on public.foliar_fertilization_components;
create policy "foliar components delete blocked" on public.foliar_fertilization_components
  for delete using (false);
