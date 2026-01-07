-- Table de blocage bidirectionnel fleet-driver
CREATE TABLE public.fleet_driver_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fleet_manager_id UUID NOT NULL REFERENCES public.fleet_managers(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  blocked_by TEXT NOT NULL CHECK (blocked_by IN ('fleet_manager', 'driver')),
  block_reason TEXT,
  blocked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(fleet_manager_id, driver_id, blocked_by)
);

-- Enable RLS
ALTER TABLE public.fleet_driver_blocks ENABLE ROW LEVEL SECURITY;

-- Policies for fleet managers
CREATE POLICY "Fleet managers can view their blocks"
ON public.fleet_driver_blocks
FOR SELECT
TO authenticated
USING (
  fleet_manager_id IN (
    SELECT id FROM public.fleet_managers WHERE user_id = auth.uid()
  )
  OR
  driver_id IN (
    SELECT id FROM public.drivers WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Fleet managers can create blocks"
ON public.fleet_driver_blocks
FOR INSERT
TO authenticated
WITH CHECK (
  (blocked_by = 'fleet_manager' AND fleet_manager_id IN (
    SELECT id FROM public.fleet_managers WHERE user_id = auth.uid()
  ))
  OR
  (blocked_by = 'driver' AND driver_id IN (
    SELECT id FROM public.drivers WHERE user_id = auth.uid()
  ))
);

CREATE POLICY "Users can delete their own blocks"
ON public.fleet_driver_blocks
FOR DELETE
TO authenticated
USING (
  (blocked_by = 'fleet_manager' AND fleet_manager_id IN (
    SELECT id FROM public.fleet_managers WHERE user_id = auth.uid()
  ))
  OR
  (blocked_by = 'driver' AND driver_id IN (
    SELECT id FROM public.drivers WHERE user_id = auth.uid()
  ))
);

-- Index for faster lookups
CREATE INDEX idx_fleet_driver_blocks_fleet ON public.fleet_driver_blocks(fleet_manager_id);
CREATE INDEX idx_fleet_driver_blocks_driver ON public.fleet_driver_blocks(driver_id);

-- Function to check if blocked
CREATE OR REPLACE FUNCTION public.is_fleet_driver_blocked(
  p_fleet_manager_id UUID,
  p_driver_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.fleet_driver_blocks
    WHERE fleet_manager_id = p_fleet_manager_id
    AND driver_id = p_driver_id
  )
$$;