-- Add 'in_progress' and 'declined' to the status check constraint
ALTER TABLE public.shared_courses DROP CONSTRAINT shared_courses_status_check;
ALTER TABLE public.shared_courses ADD CONSTRAINT shared_courses_status_check 
  CHECK (status = ANY (ARRAY['pending', 'accepted', 'declined', 'in_progress', 'completed', 'cancelled']));