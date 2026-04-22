-- Create table for account deletion requests (public submissions)
CREATE TABLE public.account_deletion_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  ip_address TEXT,
  user_agent TEXT,
  notes TEXT,
  processed_at TIMESTAMP WITH TIME ZONE,
  processed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;

-- Anyone (including anonymous) can submit a deletion request
CREATE POLICY "Anyone can submit a deletion request"
  ON public.account_deletion_requests
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only admins can view requests
CREATE POLICY "Admins can view all deletion requests"
  ON public.account_deletion_requests
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can update requests
CREATE POLICY "Admins can update deletion requests"
  ON public.account_deletion_requests
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can delete requests
CREATE POLICY "Admins can delete deletion requests"
  ON public.account_deletion_requests
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_account_deletion_requests_updated_at
  BEFORE UPDATE ON public.account_deletion_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Index for admin queries
CREATE INDEX idx_account_deletion_requests_status ON public.account_deletion_requests(status, created_at DESC);
CREATE INDEX idx_account_deletion_requests_email ON public.account_deletion_requests(email);