-- Create a comprehensive driver work schedule table with per-day targets
CREATE TABLE public.driver_work_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  is_working_day BOOLEAN NOT NULL DEFAULT true,
  start_time TIME DEFAULT '08:00',
  end_time TIME DEFAULT '18:00',
  break_start TIME,
  break_end TIME,
  target_hours NUMERIC(4,1) DEFAULT 8,
  target_revenue NUMERIC(10,2) DEFAULT 0,
  target_courses INTEGER DEFAULT 0,
  target_clients INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(driver_id, day_of_week)
);

-- Enable RLS
ALTER TABLE public.driver_work_schedules ENABLE ROW LEVEL SECURITY;

-- Policies for drivers to manage their own schedules
CREATE POLICY "Drivers can view their own schedules"
ON public.driver_work_schedules
FOR SELECT
USING (driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid()));

CREATE POLICY "Drivers can insert their own schedules"
ON public.driver_work_schedules
FOR INSERT
WITH CHECK (driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid()));

CREATE POLICY "Drivers can update their own schedules"
ON public.driver_work_schedules
FOR UPDATE
USING (driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid()));

CREATE POLICY "Drivers can delete their own schedules"
ON public.driver_work_schedules
FOR DELETE
USING (driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid()));

-- Trigger to update updated_at
CREATE TRIGGER update_driver_work_schedules_updated_at
BEFORE UPDATE ON public.driver_work_schedules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();