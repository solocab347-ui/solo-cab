
-- Drop the old UUID version that causes ambiguity
DROP FUNCTION IF EXISTS public.get_guest_booking_by_token(uuid);
