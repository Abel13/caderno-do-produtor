drop policy if exists "owner manages memberships" on public.account_memberships;
drop policy if exists "owners manage property access" on public.property_access;

drop policy if exists "account managers create properties" on public.properties;
create policy "account managers create properties" on public.properties for insert
  with check (public.current_account_role(account_id) in ('owner', 'manager'));
drop policy if exists "account managers update properties" on public.properties;
create policy "account managers update properties" on public.properties for update
  using (public.current_account_role(account_id) in ('owner', 'manager'))
  with check (public.current_account_role(account_id) in ('owner', 'manager'));

drop policy if exists "plot managers write" on public.plots;
create policy "plot managers write" on public.plots for all
  using (public.can_write_property(property_id)) with check (public.can_write_property(property_id));
drop policy if exists "planting managers write" on public.plantings;
create policy "planting managers write" on public.plantings for all
  using (public.can_write_property((select property_id from public.plots where id = plot_id)))
  with check (public.can_write_property((select property_id from public.plots where id = plot_id)));
drop policy if exists "season managers write" on public.harvest_seasons;
create policy "season managers write" on public.harvest_seasons for all
  using (public.can_write_property(property_id)) with check (public.can_write_property(property_id));
