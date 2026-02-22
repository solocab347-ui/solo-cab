-- Update RLS policy for podcast_segments to also allow admins (who stored segments with their user_id as driver_id)
DROP POLICY IF EXISTS "Users can view their own podcast segments" ON public.podcast_segments;
CREATE POLICY "Users can view their own podcast segments" 
ON public.podcast_segments 
FOR SELECT 
USING (
  driver_id IN (
    SELECT drivers.id FROM drivers WHERE drivers.user_id = auth.uid()
  )
  OR driver_id = auth.uid()
);

DROP POLICY IF EXISTS "Users can delete their own podcast segments" ON public.podcast_segments;
CREATE POLICY "Users can delete their own podcast segments" 
ON public.podcast_segments 
FOR DELETE 
USING (
  driver_id IN (
    SELECT drivers.id FROM drivers WHERE drivers.user_id = auth.uid()
  )
  OR driver_id = auth.uid()
);