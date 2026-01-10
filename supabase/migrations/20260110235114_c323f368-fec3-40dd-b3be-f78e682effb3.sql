-- Create table for client-driver blocks (bidirectional blocking)
CREATE TABLE IF NOT EXISTS public.client_driver_blocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  blocked_by TEXT NOT NULL CHECK (blocked_by IN ('client', 'driver')),
  block_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure unique block per client-driver-blocker combination
  UNIQUE(client_id, driver_id, blocked_by)
);

-- Enable RLS
ALTER TABLE public.client_driver_blocks ENABLE ROW LEVEL SECURITY;

-- Clients can view their own blocks
CREATE POLICY "Clients can view their blocks"
ON public.client_driver_blocks
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.clients c 
    WHERE c.id = client_id AND c.user_id = auth.uid()
  )
);

-- Clients can create their own blocks
CREATE POLICY "Clients can create their blocks"
ON public.client_driver_blocks
FOR INSERT
WITH CHECK (
  blocked_by = 'client' AND
  EXISTS (
    SELECT 1 FROM public.clients c 
    WHERE c.id = client_id AND c.user_id = auth.uid()
  )
);

-- Clients can delete their own blocks
CREATE POLICY "Clients can delete their blocks"
ON public.client_driver_blocks
FOR DELETE
USING (
  blocked_by = 'client' AND
  EXISTS (
    SELECT 1 FROM public.clients c 
    WHERE c.id = client_id AND c.user_id = auth.uid()
  )
);

-- Drivers can view blocks involving them
CREATE POLICY "Drivers can view blocks on them"
ON public.client_driver_blocks
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.drivers d 
    WHERE d.id = driver_id AND d.user_id = auth.uid()
  )
);

-- Drivers can create blocks on clients
CREATE POLICY "Drivers can create blocks on clients"
ON public.client_driver_blocks
FOR INSERT
WITH CHECK (
  blocked_by = 'driver' AND
  EXISTS (
    SELECT 1 FROM public.drivers d 
    WHERE d.id = driver_id AND d.user_id = auth.uid()
  )
);

-- Drivers can delete their own blocks
CREATE POLICY "Drivers can delete their blocks"
ON public.client_driver_blocks
FOR DELETE
USING (
  blocked_by = 'driver' AND
  EXISTS (
    SELECT 1 FROM public.drivers d 
    WHERE d.id = driver_id AND d.user_id = auth.uid()
  )
);

-- Add index for performance
CREATE INDEX idx_client_driver_blocks_client ON public.client_driver_blocks(client_id);
CREATE INDEX idx_client_driver_blocks_driver ON public.client_driver_blocks(driver_id);
CREATE INDEX idx_client_driver_blocks_lookup ON public.client_driver_blocks(client_id, driver_id);