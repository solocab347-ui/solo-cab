-- Fix 1: Add 'rejected' to ride_requests status check constraint
ALTER TABLE public.ride_requests DROP CONSTRAINT IF EXISTS ride_requests_status_check;
ALTER TABLE public.ride_requests ADD CONSTRAINT ride_requests_status_check 
  CHECK (status = ANY (ARRAY['searching'::text, 'pending'::text, 'accepted'::text, 'cancelled'::text, 'expired'::text, 'no_driver'::text, 'rejected'::text]));

-- Fix 2: Add 'expired' to course_status enum
ALTER TYPE course_status ADD VALUE IF NOT EXISTS 'expired';