
-- Table de signalements post-course par les chauffeurs
CREATE TABLE public.driver_course_incidents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  guest_name TEXT,
  guest_phone TEXT,
  incident_type TEXT NOT NULL DEFAULT 'other',
  description TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'pending',
  admin_response TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.driver_course_incidents ENABLE ROW LEVEL SECURITY;

-- Drivers can create incidents for their own courses
CREATE POLICY "Drivers can create incidents for their courses"
  ON public.driver_course_incidents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid())
  );

-- Drivers can view their own incidents
CREATE POLICY "Drivers can view their own incidents"
  ON public.driver_course_incidents
  FOR SELECT
  TO authenticated
  USING (
    driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid())
    OR
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Admins can update incidents (respond, resolve)
CREATE POLICY "Admins can update incidents"
  ON public.driver_course_incidents
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Index for performance
CREATE INDEX idx_driver_course_incidents_driver ON public.driver_course_incidents(driver_id);
CREATE INDEX idx_driver_course_incidents_status ON public.driver_course_incidents(status);
CREATE INDEX idx_driver_course_incidents_course ON public.driver_course_incidents(course_id);

-- Trigger for updated_at
CREATE TRIGGER update_driver_course_incidents_updated_at
  BEFORE UPDATE ON public.driver_course_incidents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
