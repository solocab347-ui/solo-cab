-- Add RLS policy for companies to view drivers with visible_to_companies enabled
CREATE POLICY "Companies can view drivers visible to companies"
ON public.drivers
FOR SELECT
USING (
  (visible_to_companies = true OR public_profile_enabled = true)
  AND status = 'validated'
  AND EXISTS (
    SELECT 1 FROM companies c
    WHERE c.user_id = auth.uid()
  )
);