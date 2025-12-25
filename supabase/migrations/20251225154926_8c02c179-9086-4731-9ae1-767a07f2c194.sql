-- Add RLS policy for fleet managers to view profiles of public independent drivers
CREATE POLICY "Fleet managers can view public driver profiles"
ON public.profiles
FOR SELECT
USING (
  -- Fleet manager viewing profile of a driver with public profile enabled
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'fleet_manager'
  )
  AND EXISTS (
    SELECT 1 FROM drivers d
    WHERE d.user_id = profiles.id
    AND d.public_profile_enabled = true
    AND d.status = 'validated'
    AND d.fleet_manager_id IS NULL
  )
);

-- Also allow anyone to view their own profile (already exists but ensuring)
-- And allow viewing profiles in conversations
CREATE POLICY "Users can view profiles in their conversations"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM conversations c
    WHERE (c.participant_1_id = auth.uid() OR c.participant_2_id = auth.uid())
    AND (c.participant_1_id = profiles.id OR c.participant_2_id = profiles.id)
  )
);