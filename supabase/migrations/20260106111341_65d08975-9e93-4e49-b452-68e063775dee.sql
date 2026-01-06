-- Enable realtime for company_course_requests table
ALTER PUBLICATION supabase_realtime ADD TABLE public.company_course_requests;

-- Also enable replica identity full for better realtime support
ALTER TABLE public.company_course_requests REPLICA IDENTITY FULL;