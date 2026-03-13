
-- 1. Table des chauffeurs favoris (liste privilégiée, remplace le partenariat bilatéral obligatoire)
CREATE TABLE IF NOT EXISTS public.driver_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  favorite_driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  UNIQUE(driver_id, favorite_driver_id)
);

ALTER TABLE public.driver_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Drivers can manage their own favorites"
  ON public.driver_favorites FOR ALL TO authenticated
  USING (driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid()))
  WITH CHECK (driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid()));

CREATE POLICY "Drivers can see if they are favorited"
  ON public.driver_favorites FOR SELECT TO authenticated
  USING (favorite_driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid()));

-- 2. Add new columns to partner_course_pool for open network sharing
ALTER TABLE public.partner_course_pool 
  ALTER COLUMN partnership_ids DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS sharing_scope TEXT NOT NULL DEFAULT 'network',
  ADD COLUMN IF NOT EXISTS target_driver_ids UUID[] DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS solocab_fee_cents INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS pickup_latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS pickup_longitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS pickup_city TEXT,
  ADD COLUMN IF NOT EXISTS pickup_sectors TEXT[];

-- Make partnership_ids nullable (no longer required for open network)
ALTER TABLE public.partner_course_pool ALTER COLUMN partnership_ids SET DEFAULT NULL;

-- 3. Add solocab fee tracking to shared_courses
ALTER TABLE public.shared_courses 
  ALTER COLUMN partnership_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS solocab_fee_cents INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS sharing_scope TEXT DEFAULT 'network',
  ADD COLUMN IF NOT EXISTS pool_entry_id UUID REFERENCES public.partner_course_pool(id);

-- Make partnership_id nullable for open network courses
ALTER TABLE public.shared_courses ALTER COLUMN partnership_id SET DEFAULT NULL;

-- 4. Table for weekly admin sharing reports
CREATE TABLE IF NOT EXISTS public.sharing_weekly_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  total_shares INTEGER NOT NULL DEFAULT 0,
  total_solocab_fees_cents INTEGER NOT NULL DEFAULT 0,
  total_commission_cents INTEGER NOT NULL DEFAULT 0,
  total_course_amount_cents INTEGER NOT NULL DEFAULT 0,
  report_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(week_start)
);

ALTER TABLE public.sharing_weekly_reports ENABLE ROW LEVEL SECURITY;

-- Only admins can read reports (via has_role)
CREATE POLICY "Admins can read sharing reports"
  ON public.sharing_weekly_reports FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 5. Function to calculate sharing commission based on course amount
CREATE OR REPLACE FUNCTION public.calculate_sharing_commission(course_amount_cents INTEGER)
RETURNS TABLE(commission_percentage NUMERIC, commission_cents INTEGER, receiver_cents INTEGER, solocab_fee_cents INTEGER)
LANGUAGE plpgsql STABLE AS $$
BEGIN
  -- < 3000 cents (30€) → 15%, >= 3000 cents → 20%
  -- SoloCab fee is always 10 cents
  IF course_amount_cents < 3000 THEN
    commission_percentage := 15;
  ELSE
    commission_percentage := 20;
  END IF;
  
  commission_cents := ROUND(course_amount_cents * commission_percentage / 100);
  solocab_fee_cents := 10;
  receiver_cents := course_amount_cents - commission_cents - solocab_fee_cents;
  
  RETURN NEXT;
END;
$$;

-- 6. Enable realtime on partner_course_pool for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.driver_favorites;
