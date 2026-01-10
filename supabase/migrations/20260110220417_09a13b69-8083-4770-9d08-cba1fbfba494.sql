-- Add columns for multiple peak hour periods (up to 3) in city_pricing table
ALTER TABLE public.city_pricing
ADD COLUMN IF NOT EXISTS peak_hours_2_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS peak_hours_2_start text,
ADD COLUMN IF NOT EXISTS peak_hours_2_end text,
ADD COLUMN IF NOT EXISTS peak_hours_2_multiplier numeric DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS peak_hours_3_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS peak_hours_3_start text,
ADD COLUMN IF NOT EXISTS peak_hours_3_end text,
ADD COLUMN IF NOT EXISTS peak_hours_3_multiplier numeric DEFAULT 1.0;

-- Add comment explaining the new columns
COMMENT ON COLUMN public.city_pricing.peak_hours_2_enabled IS 'Enable second peak hours period';
COMMENT ON COLUMN public.city_pricing.peak_hours_2_start IS 'Second peak period start time (HH:MM format)';
COMMENT ON COLUMN public.city_pricing.peak_hours_2_end IS 'Second peak period end time (HH:MM format)';
COMMENT ON COLUMN public.city_pricing.peak_hours_2_multiplier IS 'Price multiplier for second peak period';
COMMENT ON COLUMN public.city_pricing.peak_hours_3_enabled IS 'Enable third peak hours period';
COMMENT ON COLUMN public.city_pricing.peak_hours_3_start IS 'Third peak period start time (HH:MM format)';
COMMENT ON COLUMN public.city_pricing.peak_hours_3_end IS 'Third peak period end time (HH:MM format)';
COMMENT ON COLUMN public.city_pricing.peak_hours_3_multiplier IS 'Price multiplier for third peak period';