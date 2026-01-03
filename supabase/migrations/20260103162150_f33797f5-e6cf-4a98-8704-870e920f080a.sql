-- Add RLS policy for driver partners to view each other's profiles
CREATE POLICY "Partners can view each other profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM driver_partnerships dp
    JOIN drivers d1 ON (dp.driver_a_id = d1.id OR dp.driver_b_id = d1.id)
    JOIN drivers d2 ON (dp.driver_a_id = d2.id OR dp.driver_b_id = d2.id)
    WHERE dp.status = 'active'
    AND d1.user_id = auth.uid()
    AND d2.user_id = profiles.id
    AND d1.id != d2.id
  )
  OR
  -- Also allow viewing profiles of drivers who shared courses with you (even without formal partnership)
  EXISTS (
    SELECT 1 FROM shared_courses sc
    JOIN drivers d_sender ON sc.sender_driver_id = d_sender.id
    JOIN drivers d_receiver ON sc.receiver_driver_id = d_receiver.id
    WHERE (
      (d_receiver.user_id = auth.uid() AND d_sender.user_id = profiles.id)
      OR
      (d_sender.user_id = auth.uid() AND d_receiver.user_id = profiles.id)
    )
    AND sc.status IN ('pending', 'accepted', 'in_progress', 'completed')
  )
);