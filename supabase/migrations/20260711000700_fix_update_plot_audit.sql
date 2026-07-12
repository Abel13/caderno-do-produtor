create or replace function public.update_plot(target_plot_id uuid,target_name text,target_area_ha numeric,target_status public.plot_status)
returns void language plpgsql security definer set search_path='' as $$ declare old_plot public.plots%rowtype; target_account uuid; begin
 select * into old_plot from public.plots where id=target_plot_id for update; if old_plot.id is null then raise exception 'plot_not_found'; end if;
 if not public.can_write_property(old_plot.property_id) then raise exception 'permission_denied'; end if;
 if target_area_ha <= 0 then raise exception 'invalid_plot_area'; end if;
 if exists(select 1 from public.plantings where plot_id=target_plot_id and status<>'closed' and planted_area_ha>target_area_ha) then raise exception 'plot_area_below_active_planting'; end if;
 update public.plot_versions set valid_to=now() where plot_id=target_plot_id and valid_to is null;
 update public.plots set name=trim(target_name),area_ha=target_area_ha,status=target_status,closed_at=case when target_status='closed' then now() else null end where id=target_plot_id;
 insert into public.plot_versions(plot_id,name,area_ha,status,changed_by) values(target_plot_id,trim(target_name),target_area_ha,target_status,auth.uid());
 select p.account_id into target_account from public.properties p where p.id=old_plot.property_id;
 perform public.audit_structure(target_account,'plots',target_plot_id,'update',to_jsonb(old_plot)-'boundary_geojson',jsonb_build_object('name',trim(target_name),'area_ha',target_area_ha,'status',target_status)); end; $$;
