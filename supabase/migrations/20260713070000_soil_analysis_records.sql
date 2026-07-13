create table if not exists public.soil_analysis_records (
  id uuid primary key default gen_random_uuid(),
  operational_record_id uuid not null unique references public.operational_records(id) on delete restrict,
  property_id uuid not null references public.properties(id) on delete restrict,
  plot_id uuid not null references public.plots(id) on delete restrict,
  planting_id uuid references public.plantings(id) on delete restrict,
  season_id uuid references public.harvest_seasons(id) on delete restrict,
  collected_on date not null,
  depth_cm text not null check (length(btrim(depth_cm)) between 1 and 40),
  laboratory_name text,
  report_number text,
  ph_water numeric(8,3) check (ph_water is null or ph_water between 0 and 14),
  ph_cacl2 numeric(8,3) check (ph_cacl2 is null or ph_cacl2 between 0 and 14),
  ph_kcl numeric(8,3) check (ph_kcl is null or ph_kcl between 0 and 14),
  p_mg_dm3 numeric(12,4) check (p_mg_dm3 is null or p_mg_dm3 >= 0),
  k_mg_dm3 numeric(12,4) check (k_mg_dm3 is null or k_mg_dm3 >= 0),
  ca_cmolc_dm3 numeric(12,4) check (ca_cmolc_dm3 is null or ca_cmolc_dm3 >= 0),
  mg_cmolc_dm3 numeric(12,4) check (mg_cmolc_dm3 is null or mg_cmolc_dm3 >= 0),
  al_cmolc_dm3 numeric(12,4) check (al_cmolc_dm3 is null or al_cmolc_dm3 >= 0),
  h_al_cmolc_dm3 numeric(12,4) check (h_al_cmolc_dm3 is null or h_al_cmolc_dm3 >= 0),
  c_org_pct numeric(8,3) check (c_org_pct is null or c_org_pct >= 0),
  sb_cmolc_dm3 numeric(12,4) check (sb_cmolc_dm3 is null or sb_cmolc_dm3 >= 0),
  effective_ctc_cmolc_dm3 numeric(12,4) check (effective_ctc_cmolc_dm3 is null or effective_ctc_cmolc_dm3 >= 0),
  ctc_ph7_cmolc_dm3 numeric(12,4) check (ctc_ph7_cmolc_dm3 is null or ctc_ph7_cmolc_dm3 >= 0),
  base_saturation_pct numeric(8,3) check (base_saturation_pct is null or base_saturation_pct between 0 and 100),
  aluminum_saturation_pct numeric(8,3) check (aluminum_saturation_pct is null or aluminum_saturation_pct between 0 and 100),
  organic_matter_dag_kg numeric(8,3) check (organic_matter_dag_kg is null or organic_matter_dag_kg >= 0),
  b_mg_dm3 numeric(12,4) check (b_mg_dm3 is null or b_mg_dm3 >= 0),
  zn_mg_dm3 numeric(12,4) check (zn_mg_dm3 is null or zn_mg_dm3 >= 0),
  cu_mg_dm3 numeric(12,4) check (cu_mg_dm3 is null or cu_mg_dm3 >= 0),
  fe_mg_dm3 numeric(12,4) check (fe_mg_dm3 is null or fe_mg_dm3 >= 0),
  mn_mg_dm3 numeric(12,4) check (mn_mg_dm3 is null or mn_mg_dm3 >= 0),
  s_mg_dm3 numeric(12,4) check (s_mg_dm3 is null or s_mg_dm3 >= 0),
  p_rem_mg_l numeric(12,4) check (p_rem_mg_l is null or p_rem_mg_l >= 0),
  sand_pct numeric(8,3) check (sand_pct is null or sand_pct between 0 and 100),
  silt_pct numeric(8,3) check (silt_pct is null or silt_pct between 0 and 100),
  clay_pct numeric(8,3) check (clay_pct is null or clay_pct between 0 and 100),
  notes text,
  import_status text not null default 'manual' check (import_status in ('manual','awaiting_import','review_required','confirmed')),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists soil_analysis_property_date_idx on public.soil_analysis_records(property_id, collected_on desc);
create index if not exists soil_analysis_plot_idx on public.soil_analysis_records(plot_id);
create index if not exists soil_analysis_season_idx on public.soil_analysis_records(season_id);

drop trigger if exists touch_soil_analysis_records on public.soil_analysis_records;
create trigger touch_soil_analysis_records
before update on public.soil_analysis_records
for each row execute procedure public.touch_updated_at();

insert into public.operation_types (code, label, description, default_unit, category)
values ('analise_solo', 'Análise de solo', 'Ficha de controle de análises de solo por talhão', null, 'solo')
on conflict (code)
do update set
  label = excluded.label,
  description = excluded.description,
  default_unit = excluded.default_unit,
  category = excluded.category,
  active = true,
  updated_at = now();

create or replace function public.assert_soil_analysis_context(
  target_property_id uuid,
  target_plot_id uuid,
  target_planting_id uuid,
  target_season_id uuid,
  target_collected_on date,
  target_depth_cm text
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
  if target_plot_id is null then raise exception 'soil_analysis_context_mismatch'; end if;
  if target_collected_on is null then raise exception 'occurred_at_required'; end if;
  if target_collected_on > current_date + 1 then raise exception 'occurred_at_invalid'; end if;
  if target_depth_cm is null or btrim(target_depth_cm) = '' then raise exception 'soil_analysis_invalid_depth'; end if;

  select property_id, status into plot_property, plot_status from public.plots where id = target_plot_id;
  if plot_property is null or plot_property <> target_property_id then raise exception 'soil_analysis_context_mismatch'; end if;
  if plot_status = 'closed' then raise exception 'soil_analysis_context_mismatch'; end if;

  if target_planting_id is not null then
    select p.property_id, pl.plot_id into planting_property, planting_plot
    from public.plantings pl
    join public.plots p on p.id = pl.plot_id
    where pl.id = target_planting_id;
    if planting_property is null or planting_property <> target_property_id or planting_plot <> target_plot_id then
      raise exception 'soil_analysis_context_mismatch';
    end if;
  end if;

  if target_season_id is not null then
    select property_id, status into season_property, season_state from public.harvest_seasons where id = target_season_id;
    if season_property is null or season_property <> target_property_id then raise exception 'soil_analysis_context_mismatch'; end if;
    if season_state = 'closed' then raise exception 'season_closed_record'; end if;
  end if;
end;
$$;

create or replace function public.validate_soil_analysis_parameters(
  target_ph_water numeric,
  target_ph_cacl2 numeric,
  target_ph_kcl numeric,
  target_base_saturation_pct numeric,
  target_aluminum_saturation_pct numeric,
  target_sand_pct numeric,
  target_silt_pct numeric,
  target_clay_pct numeric
) returns void
language plpgsql
immutable
set search_path = ''
as $$
begin
  if target_ph_water is not null and (target_ph_water < 0 or target_ph_water > 14) then raise exception 'soil_analysis_invalid_parameter'; end if;
  if target_ph_cacl2 is not null and (target_ph_cacl2 < 0 or target_ph_cacl2 > 14) then raise exception 'soil_analysis_invalid_parameter'; end if;
  if target_ph_kcl is not null and (target_ph_kcl < 0 or target_ph_kcl > 14) then raise exception 'soil_analysis_invalid_parameter'; end if;
  if target_base_saturation_pct is not null and (target_base_saturation_pct < 0 or target_base_saturation_pct > 100) then raise exception 'soil_analysis_invalid_parameter'; end if;
  if target_aluminum_saturation_pct is not null and (target_aluminum_saturation_pct < 0 or target_aluminum_saturation_pct > 100) then raise exception 'soil_analysis_invalid_parameter'; end if;
  if target_sand_pct is not null and (target_sand_pct < 0 or target_sand_pct > 100) then raise exception 'soil_analysis_invalid_parameter'; end if;
  if target_silt_pct is not null and (target_silt_pct < 0 or target_silt_pct > 100) then raise exception 'soil_analysis_invalid_parameter'; end if;
  if target_clay_pct is not null and (target_clay_pct < 0 or target_clay_pct > 100) then raise exception 'soil_analysis_invalid_parameter'; end if;
end;
$$;

create or replace function public.create_soil_analysis_record(
  target_property_id uuid,
  target_plot_id uuid,
  target_planting_id uuid,
  target_season_id uuid,
  target_collected_on date,
  target_depth_cm text,
  target_laboratory_name text default null,
  target_report_number text default null,
  target_parameters jsonb default '{}'::jsonb,
  target_notes text default null,
  target_import_status text default 'manual',
  target_client_id uuid default null
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  record_id uuid;
  analysis_id uuid;
  account_id uuid;
  params jsonb := coalesce(target_parameters, '{}'::jsonb);
  occurred_at_value timestamptz := (target_collected_on::timestamp + time '12:00')::timestamptz;
begin
  perform public.assert_soil_analysis_context(target_property_id, target_plot_id, target_planting_id, target_season_id, target_collected_on, target_depth_cm);
  if target_import_status not in ('manual','awaiting_import','review_required','confirmed') then raise exception 'soil_analysis_invalid_parameter'; end if;
  perform public.validate_soil_analysis_parameters(
    nullif(params->>'ph_water','')::numeric,
    nullif(params->>'ph_cacl2','')::numeric,
    nullif(params->>'ph_kcl','')::numeric,
    nullif(params->>'base_saturation_pct','')::numeric,
    nullif(params->>'aluminum_saturation_pct','')::numeric,
    nullif(params->>'sand_pct','')::numeric,
    nullif(params->>'silt_pct','')::numeric,
    nullif(params->>'clay_pct','')::numeric
  );

  record_id := public.create_operational_record(
    target_property_id,
    'analise_solo',
    occurred_at_value,
    target_plot_id,
    target_planting_id,
    target_season_id,
    jsonb_strip_nulls(jsonb_build_object(
      'depth_cm', btrim(target_depth_cm),
      'laboratory_name', nullif(btrim(coalesce(target_laboratory_name, '')), ''),
      'report_number', nullif(btrim(coalesce(target_report_number, '')), ''),
      'import_status', target_import_status
    ) || params),
    target_notes,
    case when target_import_status = 'review_required' then 'review_required'::public.record_status else 'confirmed'::public.record_status end,
    'manual'::public.operation_origin,
    null::uuid,
    target_client_id
  );

  insert into public.soil_analysis_records(
    operational_record_id, property_id, plot_id, planting_id, season_id, collected_on, depth_cm,
    laboratory_name, report_number, ph_water, ph_cacl2, ph_kcl, p_mg_dm3, k_mg_dm3,
    ca_cmolc_dm3, mg_cmolc_dm3, al_cmolc_dm3, h_al_cmolc_dm3, c_org_pct, sb_cmolc_dm3,
    effective_ctc_cmolc_dm3, ctc_ph7_cmolc_dm3, base_saturation_pct, aluminum_saturation_pct,
    organic_matter_dag_kg, b_mg_dm3, zn_mg_dm3, cu_mg_dm3, fe_mg_dm3, mn_mg_dm3,
    s_mg_dm3, p_rem_mg_l, sand_pct, silt_pct, clay_pct, notes, import_status, created_by
  )
  values (
    record_id, target_property_id, target_plot_id, target_planting_id, target_season_id, target_collected_on, btrim(target_depth_cm),
    nullif(btrim(coalesce(target_laboratory_name, '')), ''), nullif(btrim(coalesce(target_report_number, '')), ''),
    nullif(params->>'ph_water','')::numeric, nullif(params->>'ph_cacl2','')::numeric, nullif(params->>'ph_kcl','')::numeric,
    nullif(params->>'p_mg_dm3','')::numeric, nullif(params->>'k_mg_dm3','')::numeric,
    nullif(params->>'ca_cmolc_dm3','')::numeric, nullif(params->>'mg_cmolc_dm3','')::numeric,
    nullif(params->>'al_cmolc_dm3','')::numeric, nullif(params->>'h_al_cmolc_dm3','')::numeric,
    nullif(params->>'c_org_pct','')::numeric, nullif(params->>'sb_cmolc_dm3','')::numeric,
    nullif(params->>'effective_ctc_cmolc_dm3','')::numeric, nullif(params->>'ctc_ph7_cmolc_dm3','')::numeric,
    nullif(params->>'base_saturation_pct','')::numeric, nullif(params->>'aluminum_saturation_pct','')::numeric,
    nullif(params->>'organic_matter_dag_kg','')::numeric, nullif(params->>'b_mg_dm3','')::numeric,
    nullif(params->>'zn_mg_dm3','')::numeric, nullif(params->>'cu_mg_dm3','')::numeric,
    nullif(params->>'fe_mg_dm3','')::numeric, nullif(params->>'mn_mg_dm3','')::numeric,
    nullif(params->>'s_mg_dm3','')::numeric, nullif(params->>'p_rem_mg_l','')::numeric,
    nullif(params->>'sand_pct','')::numeric, nullif(params->>'silt_pct','')::numeric, nullif(params->>'clay_pct','')::numeric,
    target_notes, target_import_status, auth.uid()
  )
  returning id into analysis_id;

  account_id := public.resolve_operational_record_account_id(target_property_id);
  perform public.audit_structure(account_id, 'soil_analysis_records', analysis_id, 'insert', null, jsonb_build_object('collected_on', target_collected_on, 'depth_cm', btrim(target_depth_cm)));
  return analysis_id;
end;
$$;

create or replace function public.update_soil_analysis_record(
  target_analysis_id uuid,
  target_plot_id uuid,
  target_planting_id uuid,
  target_season_id uuid,
  target_collected_on date,
  target_depth_cm text,
  target_laboratory_name text default null,
  target_report_number text default null,
  target_parameters jsonb default '{}'::jsonb,
  target_notes text default null,
  target_import_status text default 'manual'
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_record public.soil_analysis_records%rowtype;
  account_id uuid;
  params jsonb := coalesce(target_parameters, '{}'::jsonb);
  occurred_at_value timestamptz := (target_collected_on::timestamp + time '12:00')::timestamptz;
begin
  select * into current_record from public.soil_analysis_records where id = target_analysis_id for update;
  if current_record.id is null then raise exception 'soil_analysis_not_found'; end if;
  perform public.assert_soil_analysis_context(current_record.property_id, target_plot_id, target_planting_id, target_season_id, target_collected_on, target_depth_cm);
  if target_import_status not in ('manual','awaiting_import','review_required','confirmed') then raise exception 'soil_analysis_invalid_parameter'; end if;
  perform public.validate_soil_analysis_parameters(
    nullif(params->>'ph_water','')::numeric,
    nullif(params->>'ph_cacl2','')::numeric,
    nullif(params->>'ph_kcl','')::numeric,
    nullif(params->>'base_saturation_pct','')::numeric,
    nullif(params->>'aluminum_saturation_pct','')::numeric,
    nullif(params->>'sand_pct','')::numeric,
    nullif(params->>'silt_pct','')::numeric,
    nullif(params->>'clay_pct','')::numeric
  );

  perform public.update_operational_record(
    current_record.operational_record_id,
    'analise_solo',
    occurred_at_value,
    target_plot_id,
    target_planting_id,
    target_season_id,
    jsonb_strip_nulls(jsonb_build_object(
      'depth_cm', btrim(target_depth_cm),
      'laboratory_name', nullif(btrim(coalesce(target_laboratory_name, '')), ''),
      'report_number', nullif(btrim(coalesce(target_report_number, '')), ''),
      'import_status', target_import_status
    ) || params),
    target_notes,
    case when target_import_status = 'review_required' then 'review_required'::public.record_status else 'confirmed'::public.record_status end,
    null::uuid
  );

  update public.soil_analysis_records
  set plot_id = target_plot_id,
      planting_id = target_planting_id,
      season_id = target_season_id,
      collected_on = target_collected_on,
      depth_cm = btrim(target_depth_cm),
      laboratory_name = nullif(btrim(coalesce(target_laboratory_name, '')), ''),
      report_number = nullif(btrim(coalesce(target_report_number, '')), ''),
      ph_water = nullif(params->>'ph_water','')::numeric,
      ph_cacl2 = nullif(params->>'ph_cacl2','')::numeric,
      ph_kcl = nullif(params->>'ph_kcl','')::numeric,
      p_mg_dm3 = nullif(params->>'p_mg_dm3','')::numeric,
      k_mg_dm3 = nullif(params->>'k_mg_dm3','')::numeric,
      ca_cmolc_dm3 = nullif(params->>'ca_cmolc_dm3','')::numeric,
      mg_cmolc_dm3 = nullif(params->>'mg_cmolc_dm3','')::numeric,
      al_cmolc_dm3 = nullif(params->>'al_cmolc_dm3','')::numeric,
      h_al_cmolc_dm3 = nullif(params->>'h_al_cmolc_dm3','')::numeric,
      c_org_pct = nullif(params->>'c_org_pct','')::numeric,
      sb_cmolc_dm3 = nullif(params->>'sb_cmolc_dm3','')::numeric,
      effective_ctc_cmolc_dm3 = nullif(params->>'effective_ctc_cmolc_dm3','')::numeric,
      ctc_ph7_cmolc_dm3 = nullif(params->>'ctc_ph7_cmolc_dm3','')::numeric,
      base_saturation_pct = nullif(params->>'base_saturation_pct','')::numeric,
      aluminum_saturation_pct = nullif(params->>'aluminum_saturation_pct','')::numeric,
      organic_matter_dag_kg = nullif(params->>'organic_matter_dag_kg','')::numeric,
      b_mg_dm3 = nullif(params->>'b_mg_dm3','')::numeric,
      zn_mg_dm3 = nullif(params->>'zn_mg_dm3','')::numeric,
      cu_mg_dm3 = nullif(params->>'cu_mg_dm3','')::numeric,
      fe_mg_dm3 = nullif(params->>'fe_mg_dm3','')::numeric,
      mn_mg_dm3 = nullif(params->>'mn_mg_dm3','')::numeric,
      s_mg_dm3 = nullif(params->>'s_mg_dm3','')::numeric,
      p_rem_mg_l = nullif(params->>'p_rem_mg_l','')::numeric,
      sand_pct = nullif(params->>'sand_pct','')::numeric,
      silt_pct = nullif(params->>'silt_pct','')::numeric,
      clay_pct = nullif(params->>'clay_pct','')::numeric,
      notes = target_notes,
      import_status = target_import_status,
      updated_at = now()
  where id = target_analysis_id;

  account_id := public.resolve_operational_record_account_id(current_record.property_id);
  perform public.audit_structure(account_id, 'soil_analysis_records', target_analysis_id, 'update', to_jsonb(current_record), jsonb_build_object('collected_on', target_collected_on, 'depth_cm', btrim(target_depth_cm)));
end;
$$;

create or replace function public.delete_soil_analysis_record(target_analysis_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_record public.soil_analysis_records%rowtype;
  account_id uuid;
begin
  select * into current_record from public.soil_analysis_records where id = target_analysis_id for update;
  if current_record.id is null then raise exception 'soil_analysis_not_found'; end if;
  if not public.can_manage_operational_records(current_record.property_id) then raise exception 'permission_denied'; end if;
  perform public.delete_operational_record(current_record.operational_record_id);
  account_id := public.resolve_operational_record_account_id(current_record.property_id);
  perform public.audit_structure(account_id, 'soil_analysis_records', target_analysis_id, 'delete', null, jsonb_build_object('operational_record_id', current_record.operational_record_id));
end;
$$;

create or replace function public.restore_soil_analysis_record(target_analysis_id uuid, target_notes text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_record public.soil_analysis_records%rowtype;
  account_id uuid;
begin
  select * into current_record from public.soil_analysis_records where id = target_analysis_id for update;
  if current_record.id is null then raise exception 'soil_analysis_not_found'; end if;
  if not public.can_manage_operational_records(current_record.property_id) then raise exception 'permission_denied'; end if;
  perform public.restore_operational_record(current_record.operational_record_id, target_notes);
  account_id := public.resolve_operational_record_account_id(current_record.property_id);
  perform public.audit_structure(account_id, 'soil_analysis_records', target_analysis_id, 'restore', null, jsonb_build_object('operational_record_id', current_record.operational_record_id));
end;
$$;

create or replace function public.create_soil_analysis_attachment(
  target_analysis_id uuid,
  target_filename text,
  target_storage_path text,
  target_mime_type text,
  target_size_bytes bigint
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_record public.soil_analysis_records%rowtype;
  attachment_id uuid;
  account_id uuid;
begin
  select * into current_record from public.soil_analysis_records where id = target_analysis_id;
  if current_record.id is null then raise exception 'soil_analysis_not_found'; end if;
  if not public.can_manage_operational_records(current_record.property_id) then raise exception 'permission_denied'; end if;
  if target_filename is null or btrim(target_filename) = '' or target_storage_path is null or btrim(target_storage_path) = '' then
    raise exception 'soil_analysis_invalid_parameter';
  end if;
  insert into public.operation_record_attachments(operational_record_id, attachment_type, filename, storage_path, mime_type, size_bytes, uploader_id)
  values(current_record.operational_record_id, 'soil_analysis_report', btrim(target_filename), btrim(target_storage_path), btrim(target_mime_type), target_size_bytes, auth.uid())
  returning id into attachment_id;
  account_id := public.resolve_operational_record_account_id(current_record.property_id);
  perform public.audit_structure(account_id, 'operation_record_attachments', attachment_id, 'insert', null, jsonb_build_object('operational_record_id', current_record.operational_record_id, 'attachment_type', 'soil_analysis_report'));
  return attachment_id;
end;
$$;

grant execute on function public.create_soil_analysis_record(uuid, uuid, uuid, uuid, date, text, text, text, jsonb, text, text, uuid) to authenticated;
grant execute on function public.update_soil_analysis_record(uuid, uuid, uuid, uuid, date, text, text, text, jsonb, text, text) to authenticated;
grant execute on function public.delete_soil_analysis_record(uuid) to authenticated;
grant execute on function public.restore_soil_analysis_record(uuid, text) to authenticated;
grant execute on function public.create_soil_analysis_attachment(uuid, text, text, text, bigint) to authenticated;

alter table public.soil_analysis_records enable row level security;

drop policy if exists "soil analysis read" on public.soil_analysis_records;
create policy "soil analysis read" on public.soil_analysis_records
  for select using (public.can_access_property(property_id));

drop policy if exists "soil analysis insert blocked" on public.soil_analysis_records;
create policy "soil analysis insert blocked" on public.soil_analysis_records
  for insert with check (false);

drop policy if exists "soil analysis update blocked" on public.soil_analysis_records;
create policy "soil analysis update blocked" on public.soil_analysis_records
  for update using (false) with check (false);

drop policy if exists "soil analysis delete blocked" on public.soil_analysis_records;
create policy "soil analysis delete blocked" on public.soil_analysis_records
  for delete using (false);
