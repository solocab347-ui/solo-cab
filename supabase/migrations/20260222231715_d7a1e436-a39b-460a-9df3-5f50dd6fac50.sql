
-- Fix INSERT policy to also allow admins (who use their user_id as driver_id)
DROP POLICY IF EXISTS "Users can insert their own podcast segments" ON public.podcast_segments;
CREATE POLICY "Users can insert their own podcast segments" 
ON public.podcast_segments 
FOR INSERT 
WITH CHECK (
  driver_id IN (
    SELECT drivers.id FROM drivers WHERE drivers.user_id = auth.uid()
  )
  OR driver_id = auth.uid()
);

-- Add UPDATE policy for admins too
DROP POLICY IF EXISTS "Users can update their own podcast segments" ON public.podcast_segments;
CREATE POLICY "Users can update their own podcast segments" 
ON public.podcast_segments 
FOR UPDATE 
USING (
  driver_id IN (
    SELECT drivers.id FROM drivers WHERE drivers.user_id = auth.uid()
  )
  OR driver_id = auth.uid()
)
WITH CHECK (
  driver_id IN (
    SELECT drivers.id FROM drivers WHERE drivers.user_id = auth.uid()
  )
  OR driver_id = auth.uid()
);
