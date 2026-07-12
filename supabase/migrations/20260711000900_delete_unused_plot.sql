create or replace function public.delete_unused_plot(target_plot_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare plot_record public.plots%rowtype; target_account uuid;
begin
  select * into plot_record from public.plots where id=target_plot_id for update;
  if plot_record.id is null then raise exception 'plot_not_found'; end if;
  if not public.can_write_property(plot_record.property_id) then raise exception 'permission_denied'; end if;
  if exists(select 1 from public.plantings where plot_id=target_plot_id)
    or exists(select 1 from public.operational_records where plot_id=target_plot_id) then raise exception 'plot_in_use'; end if;
  select account_id into target_account from public.properties where id=plot_record.property_id;
  perform public.audit_structure(target_account,'plots',target_plot_id,'delete',to_jsonb(plot_record)-'boundary_geojson',null);
  delete from public.plot_versions where plot_id=target_plot_id;
  delete from public.plots where id=target_plot_id;
end; $$;
grant execute on function public.delete_unused_plot(uuid) to authenticated;
