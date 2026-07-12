create or replace function public.delete_unused_planting(target_planting_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare planting_record public.plantings%rowtype; target_account uuid;
begin
  select * into planting_record from public.plantings where id=target_planting_id for update;
  if planting_record.id is null then raise exception 'planting_not_found'; end if;
  if not public.can_write_property((select property_id from public.plots where id=planting_record.plot_id)) then raise exception 'permission_denied'; end if;
  if exists(select 1 from public.planting_seasons where planting_id=target_planting_id)
    or exists(select 1 from public.operational_records where planting_id=target_planting_id) then raise exception 'planting_in_use'; end if;
  select p.account_id into target_account from public.plots pl join public.properties p on p.id=pl.property_id where pl.id=planting_record.plot_id;
  perform public.audit_structure(target_account,'plantings',target_planting_id,'delete',to_jsonb(planting_record),null);
  delete from public.plantings where id=target_planting_id;
end; $$;
grant execute on function public.delete_unused_planting(uuid) to authenticated;
