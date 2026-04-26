-- Trigger : créer automatiquement une alerte critique pour chaque virement chauffeur échoué
CREATE OR REPLACE FUNCTION public.create_settlement_alert_on_failure()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Détecte transition vers 'failed' OU insertion directe en 'failed'
  IF NEW.transfer_status = 'failed'
     AND (TG_OP = 'INSERT' OR OLD.transfer_status IS DISTINCT FROM NEW.transfer_status) THEN

    -- Évite les doublons : pas d'alerte si déjà présente non résolue pour ce balance
    IF NOT EXISTS (
      SELECT 1 FROM public.settlement_alerts
      WHERE settlement_id = NEW.settlement_id
        AND driver_id = NEW.driver_id
        AND alert_type = 'transfer_failed'
        AND is_resolved = false
    ) THEN
      INSERT INTO public.settlement_alerts (
        settlement_id, driver_id, alert_type, severity, message, details
      ) VALUES (
        NEW.settlement_id,
        NEW.driver_id,
        'transfer_failed',
        CASE
          WHEN NEW.transfer_error ILIKE '%insufficient%' THEN 'critical'
          ELSE 'high'
        END,
        COALESCE('Virement échoué : ' || LEFT(NEW.transfer_error, 200), 'Virement chauffeur échoué'),
        jsonb_build_object(
          'net_amount', NEW.net_amount,
          'transfer_error', NEW.transfer_error,
          'driver_weekly_balance_id', NEW.id
        )
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_settlement_alert_on_failure ON public.driver_weekly_balances;
CREATE TRIGGER trg_create_settlement_alert_on_failure
  AFTER INSERT OR UPDATE OF transfer_status ON public.driver_weekly_balances
  FOR EACH ROW
  EXECUTE FUNCTION public.create_settlement_alert_on_failure();

-- Backfill : créer rétroactivement les alertes manquantes pour les virements déjà échoués
INSERT INTO public.settlement_alerts (settlement_id, driver_id, alert_type, severity, message, details)
SELECT
  dwb.settlement_id,
  dwb.driver_id,
  'transfer_failed',
  CASE WHEN dwb.transfer_error ILIKE '%insufficient%' THEN 'critical' ELSE 'high' END,
  COALESCE('Virement échoué : ' || LEFT(dwb.transfer_error, 200), 'Virement chauffeur échoué'),
  jsonb_build_object(
    'net_amount', dwb.net_amount,
    'transfer_error', dwb.transfer_error,
    'driver_weekly_balance_id', dwb.id
  )
FROM public.driver_weekly_balances dwb
WHERE dwb.transfer_status = 'failed'
  AND NOT EXISTS (
    SELECT 1 FROM public.settlement_alerts sa
    WHERE sa.settlement_id = dwb.settlement_id
      AND sa.driver_id = dwb.driver_id
      AND sa.alert_type = 'transfer_failed'
  );