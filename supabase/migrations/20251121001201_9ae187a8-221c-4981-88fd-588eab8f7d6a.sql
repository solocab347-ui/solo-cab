-- Table pour les demandes d'assistance à l'admin via Max
CREATE TABLE IF NOT EXISTS public.assistant_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  context TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'answered', 'closed')),
  admin_response TEXT,
  admin_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  answered_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index pour améliorer les performances
CREATE INDEX idx_assistant_requests_driver_id ON public.assistant_requests(driver_id);
CREATE INDEX idx_assistant_requests_status ON public.assistant_requests(status);
CREATE INDEX idx_assistant_requests_created_at ON public.assistant_requests(created_at DESC);

-- Enable RLS
ALTER TABLE public.assistant_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Drivers can create their own requests"
  ON public.assistant_requests
  FOR INSERT
  WITH CHECK (driver_id IN (
    SELECT id FROM public.drivers WHERE user_id = auth.uid()
  ));

CREATE POLICY "Drivers can view their own requests"
  ON public.assistant_requests
  FOR SELECT
  USING (driver_id IN (
    SELECT id FROM public.drivers WHERE user_id = auth.uid()
  ));

CREATE POLICY "Admins can view all requests"
  ON public.assistant_requests
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all requests"
  ON public.assistant_requests
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

-- Trigger pour updated_at
CREATE TRIGGER update_assistant_requests_updated_at
  BEFORE UPDATE ON public.assistant_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();