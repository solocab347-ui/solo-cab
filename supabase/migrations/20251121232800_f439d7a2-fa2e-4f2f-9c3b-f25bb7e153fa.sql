-- Add client rating field to courses table
ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS client_rating INTEGER CHECK (client_rating >= 1 AND client_rating <= 5);

COMMENT ON COLUMN public.courses.client_rating IS 'Rating given by client after course completion (1-5 stars)';
