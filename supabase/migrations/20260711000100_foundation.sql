create extension if not exists pgcrypto;

create type public.account_role as enum ('owner', 'producer', 'manager', 'technician', 'collaborator', 'viewer');
create type public.membership_status as enum ('invited', 'active', 'revoked');
create type public.plot_status as enum ('active', 'forming', 'inactive', 'closed');
create type public.planting_status as enum ('forming', 'productive', 'renewing', 'closed');
create type public.season_status as enum ('planning', 'open', 'closed');
create type public.record_status as enum ('draft', 'confirmed', 'cancelled', 'review_required');
create type public.record_origin as enum ('manual', 'pdf', 'integration', 'system');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 2 and 120),
  owner_user_id uuid not null references public.profiles(id),
  timezone text not null default 'America/Sao_Paulo',
  currency_code text not null default 'BRL' check (currency_code = 'BRL'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.account_memberships (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.account_role not null,
  status public.membership_status not null default 'active',
  invited_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique (account_id, user_id)
);

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  name text not null check (length(trim(name)) between 2 and 120),
  city text not null,
  state char(2) not null,
  total_area_ha numeric(12,4) check (total_area_ha is null or total_area_ha > 0),
  responsible_user_id uuid references public.profiles(id),
  latitude numeric(9,6),
  longitude numeric(9,6),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (account_id, name)
);

create table public.property_access (
  property_id uuid not null references public.properties(id) on delete cascade,
  membership_id uuid not null references public.account_memberships(id) on delete cascade,
  granted_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  primary key (property_id, membership_id)
);

create table public.cultivars (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  species text not null default 'Coffea arabica',
  active boolean not null default true
);

create table public.plots (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 80),
  area_ha numeric(12,4) not null check (area_ha > 0),
  status public.plot_status not null default 'active',
  center_latitude numeric(9,6),
  center_longitude numeric(9,6),
  boundary_geojson jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (property_id, name)
);

create table public.plantings (
  id uuid primary key default gen_random_uuid(),
  plot_id uuid not null references public.plots(id) on delete restrict,
  cultivar_id uuid not null references public.cultivars(id),
  planted_area_ha numeric(12,4) not null check (planted_area_ha > 0),
  planted_on date,
  planted_year smallint check (planted_year is null or planted_year between 1900 and 2200),
  spacing_between_rows_m numeric(6,2) check (spacing_between_rows_m is null or spacing_between_rows_m > 0),
  spacing_between_plants_m numeric(6,2) check (spacing_between_plants_m is null or spacing_between_plants_m > 0),
  estimated_plants integer check (estimated_plants is null or estimated_plants > 0),
  status public.planting_status not null default 'forming',
  ended_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'closed' and ended_on is not null) or (status <> 'closed' and ended_on is null))
);

create unique index one_active_planting_per_plot on public.plantings(plot_id) where status <> 'closed';

create table public.harvest_seasons (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  name text not null,
  starts_on date not null,
  ends_on date not null,
  status public.season_status not null default 'planning',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on > starts_on),
  unique (property_id, name)
);

create unique index one_open_season_per_property on public.harvest_seasons(property_id) where status = 'open';

create table public.operational_records (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete restrict,
  plot_id uuid references public.plots(id) on delete restrict,
  planting_id uuid references public.plantings(id) on delete restrict,
  season_id uuid references public.harvest_seasons(id) on delete restrict,
  record_type text not null,
  occurred_at timestamptz not null,
  status public.record_status not null default 'draft',
  origin public.record_origin not null default 'manual',
  payload jsonb not null default '{}'::jsonb,
  notes text,
  responsible_user_id uuid references public.profiles(id),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  client_id uuid not null default gen_random_uuid(),
  version integer not null default 1 check (version > 0),
  unique (property_id, client_id)
);

create table public.audit_log (
  id bigint generated always as identity primary key,
  account_id uuid not null references public.accounts(id),
  table_name text not null,
  record_id uuid not null,
  action text not null check (action in ('insert', 'update', 'delete', 'restore')),
  old_data jsonb,
  new_data jsonb,
  actor_user_id uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'avatar_url');
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger touch_profiles before update on public.profiles for each row execute procedure public.touch_updated_at();
create trigger touch_accounts before update on public.accounts for each row execute procedure public.touch_updated_at();
create trigger touch_properties before update on public.properties for each row execute procedure public.touch_updated_at();
create trigger touch_plots before update on public.plots for each row execute procedure public.touch_updated_at();
create trigger touch_plantings before update on public.plantings for each row execute procedure public.touch_updated_at();
create trigger touch_seasons before update on public.harvest_seasons for each row execute procedure public.touch_updated_at();
create trigger touch_records before update on public.operational_records for each row execute procedure public.touch_updated_at();

