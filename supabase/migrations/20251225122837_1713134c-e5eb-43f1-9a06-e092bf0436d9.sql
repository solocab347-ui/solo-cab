-- Add intelligent buffer configuration to fleet_managers
ALTER TABLE public.fleet_managers
ADD COLUMN IF NOT EXISTS smart_buffer_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS smart_buffer_min_minutes integer DEFAULT 15,
ADD COLUMN IF NOT EXISTS smart_buffer_fallback_action text DEFAULT 'notify_manager';

-- Add comments for documentation
COMMENT ON COLUMN public.fleet_managers.smart_buffer_enabled IS 'Enable intelligent buffer calculation based on travel time between courses';
COMMENT ON COLUMN public.fleet_managers.smart_buffer_min_minutes IS 'Minimum buffer time in minutes for intelligent mode';
COMMENT ON COLUMN public.fleet_managers.smart_buffer_fallback_action IS 'Action when timing is too tight: notify_manager, assign_available, auto_reject';
COMMENT ON COLUMN public.fleet_managers.course_buffer_minutes IS 'Fixed buffer time in minutes when smart buffer is disabled';