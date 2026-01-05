-- =============================================
-- SYSTÈME DE RÉSERVATION ENTREPRISE MULTI-CHAUFFEURS
-- =============================================

-- Table pour les demandes de course entreprise (avant envoi aux chauffeurs)
CREATE TABLE public.company_course_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_by_user_id UUID REFERENCES auth.users(id),
  
  -- Collaborateur (inscrit ou non)
  employee_id UUID REFERENCES public.company_employees(id) ON DELETE SET NULL,
  guest_employee_name TEXT,
  guest_employee_phone TEXT,
  guest_employee_email TEXT,
  is_guest_employee BOOLEAN DEFAULT false,
  
  -- Détails de la course
  pickup_address TEXT NOT NULL,
  pickup_latitude NUMERIC,
  pickup_longitude NUMERIC,
  destination_address TEXT NOT NULL,
  destination_latitude NUMERIC,
  destination_longitude NUMERIC,
  scheduled_date TIMESTAMPTZ NOT NULL,
  passengers_count INTEGER DEFAULT 1,
  notes TEXT,
  payment_method_requested TEXT,
  
  -- Statut du flux
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'quotes_generated', 'sent_to_drivers', 'accepted', 'cancelled')),
  
  -- Tracking
  quotes_generated_at TIMESTAMPTZ,
  sent_to_drivers_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  accepted_driver_id UUID REFERENCES public.drivers(id),
  final_course_id UUID REFERENCES public.courses(id),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table pour les devis générés pour chaque chauffeur partenaire
CREATE TABLE public.company_course_quotes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES public.company_course_requests(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  
  -- Prix calculés
  base_price NUMERIC NOT NULL DEFAULT 0,
  distance_price NUMERIC NOT NULL DEFAULT 0,
  time_price NUMERIC DEFAULT 0,
  evening_surcharge NUMERIC DEFAULT 0,
  weekend_surcharge NUMERIC DEFAULT 0,
  total_price NUMERIC NOT NULL,
  
  -- Distance et durée estimées
  distance_km NUMERIC,
  duration_minutes INTEGER,
  
  -- Statut
  status TEXT DEFAULT 'generated' CHECK (status IN ('generated', 'selected', 'sent', 'accepted', 'refused', 'expired', 'taken_by_other')),
  
  -- Tracking
  selected_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  driver_response_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(request_id, driver_id)
);

-- Table pour les invitations collaborateurs non-inscrits (via course)
CREATE TABLE public.company_employee_course_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  request_id UUID REFERENCES public.company_course_requests(id) ON DELETE SET NULL,
  course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  guest_name TEXT NOT NULL,
  guest_phone TEXT,
  guest_email TEXT,
  
  -- Détails pré-remplis
  pickup_address TEXT,
  destination_address TEXT,
  scheduled_date TIMESTAMPTZ,
  
  is_used BOOLEAN DEFAULT false,
  used_at TIMESTAMPTZ,
  used_by_user_id UUID REFERENCES auth.users(id),
  
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '30 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.company_course_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_course_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_employee_course_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for company_course_requests
CREATE POLICY "Companies can manage their course requests"
  ON public.company_course_requests
  FOR ALL
  USING (
    company_id IN (
      SELECT id FROM public.companies WHERE user_id = auth.uid()
    )
    OR
    company_id IN (
      SELECT company_id FROM public.company_employees 
      WHERE user_id = auth.uid() AND is_active = true AND can_create_courses = true
    )
  );

-- RLS Policies for company_course_quotes
CREATE POLICY "Companies can view their quotes"
  ON public.company_course_quotes
  FOR SELECT
  USING (
    request_id IN (
      SELECT id FROM public.company_course_requests 
      WHERE company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid())
    )
    OR
    request_id IN (
      SELECT id FROM public.company_course_requests 
      WHERE company_id IN (
        SELECT company_id FROM public.company_employees 
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

CREATE POLICY "Companies can update their quotes"
  ON public.company_course_quotes
  FOR UPDATE
  USING (
    request_id IN (
      SELECT id FROM public.company_course_requests 
      WHERE company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Drivers can view quotes sent to them"
  ON public.company_course_quotes
  FOR SELECT
  USING (
    driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid())
    AND status IN ('sent', 'accepted', 'refused', 'taken_by_other')
  );

CREATE POLICY "Drivers can update their quotes"
  ON public.company_course_quotes
  FOR UPDATE
  USING (
    driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid())
    AND status = 'sent'
  );

-- RLS for employee course invitations
CREATE POLICY "Companies can manage their employee invitations"
  ON public.company_employee_course_invitations
  FOR ALL
  USING (
    company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid())
  );

CREATE POLICY "Anyone can view invitations by token"
  ON public.company_employee_course_invitations
  FOR SELECT
  USING (true);

-- Indexes
CREATE INDEX idx_company_course_requests_company ON public.company_course_requests(company_id);
CREATE INDEX idx_company_course_requests_status ON public.company_course_requests(status);
CREATE INDEX idx_company_course_quotes_request ON public.company_course_quotes(request_id);
CREATE INDEX idx_company_course_quotes_driver ON public.company_course_quotes(driver_id);
CREATE INDEX idx_company_course_quotes_status ON public.company_course_quotes(status);
CREATE INDEX idx_company_employee_course_invitations_token ON public.company_employee_course_invitations(token);

-- Trigger for updated_at
CREATE TRIGGER update_company_course_requests_updated_at
  BEFORE UPDATE ON public.company_course_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_company_course_quotes_updated_at
  BEFORE UPDATE ON public.company_course_quotes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to claim a course (with race condition handling)
CREATE OR REPLACE FUNCTION public.claim_company_course_quote(
  p_quote_id UUID,
  p_driver_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quote RECORD;
  v_request RECORD;
  v_result JSON;
BEGIN
  -- Lock and get the quote
  SELECT * INTO v_quote
  FROM company_course_quotes
  WHERE id = p_quote_id AND driver_id = p_driver_id
  FOR UPDATE NOWAIT;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Quote not found');
  END IF;
  
  -- Check if quote is still available
  IF v_quote.status != 'sent' THEN
    RETURN json_build_object('success', false, 'error', 'Quote already processed', 'status', v_quote.status);
  END IF;
  
  -- Check if request was already accepted
  SELECT * INTO v_request
  FROM company_course_requests
  WHERE id = v_quote.request_id
  FOR UPDATE NOWAIT;
  
  IF v_request.status = 'accepted' THEN
    -- Mark this quote as taken by other
    UPDATE company_course_quotes
    SET status = 'taken_by_other', updated_at = now()
    WHERE id = p_quote_id;
    
    RETURN json_build_object('success', false, 'error', 'Course already taken by another driver');
  END IF;
  
  -- Accept this quote
  UPDATE company_course_quotes
  SET status = 'accepted', driver_response_at = now(), updated_at = now()
  WHERE id = p_quote_id;
  
  -- Mark other quotes as taken_by_other
  UPDATE company_course_quotes
  SET status = 'taken_by_other', updated_at = now()
  WHERE request_id = v_quote.request_id AND id != p_quote_id AND status = 'sent';
  
  -- Update request status
  UPDATE company_course_requests
  SET status = 'accepted', accepted_at = now(), accepted_driver_id = p_driver_id, updated_at = now()
  WHERE id = v_quote.request_id;
  
  RETURN json_build_object('success', true, 'quote_id', p_quote_id, 'request_id', v_quote.request_id);
  
EXCEPTION
  WHEN lock_not_available THEN
    RETURN json_build_object('success', false, 'error', 'Course is being claimed by another driver, please try again');
END;
$$;