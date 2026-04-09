-- Course ratings table
CREATE TABLE public.course_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  reason TEXT,
  reason_detail TEXT,
  status TEXT NOT NULL DEFAULT 'validated' CHECK (status IN ('validated', 'pending_review', 'contested', 'ai_resolved', 'cancelled')),
  ai_decision TEXT CHECK (ai_decision IN ('maintained', 'adjusted', 'cancelled', 'shared')),
  adjusted_rating INTEGER CHECK (adjusted_rating >= 1 AND adjusted_rating <= 5),
  ai_justification TEXT,
  ai_analysis JSONB,
  driver_response TEXT CHECK (driver_response IN ('accepted', 'contested')),
  driver_response_at TIMESTAMPTZ,
  client_response_deadline TIMESTAMPTZ,
  admin_override BOOLEAN DEFAULT false,
  admin_override_by UUID REFERENCES public.profiles(id),
  admin_override_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(course_id, client_id)
);

-- Rating disputes table
CREATE TABLE public.rating_disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rating_id UUID NOT NULL REFERENCES public.course_ratings(id) ON DELETE CASCADE,
  initiated_by TEXT NOT NULL CHECK (initiated_by IN ('driver', 'admin')),
  dispute_reason TEXT,
  client_response TEXT,
  client_responded_at TIMESTAMPTZ,
  ai_verdict TEXT CHECK (ai_verdict IN ('maintained', 'adjusted', 'cancelled', 'shared')),
  ai_verdict_detail TEXT,
  resolution TEXT CHECK (resolution IN ('pending', 'resolved', 'expired', 'admin_override')),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add reliability scores to clients
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS reliability_score INTEGER DEFAULT 80,
  ADD COLUMN IF NOT EXISTS total_ratings_given INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS abusive_ratings_count INTEGER DEFAULT 0;

-- Add reliability scores to drivers
ALTER TABLE public.drivers
  ADD COLUMN IF NOT EXISTS reliability_score INTEGER DEFAULT 80,
  ADD COLUMN IF NOT EXISTS total_ratings_received INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS disputed_ratings_won INTEGER DEFAULT 0;

-- Enable RLS
ALTER TABLE public.course_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rating_disputes ENABLE ROW LEVEL SECURITY;

-- RLS for course_ratings
CREATE POLICY "Clients can view their own ratings"
  ON public.course_ratings FOR SELECT
  USING (client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid()));

CREATE POLICY "Clients can create ratings"
  ON public.course_ratings FOR INSERT
  WITH CHECK (client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid()));

CREATE POLICY "Drivers can view ratings about them"
  ON public.course_ratings FOR SELECT
  USING (driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid()));

CREATE POLICY "Drivers can update their response"
  ON public.course_ratings FOR UPDATE
  USING (driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage all ratings"
  ON public.course_ratings FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS for rating_disputes
CREATE POLICY "Drivers can view their disputes"
  ON public.rating_disputes FOR SELECT
  USING (rating_id IN (
    SELECT cr.id FROM public.course_ratings cr
    JOIN public.drivers d ON cr.driver_id = d.id
    WHERE d.user_id = auth.uid()
  ));

CREATE POLICY "Drivers can create disputes"
  ON public.rating_disputes FOR INSERT
  WITH CHECK (rating_id IN (
    SELECT cr.id FROM public.course_ratings cr
    JOIN public.drivers d ON cr.driver_id = d.id
    WHERE d.user_id = auth.uid()
  ));

CREATE POLICY "Clients can view disputes about their ratings"
  ON public.rating_disputes FOR SELECT
  USING (rating_id IN (
    SELECT cr.id FROM public.course_ratings cr
    JOIN public.clients c ON cr.client_id = c.id
    WHERE c.user_id = auth.uid()
  ));

CREATE POLICY "Clients can respond to disputes"
  ON public.rating_disputes FOR UPDATE
  USING (rating_id IN (
    SELECT cr.id FROM public.course_ratings cr
    JOIN public.clients c ON cr.client_id = c.id
    WHERE c.user_id = auth.uid()
  ));

CREATE POLICY "Admins can manage all disputes"
  ON public.rating_disputes FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_course_ratings_updated_at
  BEFORE UPDATE ON public.course_ratings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_rating_disputes_updated_at
  BEFORE UPDATE ON public.rating_disputes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to check daily contest limit (max 2 per driver per day)
CREATE OR REPLACE FUNCTION public.check_daily_contest_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  daily_count INTEGER;
  driver_user_id UUID;
BEGIN
  SELECT d.user_id INTO driver_user_id
  FROM course_ratings cr
  JOIN drivers d ON cr.driver_id = d.id
  WHERE cr.id = NEW.rating_id;

  SELECT COUNT(*) INTO daily_count
  FROM rating_disputes rd
  JOIN course_ratings cr ON rd.rating_id = cr.id
  JOIN drivers d ON cr.driver_id = d.id
  WHERE d.user_id = driver_user_id
    AND rd.created_at >= CURRENT_DATE
    AND rd.initiated_by = 'driver';

  IF daily_count >= 2 THEN
    RAISE EXCEPTION 'Maximum 2 contestations par jour atteint';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_daily_contest_limit
  BEFORE INSERT ON public.rating_disputes
  FOR EACH ROW
  WHEN (NEW.initiated_by = 'driver')
  EXECUTE FUNCTION public.check_daily_contest_limit();