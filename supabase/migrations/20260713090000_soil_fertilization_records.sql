create table if not exists public.soil_fertilization_records (
  id uuid primary key default gen_random_uuid(),
  operational_record_id uuid not null unique references public.operational_records(id) on delete restrict,
  property_id uuid not null references public.properties(id) on delete restrict,
  plot_id uuid not null references public.plots(id) on delete restrict,
  planting_id uuid references public.plantings(id) on delete restrict,
  season_id uuid references public.harvest_seasons(id) on delete restrict,
  soil_analysis_id uuid references public.soil_analysis_records(id) on delete restrict,
  applied_on date not null,
  fertilizer_name text not null check (length(btrim(fertilizer_name)) between 1 and 120),
  dose_kg_ha numeric(12,4) check (dose_kg_ha is null or dose_kg_ha >= 0),
  total_quantity_kg numeric(12,3) not null check (total_quantity_kg >= 0),
  coverage_label text,
  labor_type text check (labor_type is null or labor_type in ('hh','hm')),
  labor_quantity numeric(12,2) check (labor_quantity is null or labor_quantity >= 0),
  fuel_l numeric(12,2) check (fuel_l is null or fuel_l >= 0),
  responsible_name text,
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists soil_fertilizations_property_date_idx on public.soil_fertilization_records(property_id, applied_on desc);
create index if not exists soil_fertilizations_plot_idx on public.soil_fertilization_records(plot_id);
create index if not exists soil_fertilizations_season_idx on public.soil_fertilization_records(season_id);
create index if not exists soil_fertilizations_analysis_idx on public.soil_fertilization_records(soil_analysis_id);
create index if not exists soil_fertilizations_fertilizer_name_idx on public.soil_fertilization_records(property_id, fertilizer_name);

drop trigger if exists touch_soil_fertilization_records on public.soil_fertilization_records;
create trigger touch_soil_fertilization_records
before update on public.soil_fertilization_records
for each row execute procedure public.touch_updated_at();

insert into public.operation_types (code, label, description, default_unit, category)
values ('adubacao_solo', 'Adubação via solo', 'Ficha de controle de adubação via solo por talhão', 'kg', 'solo')
on conflict (code)
do update set
  label = excluded.label,
  description = excluded.description,
  default_unit = excluded.default_unit,
  category = excluded.category,
  active = true,
  updated_at = now();

create or replace function public.assert_soil_fertilization_context(
  target_property_id uuid,
  target_plot_id uuid,
  target_planting_id uuid,
  target_season_id uuid,
  target_soil_analysis_id uuid,
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
  analysis_property uuid;
  analysis_plot uuid;
begin
  if target_property_id is null then raise exception 'record_property_required'; end if;
  if not public.can_manage_operational_records(target_property_id) then raise exception 'permission_denied'; end if;
  if target_plot_id is null then raise exception 'soil_fertilization_context_mismatch'; end if;
  if target_applied_on is null then raise exception 'occurred_at_required'; end if;
  if target_applied_on > current_date + 1 then raise exception 'occurred_at_invalid'; end if;

  select property_id, status into plot_property, plot_status from public.plots where id = target_plot_id;
  if plot_property is null or plot_property <> target_property_id then raise exception 'soil_fertilization_context_mismatch'; end if;
  if plot_status = 'closed' then raise exception 'soil_fertilization_context_mismatch'; end if;

  if target_planting_id is not null then
    select p.property_id, pl.plot_id into planting_property, planting_plot
    from public.plantings pl
    join public.plots p on p.id = pl.plot_id
    where pl.id = target_planting_id;
    if planting_property is null or planting_property <> target_property_id or planting_plot <> target_plot_id then
      raise exception 'soil_fertilization_context_mismatch';
    end if;
  end if;

  if target_season_id is not null then
    select property_id, status into season_property, season_state from public.harvest_seasons where id = target_season_id;
    if season_property is null or season_property <> target_property_id then raise exception 'soil_fertilization_context_mismatch'; end if;
    if season_state = 'closed' then raise exception 'season_closed_record'; end if;
  end if;

  if target_soil_analysis_id is not null then
    select property_id, plot_id into analysis_property, analysis_plot from public.soil_analysis_records where id = target_soil_analysis_id;
    if analysis_property is null or analysis_property <> target_property_id or analysis_plot <> target_plot_id then
      raise exception 'soil_fertilization_context_mismatch';
    end if;
  end if;
end;
$$;

create or replace function public.validate_soil_fertilization_values(
  target_fertilizer_name text,
  target_dose_kg_ha numeric,
  target_total_quantity_kg numeric,
  target_labor_type text,
  target_labor_quantity numeric,
  target_fuel_l numeric
) returns void
language plpgsql
immutable
set search_path = ''
as $$
begin
  if target_fertilizer_name is null or btrim(target_fertilizer_name) = '' then raise exception 'soil_fertilization_invalid_quantity'; end if;
  if target_dose_kg_ha is not null and target_dose_kg_ha < 0 then raise exception 'soil_fertilization_invalid_quantity'; end if;
  if target_total_quantity_kg is null or target_total_quantity_kg < 0 then raise exception 'soil_fertilization_invalid_quantity'; end if;
  if target_labor_type is not null and target_labor_type not in ('hh','hm') then raise exception 'soil_fertilization_invalid_quantity'; end if;
  if target_labor_quantity is not null and target_labor_quantity < 0 then raise exception 'soil_fertilization_invalid_quantity'; end if;
  if target_fuel_l is not null and target_fuel_l < 0 then raise exception 'soil_fertilization_invalid_quantity'; end if;
end;
$$;

create or replace function public.create_soil_fertilization_record(
  target_property_id uuid,
  target_plot_id uuid,
  target_planting_id uuid,
  target_season_id uuid,
  target_soil_analysis_id uuid,
  target_applied_on date,
  target_fertilizer_name text,
  target_dose_kg_ha numeric default null,
  target_total_quantity_kg numeric default null,
  target_coverage_label text default null,
  target_labor_type text default null,
  target_labor_quantity numeric default null,
  target_fuel_l numeric default null,
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
  fertilization_id uuid;
  account_id uuid;
  occurred_at_value timestamptz := (target_applied_on::timestamp + time '12:00')::timestamptz;
begin
  perform public.assert_soil_fertilization_context(target_property_id, target_plot_id, target_planting_id, target_season_id, target_soil_analysis_id, target_applied_on);
  perform public.validate_soil_fertilization_values(target_fertilizer_name, target_dose_kg_ha, target_total_quantity_kg, target_labor_type, target_labor_quantity, target_fuel_l);

  record_id := public.create_operational_record(
    target_property_id,
    'adubacao_solo',
    occurred_at_value,
    target_plot_id,
    target_planting_id,
    target_season_id,
    jsonb_strip_nulls(jsonb_build_object(
      'value', target_total_quantity_kg,
      'value_unit', 'kg',
      'fertilizer_name', btrim(target_fertilizer_name),
      'dose_kg_ha', target_dose_kg_ha,
      'coverage_label', nullif(btrim(coalesce(target_coverage_label, '')), ''),
      'soil_analysis_id', target_soil_analysis_id
    )),
    target_notes,
    'confirmed'::public.record_status,
    'manual'::public.operation_origin,
    null::uuid,
    target_client_id
  );

  insert into public.soil_fertilization_records(
    operational_record_id, property_id, plot_id, planting_id, season_id, soil_analysis_id,
    applied_on, fertilizer_name, dose_kg_ha, total_quantity_kg, coverage_label,
    labor_type, labor_quantity, fuel_l, responsible_name, notes, created_by
  )
  values (
    record_id, target_property_id, target_plot_id, target_planting_id, target_season_id, target_soil_analysis_id,
    target_applied_on, btrim(target_fertilizer_name), target_dose_kg_ha, target_total_quantity_kg, nullif(btrim(coalesce(target_coverage_label, '')), ''),
    nullif(target_labor_type, ''), target_labor_quantity, target_fuel_l, nullif(btrim(coalesce(target_responsible_name, '')), ''), target_notes, auth.uid()
  )
  returning id into fertilization_id;

  account_id := public.resolve_operational_record_account_id(target_property_id);
  perform public.audit_structure(account_id, 'soil_fertilization_records', fertilization_id, 'insert', null, jsonb_build_object('applied_on', target_applied_on, 'fertilizer_name', btrim(target_fertilizer_name)));
  return fertilization_id;
end;
$$;

create or replace function public.update_soil_fertilization_record(
  target_fertilization_id uuid,
  target_plot_id uuid,
  target_planting_id uuid,
  target_season_id uuid,
  target_soil_analysis_id uuid,
  target_applied_on date,
  target_fertilizer_name text,
  target_dose_kg_ha numeric default null,
  target_total_quantity_kg numeric default null,
  target_coverage_label text default null,
  target_labor_type text default null,
  target_labor_quantity numeric default null,
  target_fuel_l numeric default null,
  target_responsible_name text default null,
  target_notes text default null
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_record public.soil_fertilization_records%rowtype;
  account_id uuid;
  occurred_at_value timestamptz := (target_applied_on::timestamp + time '12:00')::timestamptz;
begin
  select * into current_record from public.soil_fertilization_records where id = target_fertilization_id for update;
  if current_record.id is null then raise exception 'soil_fertilization_not_found'; end if;
  perform public.assert_soil_fertilization_context(current_record.property_id, target_plot_id, target_planting_id, target_season_id, target_soil_analysis_id, target_applied_on);
  perform public.validate_soil_fertilization_values(target_fertilizer_name, target_dose_kg_ha, target_total_quantity_kg, target_labor_type, target_labor_quantity, target_fuel_l);

  perform public.update_operational_record(
    current_record.operational_record_id,
    'adubacao_solo',
    occurred_at_value,
    target_plot_id,
    target_planting_id,
    target_season_id,
    jsonb_strip_nulls(jsonb_build_object(
      'value', target_total_quantity_kg,
      'value_unit', 'kg',
      'fertilizer_name', btrim(target_fertilizer_name),
      'dose_kg_ha', target_dose_kg_ha,
      'coverage_label', nullif(btrim(coalesce(target_coverage_label, '')), ''),
      'soil_analysis_id', target_soil_analysis_id
    )),
    target_notes,
    'confirmed'::public.record_status,
    null::uuid
  );

  update public.soil_fertilization_records
  set plot_id = target_plot_id,
      planting_id = target_planting_id,
      season_id = target_season_id,
      soil_analysis_id = target_soil_analysis_id,
      applied_on = target_applied_on,
      fertilizer_name = btrim(target_fertilizer_name),
      dose_kg_ha = target_dose_kg_ha,
      total_quantity_kg = target_total_quantity_kg,
      coverage_label = nullif(btrim(coalesce(target_coverage_label, '')), ''),
      labor_type = nullif(target_labor_type, ''),
      labor_quantity = target_labor_quantity,
      fuel_l = target_fuel_l,
      responsible_name = nullif(btrim(coalesce(target_responsible_name, '')), ''),
      notes = target_notes,
      updated_at = now()
  where id = target_fertilization_id;

  account_id := public.resolve_operational_record_account_id(current_record.property_id);
  perform public.audit_structure(account_id, 'soil_fertilization_records', target_fertilization_id, 'update', to_jsonb(current_record), jsonb_build_object('applied_on', target_applied_on, 'fertilizer_name', btrim(target_fertilizer_name)));
end;
$$;

create or replace function public.delete_soil_fertilization_record(target_fertilization_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_record public.soil_fertilization_records%rowtype;
  account_id uuid;
begin
  select * into current_record from public.soil_fertilization_records where id = target_fertilization_id for update;
  if current_record.id is null then raise exception 'soil_fertilization_not_found'; end if;
  if not public.can_manage_operational_records(current_record.property_id) then raise exception 'permission_denied'; end if;
  perform public.delete_operational_record(current_record.operational_record_id);
  account_id := public.resolve_operational_record_account_id(current_record.property_id);
  perform public.audit_structure(account_id, 'soil_fertilization_records', target_fertilization_id, 'delete', null, jsonb_build_object('operational_record_id', current_record.operational_record_id));
end;
$$;

create or replace function public.restore_soil_fertilization_record(target_fertilization_id uuid, target_notes text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_record public.soil_fertilization_records%rowtype;
  account_id uuid;
begin
  select * into current_record from public.soil_fertilization_records where id = target_fertilization_id for update;
  if current_record.id is null then raise exception 'soil_fertilization_not_found'; end if;
  if not public.can_manage_operational_records(current_record.property_id) then raise exception 'permission_denied'; end if;
  perform public.restore_operational_record(current_record.operational_record_id, target_notes);
  account_id := public.resolve_operational_record_account_id(current_record.property_id);
  perform public.audit_structure(account_id, 'soil_fertilization_records', target_fertilization_id, 'restore', null, jsonb_build_object('operational_record_id', current_record.operational_record_id));
end;
$$;

grant execute on function public.create_soil_fertilization_record(uuid, uuid, uuid, uuid, uuid, date, text, numeric, numeric, text, text, numeric, numeric, text, text, uuid) to authenticated;
grant execute on function public.update_soil_fertilization_record(uuid, uuid, uuid, uuid, uuid, date, text, numeric, numeric, text, text, numeric, numeric, text, text) to authenticated;
grant execute on function public.delete_soil_fertilization_record(uuid) to authenticated;
grant execute on function public.restore_soil_fertilization_record(uuid, text) to authenticated;

alter table public.soil_fertilization_records enable row level security;

drop policy if exists "soil fertilizations read" on public.soil_fertilization_records;
create policy "soil fertilizations read" on public.soil_fertilization_records
  for select using (public.can_access_property(property_id));

drop policy if exists "soil fertilizations insert blocked" on public.soil_fertilization_records;
create policy "soil fertilizations insert blocked" on public.soil_fertilization_records
  for insert with check (false);

drop policy if exists "soil fertilizations update blocked" on public.soil_fertilization_records;
create policy "soil fertilizations update blocked" on public.soil_fertilization_records
  for update using (false) with check (false);

drop policy if exists "soil fertilizations delete blocked" on public.soil_fertilization_records;
create policy "soil fertilizations delete blocked" on public.soil_fertilization_records
  for delete using (false);
