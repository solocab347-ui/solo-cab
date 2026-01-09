-- Drop the old constraint and add the new one with dispatched_to_fleet status
ALTER TABLE company_course_requests 
DROP CONSTRAINT company_course_requests_status_check;

ALTER TABLE company_course_requests 
ADD CONSTRAINT company_course_requests_status_check 
CHECK (status = ANY (ARRAY['draft'::text, 'quotes_generated'::text, 'sent_to_drivers'::text, 'accepted'::text, 'cancelled'::text, 'dispatched_to_fleet'::text]));