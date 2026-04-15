
-- Add unique constraint to prevent duplicate payment records per course
-- This prevents double-capture issues when finalize-course-payment is called multiple times
CREATE UNIQUE INDEX IF NOT EXISTS payments_course_payment_type_unique_idx
ON public.payments (course_id, payment_type)
WHERE status = 'succeeded';

-- Also add a unique constraint for course_capture specifically
CREATE UNIQUE INDEX IF NOT EXISTS payments_course_capture_unique_idx
ON public.payments (course_id)
WHERE payment_type = 'course_capture' AND status = 'succeeded';

-- Add unique constraint for cash manual payments
CREATE UNIQUE INDEX IF NOT EXISTS payments_course_cash_unique_idx
ON public.payments (course_id)
WHERE payment_type = 'course_payment' AND status = 'succeeded';
