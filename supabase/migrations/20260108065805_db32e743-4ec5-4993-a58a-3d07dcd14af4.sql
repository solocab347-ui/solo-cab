-- Add INSERT policy for congress_registrations
CREATE POLICY "Users can insert own registration"
ON public.congress_registrations
FOR INSERT
TO public
WITH CHECK (user_id = auth.uid());

-- Add UPDATE policy for users to update their own registrations
CREATE POLICY "Users can update own registration"
ON public.congress_registrations
FOR UPDATE
TO public
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());