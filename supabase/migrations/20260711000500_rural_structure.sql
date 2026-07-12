alter table public.profiles add column last_season_id uuid;
alter table public.properties
  add column internal_code text,
  add column productive_area_ha numeric(12,4) check (productive_area_ha is null or productive_area_ha >= 0),
  add column preserved_area_ha numeric(12,4) check (preserved_area_ha is null or preserved_area_ha >= 0),
  add column infrastructure_area_ha numeric(12,4) check (infrastructure_area_ha is null or infrastructure_area_ha >= 0),
  add column rural_registration text,
  add column average_altitude_m numeric(8,2),
  add column water_source text,
  add column notes text,
  add column closed_at timestamptz;
alter table public.plots add column closed_at timestamptz;
alter table public.plantings alter column cultivar_id drop not null;
alter table public.plantings add column cultivation_system text, add column seedling_origin text;

create table public.plot_versions (
  id uuid primary key default gen_random_uuid(), plot_id uuid not null references public.plots(id) on delete restrict,
  name text not null, area_ha numeric(12,4) not null check (area_ha > 0), status public.plot_status not null,
  valid_from timestamptz not null default now(), valid_to timestamptz, changed_by uuid not null references public.profiles(id),
  check (valid_to is null or valid_to > valid_from)
);
create unique index one_current_plot_version on public.plot_versions(plot_id) where valid_to is null;

create table public.planting_seasons (
  id uuid primary key default gen_random_uuid(), planting_id uuid not null references public.plantings(id) on delete restrict,
  season_id uuid not null references public.harvest_seasons(id) on delete restrict,
  conducted_area_ha numeric(12,4) not null check (conducted_area_ha > 0), productive_status text not null default 'forming' check (productive_status in ('forming','productive','renewing')),
  production_goal_kg numeric(14,3) check (production_goal_kg is null or production_goal_kg >= 0),
  production_estimate_kg numeric(14,3) check (production_estimate_kg is null or production_estimate_kg >= 0),
  technical_responsible_user_id uuid references public.profiles(id), notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(planting_id, season_id)
);
alter table public.profiles add constraint profiles_last_season_fkey foreign key(last_season_id) references public.harvest_seasons(id) on delete set null;

create or replace function public.audit_structure(target_account_id uuid, target_table text, target_record uuid, target_action text, target_old jsonb, target_new jsonb)
returns void language sql security definer set search_path='' as $$
 insert into public.audit_log(account_id,table_name,record_id,action,old_data,new_data,actor_user_id)
 values(target_account_id,target_table,target_record,target_action,target_old,target_new,auth.uid());
$$;

create or replace function public.create_plot(target_property_id uuid, target_name text, target_area_ha numeric, target_status public.plot_status default 'active')
returns uuid language plpgsql security definer set search_path='' as $$ declare new_id uuid; account_id uuid; begin
 if not public.can_write_property(target_property_id) then raise exception 'permission_denied'; end if;
 if target_area_ha <= 0 then raise exception 'invalid_plot_area'; end if;
 select p.account_id into account_id from public.properties p where p.id=target_property_id and p.active;
 insert into public.plots(property_id,name,area_ha,status) values(target_property_id,trim(target_name),target_area_ha,target_status) returning id into new_id;
 insert into public.plot_versions(plot_id,name,area_ha,status,changed_by) values(new_id,trim(target_name),target_area_ha,target_status,auth.uid());
 perform public.audit_structure(account_id,'plots',new_id,'insert',null,jsonb_build_object('name',trim(target_name),'area_ha',target_area_ha,'status',target_status)); return new_id; end; $$;

create or replace function public.update_plot(target_plot_id uuid,target_name text,target_area_ha numeric,target_status public.plot_status)
returns void language plpgsql security definer set search_path='' as $$ declare old_plot public.plots%rowtype; account_id uuid; begin
 select * into old_plot from public.plots where id=target_plot_id for update; if old_plot.id is null then raise exception 'plot_not_found'; end if;
 if not public.can_write_property(old_plot.property_id) then raise exception 'permission_denied'; end if;
 if exists(select 1 from public.plantings where plot_id=target_plot_id and status<>'closed' and planted_area_ha>target_area_ha) then raise exception 'plot_area_below_active_planting'; end if;
 update public.plot_versions set valid_to=now() where plot_id=target_plot_id and valid_to is null;
 update public.plots set name=trim(target_name),area_ha=target_area_ha,status=target_status,closed_at=case when target_status='closed' then now() else null end where id=target_plot_id;
 insert into public.plot_versions(plot_id,name,area_ha,status,changed_by) values(target_plot_id,trim(target_name),target_area_ha,target_status,auth.uid());
 select account_id into account_id from public.properties where id=old_plot.property_id;
 perform public.audit_structure(account_id,'plots',target_plot_id,'update',to_jsonb(old_plot)-'boundary_geojson',jsonb_build_object('name',trim(target_name),'area_ha',target_area_ha,'status',target_status)); end; $$;

