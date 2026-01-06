-- Enable REPLICA IDENTITY FULL for better realtime updates
ALTER TABLE public.courses REPLICA IDENTITY FULL;

-- Add courses table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.courses;