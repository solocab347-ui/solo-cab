
-- 1. Client Risk Scores
CREATE TABLE public.client_risk_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE UNIQUE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  score INTEGER NOT NULL DEFAULT 0,
  successful_payments INTEGER NOT NULL DEFAULT 0,
  failed_payments INTEGER NOT NULL DEFAULT 0,
  abusive_cancellations INTEGER NOT NULL DEFAULT 0,
  no_shows INTEGER NOT NULL DEFAULT 0,
  is_blocked BOOLEAN NOT NULL DEFAULT false,
  blocked_reason TEXT,
  blocked_at TIMESTAMPTZ,
  last_incident_at TIMESTAMPTZ,
  last_incident_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.client_risk_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Drivers view risk scores of their clients"
  ON public.client_risk_scores FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients c
      JOIN public.drivers d ON d.user_id = auth.uid()
      WHERE c.id = client_risk_scores.client_id
      AND c.driver_id = d.id
    )
  );

-- 2. Client Fraud Flags
CREATE TABLE public.client_fraud_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  flag_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  details JSONB,
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.client_fraud_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Drivers view fraud flags of their clients"
  ON public.client_fraud_flags FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients c
      JOIN public.drivers d ON d.user_id = auth.uid()
      WHERE c.id = client_fraud_flags.client_id
      AND c.driver_id = d.id
    )
  );

-- 3. RPC to recalculate risk score
CREATE OR REPLACE FUNCTION public.update_client_risk_score(p_client_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_successful INT;
  v_failed INT;
  v_cancellations INT;
  v_no_shows INT;
  v_score INT;
BEGIN
  SELECT user_id INTO v_user_id FROM clients WHERE id = p_client_id;
  IF v_user_id IS NULL THEN RETURN; END IF;

  SELECT COUNT(*) INTO v_successful FROM payments WHERE client_id = p_client_id AND status = 'succeeded';
  SELECT COUNT(*) INTO v_failed FROM payments WHERE client_id = p_client_id AND status IN ('failed', 'canceled');
  SELECT COUNT(*) INTO v_cancellations FROM courses WHERE client_id = p_client_id AND status = 'cancelled' AND cancelled_by = 'client' AND cancellation_fee_applied = true;
  SELECT COUNT(*) INTO v_no_shows FROM courses WHERE client_id = p_client_id AND status = 'no_show';

  v_score := v_successful - (v_failed * 3) - (v_cancellations * 2) - (v_no_shows * 2);

  INSERT INTO client_risk_scores (client_id, user_id, score, successful_payments, failed_payments, abusive_cancellations, no_shows, is_blocked, blocked_reason, blocked_at, updated_at)
  VALUES (
    p_client_id, v_user_id, v_score, v_successful, v_failed, v_cancellations, v_no_shows,
    v_score <= -5, CASE WHEN v_score <= -5 THEN 'Score trop bas (' || v_score || ')' ELSE NULL END,
    CASE WHEN v_score <= -5 THEN now() ELSE NULL END, now()
  )
  ON CONFLICT (client_id) DO UPDATE SET
    score = EXCLUDED.score, successful_payments = EXCLUDED.successful_payments,
    failed_payments = EXCLUDED.failed_payments, abusive_cancellations = EXCLUDED.abusive_cancellations,
    no_shows = EXCLUDED.no_shows, is_blocked = EXCLUDED.is_blocked,
    blocked_reason = EXCLUDED.blocked_reason,
    blocked_at = CASE WHEN EXCLUDED.is_blocked AND NOT client_risk_scores.is_blocked THEN now() ELSE client_risk_scores.blocked_at END,
    updated_at = now();
END;
$$;

-- 4. Trigger on payments
CREATE OR REPLACE FUNCTION public.trg_update_risk_on_payment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.client_id IS NOT NULL THEN PERFORM update_client_risk_score(NEW.client_id); END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_risk_score_on_payment
  AFTER INSERT OR UPDATE OF status ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.trg_update_risk_on_payment();

-- 5. Trigger on course status
CREATE OR REPLACE FUNCTION public.trg_update_risk_on_course_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.client_id IS NOT NULL AND NEW.status IN ('cancelled', 'no_show') AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    PERFORM update_client_risk_score(NEW.client_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_risk_score_on_course
  AFTER UPDATE OF status ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.trg_update_risk_on_course_status();
