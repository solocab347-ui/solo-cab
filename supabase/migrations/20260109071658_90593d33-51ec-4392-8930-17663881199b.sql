-- Add fleet_manager_id column to courses table for proper fleet course tracking
ALTER TABLE public.courses 
ADD COLUMN IF NOT EXISTS fleet_manager_id UUID REFERENCES public.fleet_managers(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_courses_fleet_manager_id ON public.courses(fleet_manager_id);

-- Add comment for documentation
COMMENT ON COLUMN public.courses.fleet_manager_id IS 'Fleet manager who created or manages this course';