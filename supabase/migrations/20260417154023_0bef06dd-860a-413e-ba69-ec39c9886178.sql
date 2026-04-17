-- Fix #1: add the missing column referenced by atomic_start_course_finalization
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS final_payment_locked_at timestamptz;

-- Fix #2: helper to release stale locks (kept idempotent)
CREATE OR REPLACE FUNCTION public.release_course_finalization_lock(p_course_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.courses
     SET final_payment_locked_at = NULL,
         final_payment_status = CASE WHEN final_payment_status = 'processing' THEN NULL ELSE final_payment_status END,
         updated_at = now()
   WHERE id = p_course_id;
END;
$$;