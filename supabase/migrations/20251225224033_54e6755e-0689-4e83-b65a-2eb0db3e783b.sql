-- Add columns for partnership modification requests
ALTER TABLE public.fleet_driver_partnerships
ADD COLUMN IF NOT EXISTS pending_modification boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS pending_modification_by text,
ADD COLUMN IF NOT EXISTS pending_new_commission numeric,
ADD COLUMN IF NOT EXISTS pending_new_payment_schedule text,
ADD COLUMN IF NOT EXISTS pending_modification_reason text,
ADD COLUMN IF NOT EXISTS pending_modification_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS last_modified_at timestamp with time zone;

-- Add comment for clarity
COMMENT ON COLUMN public.fleet_driver_partnerships.pending_modification IS 'Whether there is a pending modification request';
COMMENT ON COLUMN public.fleet_driver_partnerships.pending_modification_by IS 'Who initiated the modification: fleet_manager or driver';
COMMENT ON COLUMN public.fleet_driver_partnerships.pending_new_commission IS 'Proposed new commission percentage';
COMMENT ON COLUMN public.fleet_driver_partnerships.pending_new_payment_schedule IS 'Proposed new payment schedule';
COMMENT ON COLUMN public.fleet_driver_partnerships.pending_modification_reason IS 'Reason for the modification request';
COMMENT ON COLUMN public.fleet_driver_partnerships.pending_modification_at IS 'When the modification was requested';
COMMENT ON COLUMN public.fleet_driver_partnerships.last_modified_at IS 'When the partnership was last modified';