-- Add columns for objectives and trial start control
ALTER TABLE public.drivers 
ADD COLUMN IF NOT EXISTS objectives_completed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS objectives_data jsonb DEFAULT null,
ADD COLUMN IF NOT EXISTS ai_coaching_recommendations text DEFAULT null,
ADD COLUMN IF NOT EXISTS onboarding_objectives_completed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS equipment_received_at timestamp with time zone DEFAULT null,
ADD COLUMN IF NOT EXISTS trial_ready_to_start boolean DEFAULT false;