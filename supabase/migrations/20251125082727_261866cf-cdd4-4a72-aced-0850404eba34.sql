-- Create invitation_tokens table for test campaign
CREATE TABLE public.invitation_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  email TEXT,
  used BOOLEAN NOT NULL DEFAULT false,
  used_by_driver_id UUID REFERENCES public.drivers(id),
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_by_admin_id UUID REFERENCES public.profiles(id)
);

-- Enable RLS
ALTER TABLE public.invitation_tokens ENABLE ROW LEVEL SECURITY;

-- Admins can manage all tokens
CREATE POLICY "Admins can manage all invitation tokens"
  ON public.invitation_tokens
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::text))
  WITH CHECK (has_role(auth.uid(), 'admin'::text));

-- Public can view unused tokens (to validate during registration)
CREATE POLICY "Anyone can view unused tokens"
  ON public.invitation_tokens
  FOR SELECT
  USING (used = false);

-- Create index for faster token lookups
CREATE INDEX idx_invitation_tokens_token ON public.invitation_tokens(token);
CREATE INDEX idx_invitation_tokens_used ON public.invitation_tokens(used);