create or replace function public.create_planting(target_plot_id uuid,target_cultivar_id uuid,target_area_ha numeric,target_planted_on date,target_planted_year smallint,target_row_spacing numeric,target_plant_spacing numeric,target_estimated_plants integer,target_status public.planting_status,target_system text,target_origin text)
returns uuid language plpgsql security definer set search_path='' as $$ declare new_id uuid; plot_record public.plots%rowtype; begin
 select * into plot_record from public.plots where id=target_plot_id; if not public.can_write_property(plot_record.property_id) then raise exception 'permission_denied'; end if;
 if plot_record.status='closed' or target_area_ha>plot_record.area_ha then raise exception 'planting_area_exceeds_plot'; end if;
 if exists(select 1 from public.plantings where plot_id=target_plot_id and status<>'closed') then raise exception 'active_planting_exists'; end if;
 insert into public.plantings(plot_id,cultivar_id,planted_area_ha,planted_on,planted_year,spacing_between_rows_m,spacing_between_plants_m,estimated_plants,status,cultivation_system,seedling_origin)
 values(target_plot_id,target_cultivar_id,target_area_ha,target_planted_on,target_planted_year,target_row_spacing,target_plant_spacing,target_estimated_plants,target_status,target_system,target_origin) returning id into new_id; return new_id; end; $$;

create or replace function public.create_season(target_property_id uuid,target_name text,target_starts_on date,target_ends_on date,target_status public.season_status)
returns uuid language plpgsql security definer set search_path='' as $$ declare new_id uuid; begin if not public.can_write_property(target_property_id) then raise exception 'permission_denied'; end if;
 insert into public.harvest_seasons(property_id,name,starts_on,ends_on,status) values(target_property_id,trim(target_name),target_starts_on,target_ends_on,target_status) returning id into new_id; return new_id; end; $$;

create or replace function public.link_planting_season(target_planting_id uuid,target_season_id uuid,target_area_ha numeric,target_productive_status text,target_goal_kg numeric,target_estimate_kg numeric,target_notes text)
returns uuid language plpgsql security definer set search_path='' as $$ declare new_id uuid; property_id uuid; season_property uuid; season_status public.season_status; max_area numeric; begin
 select p.property_id,pl.planted_area_ha into property_id,max_area from public.plantings pl join public.plots p on p.id=pl.plot_id where pl.id=target_planting_id;
 select s.property_id,s.status into season_property,season_status from public.harvest_seasons s where s.id=target_season_id;
 if property_id is distinct from season_property or not public.can_write_property(property_id) then raise exception 'permission_denied'; end if;
 if season_status='closed' then raise exception 'season_closed'; end if; if target_area_ha>max_area then raise exception 'conducted_area_exceeds_planting'; end if;
 insert into public.planting_seasons(planting_id,season_id,conducted_area_ha,productive_status,production_goal_kg,production_estimate_kg,notes)
 values(target_planting_id,target_season_id,target_area_ha,target_productive_status,target_goal_kg,target_estimate_kg,target_notes) returning id into new_id; return new_id; end; $$;

alter table public.plot_versions enable row level security; alter table public.planting_seasons enable row level security;
create policy "plot versions read" on public.plot_versions for select using(public.can_access_property((select property_id from public.plots where id=plot_id)));
create policy "planting seasons read" on public.planting_seasons for select using(public.can_access_property((select p.property_id from public.plantings pl join public.plots p on p.id=pl.plot_id where pl.id=planting_id)));
grant execute on function public.create_plot(uuid,text,numeric,public.plot_status) to authenticated;
grant execute on function public.update_plot(uuid,text,numeric,public.plot_status) to authenticated;
grant execute on function public.create_planting(uuid,uuid,numeric,date,smallint,numeric,numeric,integer,public.planting_status,text,text) to authenticated;
grant execute on function public.create_season(uuid,text,date,date,public.season_status) to authenticated;
grant execute on function public.link_planting_season(uuid,uuid,numeric,text,numeric,numeric,text) to authenticated;
