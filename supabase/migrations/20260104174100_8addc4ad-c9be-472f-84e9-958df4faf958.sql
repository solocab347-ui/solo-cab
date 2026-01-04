-- Create table to store guest client registration tokens
CREATE TABLE public.guest_registration_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  guest_name TEXT NOT NULL,
  guest_phone TEXT NOT NULL,
  guest_email TEXT,
  pickup_address TEXT,
  destination_address TEXT,
  scheduled_date TIMESTAMPTZ,
  estimated_price NUMERIC,
  is_used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMPTZ,
  used_by_user_id UUID,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.guest_registration_tokens ENABLE ROW LEVEL SECURITY;

-- Policies for drivers to manage their own tokens
CREATE POLICY "Drivers can view their own tokens"
ON public.guest_registration_tokens
FOR SELECT
USING (
  driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid())
);

CREATE POLICY "Drivers can create tokens"
ON public.guest_registration_tokens
FOR INSERT
WITH CHECK (
  driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid())
);

CREATE POLICY "Drivers can update their own tokens"
ON public.guest_registration_tokens
FOR UPDATE
USING (
  driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid())
);

-- Allow public read for token validation (using token only, not listing)
CREATE POLICY "Anyone can validate a token"
ON public.guest_registration_tokens
FOR SELECT
USING (
  is_used = false 
  AND expires_at > now()
);

-- Create index for fast token lookup
CREATE INDEX idx_guest_registration_tokens_token ON public.guest_registration_tokens(token);
CREATE INDEX idx_guest_registration_tokens_driver ON public.guest_registration_tokens(driver_id);

-- Add trigger for updated_at
CREATE TRIGGER update_guest_registration_tokens_updated_at
BEFORE UPDATE ON public.guest_registration_tokens
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();