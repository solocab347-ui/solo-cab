-- Add payment schedule and dispute fields to driver_partnerships
ALTER TABLE public.driver_partnerships 
ADD COLUMN IF NOT EXISTS payment_schedule TEXT DEFAULT 'per_course' CHECK (payment_schedule IN ('per_course', 'weekly', 'monthly', 'custom')),
ADD COLUMN IF NOT EXISTS payment_day INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS custom_payment_days INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS last_payment_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS sharing_blocked BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS blocked_reason TEXT,
ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS blocked_by_admin_id UUID REFERENCES public.profiles(id);

-- Create partnership disputes table for reporting non-payment
CREATE TABLE IF NOT EXISTS public.partnership_disputes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partnership_id UUID NOT NULL REFERENCES public.driver_partnerships(id) ON DELETE CASCADE,
  reporter_driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  reported_driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  amount_owed NUMERIC DEFAULT 0,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'investigating', 'resolved', 'dismissed')),
  admin_id UUID REFERENCES public.profiles(id),
  admin_notes TEXT,
  resolution TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.partnership_disputes ENABLE ROW LEVEL SECURITY;

-- RLS policies for partnership_disputes
CREATE POLICY "Drivers can view their disputes"
  ON public.partnership_disputes
  FOR SELECT
  USING (reporter_driver_id = get_driver_id(auth.uid()) OR reported_driver_id = get_driver_id(auth.uid()));

CREATE POLICY "Drivers can create disputes"
  ON public.partnership_disputes
  FOR INSERT
  WITH CHECK (reporter_driver_id = get_driver_id(auth.uid()));

CREATE POLICY "Admins can manage all disputes"
  ON public.partnership_disputes
  FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Add client notification tracking to shared_courses
ALTER TABLE public.shared_courses 
ADD COLUMN IF NOT EXISTS client_notified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS client_notified_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS client_message TEXT;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_partnership_disputes_status ON public.partnership_disputes(status);
CREATE INDEX IF NOT EXISTS idx_partnership_disputes_partnership ON public.partnership_disputes(partnership_id);
CREATE INDEX IF NOT EXISTS idx_driver_partnerships_blocked ON public.driver_partnerships(sharing_blocked) WHERE sharing_blocked = true;

-- Create function to check if a driver can share courses
CREATE OR REPLACE FUNCTION public.can_share_courses(_driver_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.driver_partnerships
    WHERE (driver_a_id = _driver_id OR driver_b_id = _driver_id)
      AND sharing_blocked = true
  )
$$;

-- Create function to get partnership disputes for admin
CREATE OR REPLACE FUNCTION public.get_all_partnership_disputes()
RETURNS SETOF public.partnership_disputes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;
  
  RETURN QUERY
  SELECT * FROM public.partnership_disputes
  ORDER BY 
    CASE status 
      WHEN 'pending' THEN 1 
      WHEN 'investigating' THEN 2 
      ELSE 3 
    END,
    created_at DESC;
END;
$$;