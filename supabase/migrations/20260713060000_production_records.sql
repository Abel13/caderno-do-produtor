create table if not exists public.production_records (
  id uuid primary key default gen_random_uuid(),
  operational_record_id uuid not null unique references public.operational_records(id) on delete restrict,
  property_id uuid not null references public.properties(id) on delete restrict,
  plot_id uuid not null references public.plots(id) on delete restrict,
  planting_id uuid references public.plantings(id) on delete restrict,
  season_id uuid not null references public.harvest_seasons(id) on delete restrict,
  harvested_on date not null,
  area_ha numeric(12,4) not null check (area_ha > 0),
  productivity_sc_ha numeric(14,4) not null check (productivity_sc_ha >= 0),
  total_sc numeric(14,4) not null check (total_sc >= 0),
  lot_code text,
  processing_method text,
  beverage_classification text,
  coffee_type text,
  picking_percentage numeric(5,2) check (picking_percentage is null or picking_percentage between 0 and 100),
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists production_records_property_date_idx on public.production_records(property_id, harvested_on desc);
create index if not exists production_records_plot_idx on public.production_records(plot_id);
create index if not exists production_records_season_idx on public.production_records(season_id);
create index if not exists production_records_planting_idx on public.production_records(planting_id);

drop trigger if exists touch_production_records on public.production_records;
create trigger touch_production_records
before update on public.production_records
for each row execute procedure public.touch_updated_at();

insert into public.operation_types (code, label, description, default_unit, category)
values ('producao', 'Produção', 'Ficha de controle e acompanhamento de produção por talhão e safra', 'sc', 'producao')
on conflict (code)
do update
set
  label = excluded.label,
  description = excluded.description,
  default_unit = excluded.default_unit,
  category = excluded.category,
  active = true,
  updated_at = now();

create or replace function public.assert_production_context(
  target_property_id uuid,
  target_plot_id uuid,
  target_planting_id uuid,
  target_season_id uuid,
  target_harvested_on date
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  plot_record public.plots%rowtype;
  planting_property_id uuid;
  planting_plot_id uuid;
  planting_status public.planting_status;
  season_record public.harvest_seasons%rowtype;
begin
  if target_property_id is null then
    raise exception 'record_property_required';
  end if;
  if not public.can_manage_operational_records(target_property_id) then
    raise exception 'permission_denied';
  end if;
  if target_plot_id is null then
    raise exception 'production_plot_required';
  end if;
  if target_season_id is null then
    raise exception 'production_season_required';
  end if;
  if target_harvested_on is null then
    raise exception 'occurred_at_required';
  end if;
  if target_harvested_on > current_date + 1 then
    raise exception 'occurred_at_invalid';
  end if;

  select * into plot_record from public.plots where id = target_plot_id;
  if plot_record.id is null or plot_record.property_id <> target_property_id then
    raise exception 'production_context_mismatch';
  end if;
  if plot_record.status in ('inactive', 'closed') then
    raise exception 'production_area_inactive';
  end if;

  select * into season_record from public.harvest_seasons where id = target_season_id;
  if season_record.id is null or season_record.property_id <> target_property_id then
    raise exception 'production_context_mismatch';
  end if;
  if season_record.status = 'closed' then
    raise exception 'season_closed_record';
  end if;

  if target_planting_id is not null then
    select p.property_id, pl.plot_id, pl.status
    into planting_property_id, planting_plot_id, planting_status
    from public.plantings pl
    join public.plots p on p.id = pl.plot_id
    where pl.id = target_planting_id;
    if planting_property_id is null or planting_property_id <> target_property_id or planting_plot_id <> target_plot_id then
      raise exception 'production_context_mismatch';
    end if;
    if planting_status = 'closed' then
      raise exception 'production_area_inactive';
    end if;
  end if;
end;
$$;

create or replace function public.validate_production_values(
  target_area_ha numeric,
  target_productivity_sc_ha numeric,
  target_total_sc numeric,
  target_picking_percentage numeric
) returns jsonb
language plpgsql
immutable
set search_path = ''
as $$
declare
  final_productivity numeric := target_productivity_sc_ha;
  final_total numeric := target_total_sc;
begin
  if target_area_ha is null or target_area_ha <= 0 then
    raise exception 'production_invalid_quantity';
  end if;
  if target_productivity_sc_ha is null and target_total_sc is null then
    raise exception 'production_invalid_quantity';
  end if;
  if target_productivity_sc_ha is not null and target_productivity_sc_ha < 0 then
    raise exception 'production_invalid_quantity';
  end if;
  if target_total_sc is not null and target_total_sc < 0 then
    raise exception 'production_invalid_quantity';
  end if;
  if target_picking_percentage is not null and (target_picking_percentage < 0 or target_picking_percentage > 100) then
    raise exception 'production_invalid_quantity';
  end if;

  if final_total is null then
    final_total := round((target_area_ha * target_productivity_sc_ha)::numeric, 4);
  end if;
  if final_productivity is null then
    final_productivity := round((target_total_sc / target_area_ha)::numeric, 4);
  end if;

  return jsonb_build_object('productivity_sc_ha', final_productivity, 'total_sc', final_total);
end;
$$;

create or replace function public.create_production_record(
  target_property_id uuid,
  target_plot_id uuid,
  target_planting_id uuid,
  target_season_id uuid,
  target_harvested_on date,
  target_area_ha numeric,
  target_productivity_sc_ha numeric,
  target_total_sc numeric,
  target_lot_code text default null,
  target_processing_method text default null,
  target_beverage_classification text default null,
  target_coffee_type text default null,
  target_picking_percentage numeric default null,
  target_notes text default null,
  target_client_id uuid default null
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  record_id uuid;
  production_id uuid;
  target_account_id uuid;
  values_json jsonb;
  final_productivity numeric;
  final_total numeric;
  target_occurred_at_value timestamptz := (target_harvested_on::timestamp + time '12:00')::timestamptz;
begin
  perform public.assert_production_context(target_property_id, target_plot_id, target_planting_id, target_season_id, target_harvested_on);
  values_json := public.validate_production_values(target_area_ha, target_productivity_sc_ha, target_total_sc, target_picking_percentage);
  final_productivity := (values_json->>'productivity_sc_ha')::numeric;
  final_total := (values_json->>'total_sc')::numeric;

  record_id := public.create_operational_record(
    target_property_id,
    'producao',
    target_occurred_at_value,
    target_plot_id,
    target_planting_id,
    target_season_id,
    jsonb_strip_nulls(jsonb_build_object(
      'value', final_total,
      'value_unit', 'sc',
      'area_ha', target_area_ha,
      'productivity_sc_ha', final_productivity,
      'lot_code', nullif(btrim(coalesce(target_lot_code, '')), '')
    )),
    target_notes,
    'confirmed'::public.record_status,
    'manual'::public.operation_origin,
    null::uuid,
    target_client_id
  );

  insert into public.production_records(
    operational_record_id, property_id, plot_id, planting_id, season_id, harvested_on, area_ha,
    productivity_sc_ha, total_sc, lot_code, processing_method, beverage_classification, coffee_type,
    picking_percentage, notes, created_by
  )
  values (
    record_id, target_property_id, target_plot_id, target_planting_id, target_season_id, target_harvested_on, target_area_ha,
    final_productivity, final_total, nullif(btrim(coalesce(target_lot_code, '')), ''),
    nullif(btrim(coalesce(target_processing_method, '')), ''),
    nullif(btrim(coalesce(target_beverage_classification, '')), ''),
    nullif(btrim(coalesce(target_coffee_type, '')), ''),
    target_picking_percentage, target_notes, auth.uid()
  )
  on conflict (operational_record_id)
  do update set
    plot_id = excluded.plot_id,
    planting_id = excluded.planting_id,
    season_id = excluded.season_id,
    harvested_on = excluded.harvested_on,
    area_ha = excluded.area_ha,
    productivity_sc_ha = excluded.productivity_sc_ha,
    total_sc = excluded.total_sc,
    lot_code = excluded.lot_code,
    processing_method = excluded.processing_method,
    beverage_classification = excluded.beverage_classification,
    coffee_type = excluded.coffee_type,
    picking_percentage = excluded.picking_percentage,
    notes = excluded.notes,
    updated_at = now()
  returning id into production_id;

  target_account_id := public.resolve_operational_record_account_id(target_property_id);
  perform public.audit_structure(target_account_id, 'production_records', production_id, 'insert', null, jsonb_build_object('harvested_on', target_harvested_on, 'total_sc', final_total));
  return production_id;
end;
$$;

create or replace function public.update_production_record(
  target_production_id uuid,
  target_plot_id uuid,
  target_planting_id uuid,
  target_season_id uuid,
  target_harvested_on date,
  target_area_ha numeric,
  target_productivity_sc_ha numeric,
  target_total_sc numeric,
  target_lot_code text default null,
  target_processing_method text default null,
  target_beverage_classification text default null,
  target_coffee_type text default null,
  target_picking_percentage numeric default null,
  target_notes text default null
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_record public.production_records%rowtype;
  target_account_id uuid;
  values_json jsonb;
  final_productivity numeric;
  final_total numeric;
  target_occurred_at_value timestamptz := (target_harvested_on::timestamp + time '12:00')::timestamptz;
begin
  select * into current_record from public.production_records where id = target_production_id for update;
  if current_record.id is null then
    raise exception 'production_record_not_found';
  end if;

  perform public.assert_production_context(current_record.property_id, target_plot_id, target_planting_id, target_season_id, target_harvested_on);
  values_json := public.validate_production_values(target_area_ha, target_productivity_sc_ha, target_total_sc, target_picking_percentage);
  final_productivity := (values_json->>'productivity_sc_ha')::numeric;
  final_total := (values_json->>'total_sc')::numeric;

  perform public.update_operational_record(
    current_record.operational_record_id,
    'producao',
    target_occurred_at_value,
    target_plot_id,
    target_planting_id,
    target_season_id,
    jsonb_strip_nulls(jsonb_build_object(
      'value', final_total,
      'value_unit', 'sc',
      'area_ha', target_area_ha,
      'productivity_sc_ha', final_productivity,
      'lot_code', nullif(btrim(coalesce(target_lot_code, '')), '')
    )),
    target_notes,
    'confirmed'::public.record_status,
    null::uuid
  );

  update public.production_records
  set plot_id = target_plot_id,
      planting_id = target_planting_id,
      season_id = target_season_id,
      harvested_on = target_harvested_on,
      area_ha = target_area_ha,
      productivity_sc_ha = final_productivity,
      total_sc = final_total,
      lot_code = nullif(btrim(coalesce(target_lot_code, '')), ''),
      processing_method = nullif(btrim(coalesce(target_processing_method, '')), ''),
      beverage_classification = nullif(btrim(coalesce(target_beverage_classification, '')), ''),
      coffee_type = nullif(btrim(coalesce(target_coffee_type, '')), ''),
      picking_percentage = target_picking_percentage,
      notes = target_notes,
      updated_at = now()
  where id = target_production_id;

  target_account_id := public.resolve_operational_record_account_id(current_record.property_id);
  perform public.audit_structure(target_account_id, 'production_records', target_production_id, 'update', to_jsonb(current_record), jsonb_build_object('harvested_on', target_harvested_on, 'total_sc', final_total));
end;
$$;

create or replace function public.delete_production_record(target_production_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_record public.production_records%rowtype;
  target_account_id uuid;
begin
  select * into current_record from public.production_records where id = target_production_id for update;
  if current_record.id is null then
    raise exception 'production_record_not_found';
  end if;
  if not public.can_manage_operational_records(current_record.property_id) then
    raise exception 'permission_denied';
  end if;
  perform public.delete_operational_record(current_record.operational_record_id);
  target_account_id := public.resolve_operational_record_account_id(current_record.property_id);
  perform public.audit_structure(target_account_id, 'production_records', target_production_id, 'delete', null, jsonb_build_object('operational_record_id', current_record.operational_record_id));
end;
$$;

create or replace function public.restore_production_record(target_production_id uuid, target_notes text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_record public.production_records%rowtype;
  target_account_id uuid;
begin
  select * into current_record from public.production_records where id = target_production_id for update;
  if current_record.id is null then
    raise exception 'production_record_not_found';
  end if;
  if not public.can_manage_operational_records(current_record.property_id) then
    raise exception 'permission_denied';
  end if;
  perform public.restore_operational_record(current_record.operational_record_id, target_notes);
  target_account_id := public.resolve_operational_record_account_id(current_record.property_id);
  perform public.audit_structure(target_account_id, 'production_records', target_production_id, 'restore', null, jsonb_build_object('operational_record_id', current_record.operational_record_id));
end;
$$;

grant execute on function public.create_production_record(uuid, uuid, uuid, uuid, date, numeric, numeric, numeric, text, text, text, text, numeric, text, uuid) to authenticated;
grant execute on function public.update_production_record(uuid, uuid, uuid, uuid, date, numeric, numeric, numeric, text, text, text, text, numeric, text) to authenticated;
grant execute on function public.delete_production_record(uuid) to authenticated;
grant execute on function public.restore_production_record(uuid, text) to authenticated;

alter table public.production_records enable row level security;

drop policy if exists "production records read" on public.production_records;
create policy "production records read" on public.production_records
  for select using (public.can_access_property(property_id));

drop policy if exists "production records insert blocked" on public.production_records;
create policy "production records insert blocked" on public.production_records
  for insert with check (false);

drop policy if exists "production records update blocked" on public.production_records;
create policy "production records update blocked" on public.production_records
  for update using (false) with check (false);

drop policy if exists "production records delete blocked" on public.production_records;
create policy "production records delete blocked" on public.production_records
  for delete using (false);
