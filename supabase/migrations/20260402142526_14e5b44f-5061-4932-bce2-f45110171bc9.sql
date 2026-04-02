
-- Create function first
CREATE OR REPLACE FUNCTION public.update_client_risk_score()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id UUID;
  v_user_id UUID;
  v_score INT := 0;
  v_successful INT := 0;
  v_failed INT := 0;
  v_cancellations INT := 0;
BEGIN
  IF TG_TABLE_NAME = 'courses' THEN
    v_client_id := NEW.client_id;
  ELSIF TG_TABLE_NAME = 'payments' THEN
    v_client_id := NEW.client_id;
  END IF;

  IF v_client_id IS NULL THEN RETURN NEW; END IF;

  SELECT user_id INTO v_user_id FROM clients WHERE id = v_client_id;
  IF v_user_id IS NULL THEN RETURN NEW; END IF;

  SELECT COUNT(*) INTO v_successful FROM courses WHERE client_id = v_client_id AND status = 'completed';
  SELECT COUNT(*) INTO v_failed FROM payments WHERE client_id = v_client_id AND status = 'failed';
  SELECT COUNT(*) INTO v_cancellations FROM courses WHERE client_id = v_client_id AND status = 'cancelled';

  v_score := v_successful - (v_failed * 3) - (v_cancellations * 2);

  INSERT INTO client_risk_scores (
    client_id, user_id, score, successful_payments, failed_payments, 
    abusive_cancellations, no_shows, is_blocked, blocked_reason, blocked_at,
    last_incident_type, last_incident_at
  ) VALUES (
    v_client_id, v_user_id, v_score, v_successful, v_failed,
    v_cancellations, 0, v_score <= -5, 
    CASE WHEN v_score <= -5 THEN 'Score trop bas' ELSE NULL END,
    CASE WHEN v_score <= -5 THEN now() ELSE NULL END,
    CASE 
      WHEN TG_TABLE_NAME = 'courses' AND NEW.status = 'cancelled' THEN 'cancellation'
      WHEN TG_TABLE_NAME = 'payments' AND NEW.status = 'failed' THEN 'payment_failed'
      ELSE NULL
    END,
    CASE WHEN TG_TABLE_NAME = 'courses' AND NEW.status = 'cancelled' THEN now()
         WHEN TG_TABLE_NAME = 'payments' AND NEW.status = 'failed' THEN now()
         ELSE NULL END
  )
  ON CONFLICT (client_id) DO UPDATE SET
    score = EXCLUDED.score,
    successful_payments = EXCLUDED.successful_payments,
    failed_payments = EXCLUDED.failed_payments,
    abusive_cancellations = EXCLUDED.abusive_cancellations,
    is_blocked = EXCLUDED.is_blocked,
    blocked_reason = CASE WHEN EXCLUDED.is_blocked AND NOT client_risk_scores.is_blocked 
      THEN 'Score trop bas' ELSE client_risk_scores.blocked_reason END,
    blocked_at = CASE WHEN EXCLUDED.is_blocked AND NOT client_risk_scores.is_blocked 
      THEN now() ELSE client_risk_scores.blocked_at END,
    last_incident_type = COALESCE(EXCLUDED.last_incident_type, client_risk_scores.last_incident_type),
    last_incident_at = COALESCE(EXCLUDED.last_incident_at, client_risk_scores.last_incident_at),
    updated_at = now();

  RETURN NEW;
END;
$$;

-- Create triggers
DROP TRIGGER IF EXISTS trg_update_risk_score_on_course ON courses;
CREATE TRIGGER trg_update_risk_score_on_course
  AFTER UPDATE OF status ON courses
  FOR EACH ROW
  WHEN (NEW.status IN ('completed', 'cancelled') AND OLD.status IS DISTINCT FROM NEW.status AND NEW.client_id IS NOT NULL)
  EXECUTE FUNCTION update_client_risk_score();

DROP TRIGGER IF EXISTS trg_update_risk_score_on_payment ON payments;
CREATE TRIGGER trg_update_risk_score_on_payment
  AFTER INSERT OR UPDATE OF status ON payments
  FOR EACH ROW
  WHEN (NEW.client_id IS NOT NULL)
  EXECUTE FUNCTION update_client_risk_score();
