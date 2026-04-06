
-- Add course_started_at to track when the course actually started
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS course_started_at timestamptz;

-- Add final_payment_intent_id if not exists (some code references it)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'courses' AND column_name = 'final_payment_intent_id') THEN
    ALTER TABLE public.courses ADD COLUMN final_payment_intent_id text;
  END IF;
END $$;

-- Add final_payment_at if not exists
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'courses' AND column_name = 'final_payment_at') THEN
    ALTER TABLE public.courses ADD COLUMN final_payment_at timestamptz;
  END IF;
END $$;

-- Add course_finalized_by_driver_at if not exists
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'courses' AND column_name = 'course_finalized_by_driver_at') THEN
    ALTER TABLE public.courses ADD COLUMN course_finalized_by_driver_at timestamptz;
  END IF;
END $$;

-- Add payment_retry_count if not exists
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'courses' AND column_name = 'payment_retry_count') THEN
    ALTER TABLE public.courses ADD COLUMN payment_retry_count integer DEFAULT 0;
  END IF;
END $$;

-- Add last_payment_error if not exists
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'courses' AND column_name = 'last_payment_error') THEN
    ALTER TABLE public.courses ADD COLUMN last_payment_error text;
  END IF;
END $$;

-- Add stripe_customer_id to courses if not exists
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'courses' AND column_name = 'stripe_customer_id') THEN
    ALTER TABLE public.courses ADD COLUMN stripe_customer_id text;
  END IF;
END $$;
