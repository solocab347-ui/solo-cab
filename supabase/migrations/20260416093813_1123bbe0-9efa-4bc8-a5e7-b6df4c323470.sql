
-- 1. Function to auto-sync course relationships
CREATE OR REPLACE FUNCTION public.sync_course_client_and_driver_ids()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Auto-fill client_id from created_by_user_id if missing
  IF NEW.client_id IS NULL AND NEW.created_by_user_id IS NOT NULL THEN
    SELECT c.id INTO NEW.client_id
    FROM public.clients c
    WHERE c.user_id = NEW.created_by_user_id
    LIMIT 1;
  END IF;

  -- Auto-sync driver_ids from driver_id
  IF NEW.driver_id IS NOT NULL THEN
    IF NEW.driver_ids IS NULL OR array_length(NEW.driver_ids, 1) IS NULL OR NOT (NEW.driver_id = ANY(NEW.driver_ids)) THEN
      NEW.driver_ids := ARRAY[NEW.driver_id];
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 2. Create trigger
DROP TRIGGER IF EXISTS sync_course_relationships_trigger ON public.courses;
CREATE TRIGGER sync_course_relationships_trigger
  BEFORE INSERT OR UPDATE ON public.courses
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_course_client_and_driver_ids();

-- 3. Backfill: sync driver_ids from driver_id for all existing courses
UPDATE public.courses
SET driver_ids = ARRAY[driver_id]
WHERE driver_id IS NOT NULL
  AND (driver_ids IS NULL OR array_length(driver_ids, 1) IS NULL OR NOT (driver_id = ANY(driver_ids)));

-- 4. Backfill: sync client_id from created_by_user_id for existing courses
UPDATE public.courses c
SET client_id = cl.id
FROM public.clients cl
WHERE c.created_by_user_id = cl.user_id
  AND c.client_id IS NULL;

-- 5. Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_courses_created_by_user_id ON public.courses(created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_courses_client_id ON public.courses(client_id);
