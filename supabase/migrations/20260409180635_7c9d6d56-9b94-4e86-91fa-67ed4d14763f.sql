
-- Table pour suivre les abonnements Premium
CREATE TABLE public.driver_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  plan TEXT NOT NULL DEFAULT 'monthly',
  status TEXT NOT NULL DEFAULT 'inactive',
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(driver_id)
);

ALTER TABLE public.driver_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Drivers can view own subscription"
ON public.driver_subscriptions FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Drivers can insert own subscription"
ON public.driver_subscriptions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Drivers can update own subscription"
ON public.driver_subscriptions FOR UPDATE
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete subscriptions"
ON public.driver_subscriptions FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
