
-- Fix the trigger function that references a non-existent column
CREATE OR REPLACE FUNCTION prevent_incomplete_course_completion()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    PERFORM auto_create_invoice_for_course(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;
