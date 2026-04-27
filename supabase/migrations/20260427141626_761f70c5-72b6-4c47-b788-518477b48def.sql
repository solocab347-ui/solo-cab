create or replace function public.set_driver_availability_atomic(
  _driver_id uuid,
  _target text
)
returns table(
  driver_status text,
  is_available_now boolean,
  blocked boolean,
  blocked_reason text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_status text;
  v_owner uuid;
  v_active_course_id uuid;
  v_new_status text;
  v_available boolean;
begin
  select d.driver_status, d.user_id
    into v_current_status, v_owner
  from public.drivers d
  where d.id = _driver_id
  limit 1;

  if v_owner is null then
    return query select
      coalesce(v_current_status, 'offline')::text,
      false,
      true,
      'driver_not_found'::text;
    return;
  end if;

  if v_owner <> auth.uid() then
    return query select
      v_current_status::text,
      false,
      true,
      'forbidden'::text;
    return;
  end if;

  if v_current_status in ('assigned', 'in_ride') then
    select c.id
      into v_active_course_id
    from public.courses c
    where c.driver_id = _driver_id
      and c.status::text in ('pending', 'accepted', 'driver_approaching', 'driver_arrived', 'in_progress')
    order by c.updated_at desc
    limit 1;

    if v_active_course_id is not null then
      return query select
        v_current_status::text,
        false,
        true,
        'driver_busy'::text;
      return;
    end if;
  end if;

  if _target = 'online' then
    v_new_status := 'online';
    v_available := true;
  elsif _target = 'break' then
    v_new_status := 'break';
    v_available := false;
  else
    v_new_status := 'offline';
    v_available := false;
  end if;

  if v_available then
    update public.drivers
       set driver_status = v_new_status,
           is_available_now = true,
           last_location_update = now(),
           updated_at = now()
     where id = _driver_id;
  else
    update public.drivers
       set driver_status = v_new_status,
           is_available_now = false,
           current_latitude = null,
           current_longitude = null,
           last_location_update = null,
           updated_at = now()
     where id = _driver_id;
  end if;

  return query select
    v_new_status::text,
    v_available,
    false,
    null::text;
end;
$$;

revoke all on function public.set_driver_availability_atomic(uuid, text) from public;
grant execute on function public.set_driver_availability_atomic(uuid, text) to authenticated;