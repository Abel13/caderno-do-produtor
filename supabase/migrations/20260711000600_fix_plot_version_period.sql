alter table public.plot_versions drop constraint plot_versions_check;
alter table public.plot_versions add constraint plot_versions_valid_period check (valid_to is null or valid_to >= valid_from);
