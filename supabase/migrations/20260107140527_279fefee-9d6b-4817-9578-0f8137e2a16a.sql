-- Ensure fleet manager courses table exists for tracking courses created by fleet managers for their clients
CREATE TABLE IF NOT EXISTS public.fleet_manager_course_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fleet_manager_id UUID NOT NULL REFERENCES public.fleet_managers(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  created_by_fleet_manager BOOLEAN NOT NULL DEFAULT true,
  pickup_address TEXT NOT NULL,
  destination_address TEXT NOT NULL,
  scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  assigned_driver_id UUID REFERENCES public.drivers(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_fleet_manager_course_requests_fleet_manager ON public.fleet_manager_course_requests(fleet_manager_id);
CREATE INDEX IF NOT EXISTS idx_fleet_manager_course_requests_client ON public.fleet_manager_course_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_fleet_manager_course_requests_status ON public.fleet_manager_course_requests(status);

-- Enable RLS
ALTER TABLE public.fleet_manager_course_requests ENABLE ROW LEVEL SECURITY;

-- Policies for fleet managers
CREATE POLICY "Fleet managers can view their course requests"
  ON public.fleet_manager_course_requests
  FOR SELECT
  USING (
    fleet_manager_id IN (SELECT id FROM public.fleet_managers WHERE user_id = auth.uid())
  );

CREATE POLICY "Fleet managers can create course requests"
  ON public.fleet_manager_course_requests
  FOR INSERT
  WITH CHECK (
    fleet_manager_id IN (SELECT id FROM public.fleet_managers WHERE user_id = auth.uid())
  );

CREATE POLICY "Fleet managers can update their course requests"
  ON public.fleet_manager_course_requests
  FOR UPDATE
  USING (
    fleet_manager_id IN (SELECT id FROM public.fleet_managers WHERE user_id = auth.uid())
  );

-- Policies for clients (can see their own course requests)
CREATE POLICY "Clients can view their own course requests"
  ON public.fleet_manager_course_requests
  FOR SELECT
  USING (
    client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())
  );

-- Add preferred_fleet_driver_id to clients table for fleet client preferences
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS preferred_fleet_driver_id UUID REFERENCES public.drivers(id);

-- Add fleet_manager_name cache column to courses for display purposes
ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS fleet_manager_name TEXT;

-- Create a view for fleet clients with enriched data
CREATE OR REPLACE VIEW public.fleet_client_dashboard_view AS
SELECT 
  c.id AS client_id,
  c.user_id,
  c.fleet_manager_id,
  c.favorite_driver_id,
  c.preferred_fleet_driver_id,
  c.total_rides,
  c.total_spent,
  c.created_at,
  fm.company_name AS fleet_manager_name,
  fm.logo_url AS fleet_manager_logo,
  fm.contact_phone AS fleet_manager_phone,
  fm.contact_email AS fleet_manager_email,
  p.full_name AS client_name,
  p.email AS client_email,
  p.phone AS client_phone,
  p.profile_photo_url AS client_photo
FROM public.clients c
JOIN public.fleet_managers fm ON c.fleet_manager_id = fm.id
JOIN public.profiles p ON c.user_id = p.id
WHERE c.fleet_manager_id IS NOT NULL;

-- Enable realtime for fleet manager course requests
ALTER PUBLICATION supabase_realtime ADD TABLE public.fleet_manager_course_requests;