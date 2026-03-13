
-- Add out-of-schedule flag to courses
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS is_out_of_schedule boolean DEFAULT false;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS out_of_schedule_action text DEFAULT null;
-- Values: null (pending decision), 'keep' (driver keeps it), 'share_partner' (marked for partner sharing)

-- Create table to track out-of-schedule alerts for the driver
CREATE TABLE IF NOT EXISTS public.out_of_schedule_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  driver_id uuid NOT NULL,
  scheduled_date timestamptz NOT NULL,
  day_of_week integer NOT NULL,
  course_time text NOT NULL,
  driver_start_time text NOT NULL,
  driver_end_time text NOT NULL,
  action text DEFAULT 'pending',
  -- 'pending', 'keep', 'share_partner', 'dismissed'
  notified_at timestamptz DEFAULT now(),
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(course_id, driver_id)
);

-- Enable RLS
ALTER TABLE public.out_of_schedule_alerts ENABLE ROW LEVEL SECURITY;

-- Policy: drivers can see their own alerts
CREATE POLICY "Drivers can view own alerts" ON public.out_of_schedule_alerts
  FOR SELECT TO authenticated
  USING (driver_id IN (
    SELECT id FROM public.drivers WHERE user_id = auth.uid()
  ));

-- Policy: drivers can update their own alerts
CREATE POLICY "Drivers can update own alerts" ON public.out_of_schedule_alerts
  FOR UPDATE TO authenticated
  USING (driver_id IN (
    SELECT id FROM public.drivers WHERE user_id = auth.uid()
  ));

-- Policy: insert via service role or authenticated
CREATE POLICY "System can insert alerts" ON public.out_of_schedule_alerts
  FOR INSERT TO authenticated
  WITH CHECK (driver_id IN (
    SELECT id FROM public.drivers WHERE user_id = auth.uid()
  ));

-- Enable realtime for alerts
ALTER PUBLICATION supabase_realtime ADD TABLE public.out_of_schedule_alerts;
