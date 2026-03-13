
-- Add origin_type to courses table to distinguish client-initiated vs driver-initiated quotes
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS origin_type TEXT NOT NULL DEFAULT 'client_request';

-- Add origin_type to devis table
ALTER TABLE public.devis ADD COLUMN IF NOT EXISTS origin_type TEXT NOT NULL DEFAULT 'client_request';

-- Add a quote_token to devis for shareable acceptance links (like guest_tracking_token on courses)
ALTER TABLE public.devis ADD COLUMN IF NOT EXISTS quote_token TEXT UNIQUE;

-- Add guest client info directly on devis for driver-initiated quotes to external clients
ALTER TABLE public.devis ADD COLUMN IF NOT EXISTS guest_client_name TEXT;
ALTER TABLE public.devis ADD COLUMN IF NOT EXISTS guest_client_phone TEXT;
ALTER TABLE public.devis ADD COLUMN IF NOT EXISTS guest_client_email TEXT;

-- Add custom_price flag to devis to indicate driver set the price manually
ALTER TABLE public.devis ADD COLUMN IF NOT EXISTS is_custom_price BOOLEAN DEFAULT false;

-- Create index on quote_token for fast lookups
CREATE INDEX IF NOT EXISTS idx_devis_quote_token ON public.devis(quote_token) WHERE quote_token IS NOT NULL;

-- Create index on origin_type for filtering
CREATE INDEX IF NOT EXISTS idx_courses_origin_type ON public.courses(origin_type);
CREATE INDEX IF NOT EXISTS idx_devis_origin_type ON public.devis(origin_type);
