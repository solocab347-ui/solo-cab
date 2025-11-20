-- Add created_by_user_id to courses table to track who created the course
ALTER TABLE public.courses 
ADD COLUMN created_by_user_id uuid REFERENCES auth.users(id);

-- Add comment to explain the field
COMMENT ON COLUMN public.courses.created_by_user_id IS 'User ID of the person who created the course (driver or client). Used to determine acceptance workflow.';