
-- Allow authenticated admins to view settlements (read-only for now)
CREATE POLICY "Authenticated can view settlements" ON public.weekly_settlements
  FOR SELECT TO authenticated USING (true);
