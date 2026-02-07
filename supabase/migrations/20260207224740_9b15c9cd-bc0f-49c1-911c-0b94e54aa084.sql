-- Add columns to track who cancelled and cancellation fees
ALTER TABLE public.courses 
ADD COLUMN IF NOT EXISTS cancelled_by TEXT CHECK (cancelled_by IN ('driver', 'client', 'system')),
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
ADD COLUMN IF NOT EXISTS cancellation_fee_amount NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS cancellation_fee_charged BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS cancellation_fee_charged_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS cancellation_fee_stripe_id TEXT,
ADD COLUMN IF NOT EXISTS card_hold_confirmed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS card_hold_amount NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS hours_before_cancellation NUMERIC(10,2);

-- Add index for card hold lookups
CREATE INDEX IF NOT EXISTS idx_courses_card_hold_status ON public.courses(card_hold_status) WHERE card_hold_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_courses_cancelled_by ON public.courses(cancelled_by) WHERE cancelled_by IS NOT NULL;

-- Create cancellation_fees_config table for customizable fees per driver
CREATE TABLE IF NOT EXISTS public.cancellation_fees_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID REFERENCES public.drivers(id) ON DELETE CASCADE,
  fleet_manager_id UUID REFERENCES public.fleet_managers(id) ON DELETE CASCADE,
  cancellation_fee_amount NUMERIC(10,2) DEFAULT 15.00,
  free_cancellation_hours INTEGER DEFAULT 2,
  require_card_hold BOOLEAN DEFAULT TRUE,
  card_hold_for_new_clients_only BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(driver_id),
  UNIQUE(fleet_manager_id)
);

-- Enable RLS
ALTER TABLE public.cancellation_fees_config ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Drivers can view their own config" ON public.cancellation_fees_config
FOR SELECT USING (
  EXISTS (SELECT 1 FROM drivers WHERE id = cancellation_fees_config.driver_id AND user_id = auth.uid())
);

CREATE POLICY "Drivers can update their own config" ON public.cancellation_fees_config
FOR UPDATE USING (
  EXISTS (SELECT 1 FROM drivers WHERE id = cancellation_fees_config.driver_id AND user_id = auth.uid())
);

CREATE POLICY "Drivers can insert their own config" ON public.cancellation_fees_config
FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM drivers WHERE id = cancellation_fees_config.driver_id AND user_id = auth.uid())
);

-- Create function to calculate cancellation fee
CREATE OR REPLACE FUNCTION public.calculate_cancellation_fee(
  p_course_id UUID,
  p_cancelled_by TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_course RECORD;
  v_config RECORD;
  v_hours_until_pickup NUMERIC;
  v_fee_amount NUMERIC := 0;
  v_should_charge BOOLEAN := FALSE;
  v_reason TEXT := '';
BEGIN
  -- Get course details
  SELECT c.*, d.stripe_connect_account_id
  INTO v_course
  FROM courses c
  JOIN drivers d ON c.driver_id = d.id
  WHERE c.id = p_course_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Course not found');
  END IF;
  
  -- Get cancellation config
  SELECT * INTO v_config
  FROM cancellation_fees_config
  WHERE driver_id = v_course.driver_id;
  
  -- Use defaults if no config
  IF NOT FOUND THEN
    v_config := ROW(
      NULL, -- id
      v_course.driver_id, -- driver_id
      NULL, -- fleet_manager_id
      15.00, -- cancellation_fee_amount
      2, -- free_cancellation_hours
      TRUE, -- require_card_hold
      FALSE, -- card_hold_for_new_clients_only
      NOW(), -- created_at
      NOW() -- updated_at
    )::cancellation_fees_config;
  END IF;
  
  -- Calculate hours until pickup
  v_hours_until_pickup := EXTRACT(EPOCH FROM (v_course.scheduled_date - NOW())) / 3600;
  
  -- Determine if fee should be charged
  IF p_cancelled_by = 'driver' THEN
    -- Driver cancels: no fee for client, refund any deposit
    v_should_charge := FALSE;
    v_reason := 'Driver cancelled - no fee for client';
  ELSIF p_cancelled_by = 'client' THEN
    -- Client cancels: check time threshold
    IF v_hours_until_pickup <= v_config.free_cancellation_hours THEN
      -- Within penalty window
      v_should_charge := TRUE;
      v_fee_amount := v_config.cancellation_fee_amount;
      v_reason := format('Client cancelled within %s hours of pickup', v_config.free_cancellation_hours);
    ELSE
      -- Outside penalty window
      v_should_charge := FALSE;
      v_reason := format('Client cancelled more than %s hours before pickup', v_config.free_cancellation_hours);
    END IF;
  ELSE
    -- System cancels: no fee
    v_should_charge := FALSE;
    v_reason := 'System cancelled - no fee';
  END IF;
  
  RETURN json_build_object(
    'should_charge', v_should_charge,
    'fee_amount', v_fee_amount,
    'hours_until_pickup', v_hours_until_pickup,
    'free_cancellation_hours', v_config.free_cancellation_hours,
    'reason', v_reason,
    'has_card_hold', v_course.card_hold_status = 'confirmed',
    'stripe_payment_method_id', v_course.stripe_payment_method_id
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.calculate_cancellation_fee TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_cancellation_fee TO service_role;