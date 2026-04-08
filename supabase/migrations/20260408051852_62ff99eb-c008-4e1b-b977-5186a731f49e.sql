
-- Add accept_future_bookings preference
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS accept_future_bookings boolean DEFAULT true;

-- Migrate existing status values to new naming
UPDATE public.drivers SET driver_status = 'online' WHERE driver_status = 'online_available';
UPDATE public.drivers SET driver_status = 'assigned' WHERE driver_status IN ('accepting', 'reserved');
UPDATE public.drivers SET driver_status = 'in_ride' WHERE driver_status = 'on_trip';
