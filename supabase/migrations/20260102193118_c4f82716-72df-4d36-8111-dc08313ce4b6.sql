-- Add proposal_message column to driver_partnerships
ALTER TABLE public.driver_partnerships
ADD COLUMN IF NOT EXISTS proposal_message text;