create or replace function public.is_account_member(target_account_id uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.account_memberships m where m.account_id = target_account_id and m.user_id = auth.uid() and m.status = 'active');
$$;

create or replace function public.can_access_property(target_property_id uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists(
    select 1 from public.properties p
    join public.account_memberships m on m.account_id = p.account_id and m.user_id = auth.uid() and m.status = 'active'
    left join public.property_access pa on pa.membership_id = m.id and pa.property_id = p.id
    where p.id = target_property_id and (m.role in ('owner', 'producer', 'manager') or pa.property_id is not null)
  );
$$;

alter table public.profiles enable row level security;
alter table public.accounts enable row level security;
alter table public.account_memberships enable row level security;
alter table public.properties enable row level security;
alter table public.property_access enable row level security;
alter table public.cultivars enable row level security;
alter table public.plots enable row level security;
alter table public.plantings enable row level security;
alter table public.harvest_seasons enable row level security;
alter table public.operational_records enable row level security;
alter table public.audit_log enable row level security;

create policy "profile own read" on public.profiles for select using (id = auth.uid());
create policy "profile own update" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy "account members read" on public.accounts for select using (public.is_account_member(id));
create policy "owner creates account" on public.accounts for insert with check (owner_user_id = auth.uid());
create policy "owner manages account" on public.accounts for update using (owner_user_id = auth.uid()) with check (owner_user_id = auth.uid());
create policy "members read memberships" on public.account_memberships for select using (public.is_account_member(account_id));
create policy "owner manages memberships" on public.account_memberships for all using (exists(select 1 from public.accounts a where a.id = account_id and a.owner_user_id = auth.uid())) with check (exists(select 1 from public.accounts a where a.id = account_id and a.owner_user_id = auth.uid()));
create policy "property access read" on public.properties for select using (public.can_access_property(id));
create policy "account managers create properties" on public.properties for insert with check (exists(select 1 from public.account_memberships m where m.account_id = account_id and m.user_id = auth.uid() and m.status = 'active' and m.role in ('owner','producer','manager')));
create policy "account managers update properties" on public.properties for update using (exists(select 1 from public.account_memberships m where m.account_id = account_id and m.user_id = auth.uid() and m.status = 'active' and m.role in ('owner','producer','manager')));
create policy "authorized read property access" on public.property_access for select using (public.can_access_property(property_id));
create policy "owners manage property access" on public.property_access for all using (exists(select 1 from public.properties p join public.accounts a on a.id = p.account_id where p.id = property_id and a.owner_user_id = auth.uid())) with check (exists(select 1 from public.properties p join public.accounts a on a.id = p.account_id where p.id = property_id and a.owner_user_id = auth.uid()));
create policy "authenticated read cultivars" on public.cultivars for select to authenticated using (true);
create policy "plot property access" on public.plots for select using (public.can_access_property(property_id));
create policy "plot managers write" on public.plots for all using (public.can_access_property(property_id)) with check (public.can_access_property(property_id));
create policy "planting property access" on public.plantings for select using (public.can_access_property((select property_id from public.plots where id = plot_id)));
create policy "planting managers write" on public.plantings for all using (public.can_access_property((select property_id from public.plots where id = plot_id))) with check (public.can_access_property((select property_id from public.plots where id = plot_id)));
create policy "season property access" on public.harvest_seasons for select using (public.can_access_property(property_id));
create policy "season managers write" on public.harvest_seasons for all using (public.can_access_property(property_id)) with check (public.can_access_property(property_id));
create policy "record property access" on public.operational_records for select using (public.can_access_property(property_id));
create policy "record property write" on public.operational_records for all using (public.can_access_property(property_id)) with check (public.can_access_property(property_id) and created_by = auth.uid());
create policy "audit account read" on public.audit_log for select using (public.is_account_member(account_id));

insert into public.cultivars(name, species) values
  ('Arara', 'Coffea arabica'), ('Bourbon Amarelo', 'Coffea arabica'), ('Catuaí Amarelo', 'Coffea arabica'),
  ('Catuaí Vermelho 144', 'Coffea arabica'), ('Catucaí', 'Coffea arabica'), ('Mundo Novo', 'Coffea arabica')
on conflict do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('private-documents', 'private-documents', false, 26214400, array['application/pdf','image/jpeg','image/png','image/heic'])
on conflict (id) do nothing;
