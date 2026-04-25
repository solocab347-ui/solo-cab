create or replace function public.clear_driver_gps_on_offline(_driver_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.drivers
     set current_latitude = null,
         current_longitude = null,
         last_location_update = null
   where id = _driver_id
     and user_id = auth.uid();
$$;

revoke all on function public.clear_driver_gps_on_offline(uuid) from public;
grant execute on function public.clear_driver_gps_on_offline(uuid) to authenticated;