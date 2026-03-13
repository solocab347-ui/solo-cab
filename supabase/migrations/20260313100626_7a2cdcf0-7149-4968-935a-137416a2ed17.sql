
-- Add card hold columns to courses table if they don't exist
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'stripe_hold_payment_intent_id') THEN
    ALTER TABLE public.courses ADD COLUMN stripe_hold_payment_intent_id text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'card_hold_amount') THEN
    ALTER TABLE public.courses ADD COLUMN card_hold_amount numeric DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'card_hold_confirmed_at') THEN
    ALTER TABLE public.courses ADD COLUMN card_hold_confirmed_at timestamptz;
  END IF;
END $$;
