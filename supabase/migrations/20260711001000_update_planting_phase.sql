create or replace function public.update_planting_phase(target_planting_id uuid,target_status public.planting_status)
returns void language plpgsql security definer set search_path='' as $$
declare planting_record public.plantings%rowtype; target_account uuid;
begin
 select * into planting_record from public.plantings where id=target_planting_id for update;
 if planting_record.id is null then raise exception 'planting_not_found'; end if;
 if not public.can_write_property((select property_id from public.plots where id=planting_record.plot_id)) then raise exception 'permission_denied'; end if;
 if planting_record.status='closed' then raise exception 'planting_closed'; end if;
 if target_status='closed' then raise exception 'use_close_planting'; end if;
 update public.plantings set status=target_status where id=target_planting_id;
 select p.account_id into target_account from public.plots pl join public.properties p on p.id=pl.property_id where pl.id=planting_record.plot_id;
 perform public.audit_structure(target_account,'plantings',target_planting_id,'update',jsonb_build_object('status',planting_record.status),jsonb_build_object('status',target_status));
end; $$;
grant execute on function public.update_planting_phase(uuid,public.planting_status) to authenticated;
