-- Add columns for fleet manager subscription and driver management
ALTER TABLE public.fleet_managers 
ADD COLUMN IF NOT EXISTS max_free_drivers integer DEFAULT 10,
ADD COLUMN IF NOT EXISTS extra_drivers_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS monthly_extra_driver_cost numeric DEFAULT 10.00,
ADD COLUMN IF NOT EXISTS base_subscription_cost numeric DEFAULT 69.99,
ADD COLUMN IF NOT EXISTS stripe_customer_id text,
ADD COLUMN IF NOT EXISTS next_billing_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS billing_history jsonb DEFAULT '[]'::jsonb;

-- Create fleet manager invitation tokens table with usage tracking
CREATE TABLE IF NOT EXISTS public.fleet_driver_invitations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fleet_manager_id uuid NOT NULL REFERENCES public.fleet_managers(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  email text,
  is_paid boolean DEFAULT false,
  used boolean DEFAULT false,
  used_at timestamp with time zone,
  used_by_driver_id uuid REFERENCES public.drivers(id),
  expires_at timestamp with time zone DEFAULT (now() + interval '30 days'),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on fleet_driver_invitations
ALTER TABLE public.fleet_driver_invitations ENABLE ROW LEVEL SECURITY;

-- RLS policies for fleet_driver_invitations
CREATE POLICY "Fleet managers can manage their invitations"
ON public.fleet_driver_invitations
FOR ALL
USING (fleet_manager_id IN (SELECT id FROM fleet_managers WHERE user_id = auth.uid()));

CREATE POLICY "Public can view unused invitations for validation"
ON public.fleet_driver_invitations
FOR SELECT
USING (used = false);

CREATE POLICY "Admins can manage all fleet driver invitations"
ON public.fleet_driver_invitations
FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Function to count active drivers for a fleet manager
CREATE OR REPLACE FUNCTION public.get_fleet_driver_count(_fleet_manager_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.fleet_manager_drivers
  WHERE fleet_manager_id = _fleet_manager_id
    AND status = 'active';
$$;

-- Function to check if fleet manager can add more free drivers
CREATE OR REPLACE FUNCTION public.can_add_free_driver(_fleet_manager_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT (
    SELECT COUNT(*)
    FROM public.fleet_manager_drivers
    WHERE fleet_manager_id = _fleet_manager_id
      AND status = 'active'
  ) < (
    SELECT COALESCE(max_free_drivers, 10)
    FROM public.fleet_managers
    WHERE id = _fleet_manager_id
  );
$$;

-- Function to calculate monthly billing amount
CREATE OR REPLACE FUNCTION public.calculate_fleet_monthly_billing(_fleet_manager_id uuid)
RETURNS TABLE(base_cost numeric, extra_drivers integer, extra_cost numeric, total_cost numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_base_cost numeric;
  v_driver_count integer;
  v_max_free integer;
  v_extra_driver_cost numeric;
  v_extra_drivers integer;
  v_extra_cost numeric;
BEGIN
  -- Get fleet manager settings
  SELECT 
    COALESCE(base_subscription_cost, 69.99),
    COALESCE(max_free_drivers, 10),
    COALESCE(monthly_extra_driver_cost, 10.00)
  INTO v_base_cost, v_max_free, v_extra_driver_cost
  FROM public.fleet_managers
  WHERE id = _fleet_manager_id;
  
  -- Count active drivers
  SELECT COUNT(*)::integer INTO v_driver_count
  FROM public.fleet_manager_drivers
  WHERE fleet_manager_id = _fleet_manager_id
    AND status = 'active';
  
  -- Calculate extra drivers
  v_extra_drivers := GREATEST(0, v_driver_count - v_max_free);
  v_extra_cost := v_extra_drivers * v_extra_driver_cost;
  
  RETURN QUERY SELECT 
    v_base_cost,
    v_extra_drivers,
    v_extra_cost,
    v_base_cost + v_extra_cost;
END;
$$;