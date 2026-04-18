-- 1) Notifier les chauffeurs concernés AVANT le reset
INSERT INTO public.notifications (user_id, type, title, message, link, category)
SELECT 
  d.user_id,
  'stripe_connect_required',
  '⚠️ Action requise : finalisez votre compte de paiement',
  'Pour continuer à recevoir des courses sur SoloCab, vous devez activer votre compte de paiement (Stripe Connect). Cela prend 5 minutes et garantit que vous serez payé chaque lundi.',
  '/driver-welcome?step=stripe',
  'account'
FROM public.drivers d
WHERE d.onboarding_completed = true
  AND (d.stripe_connect_charges_enabled IS NOT TRUE 
       OR d.stripe_connect_account_id IS NULL);

-- 2) Reset onboarding_completed pour les chauffeurs sans Stripe Connect actif
UPDATE public.drivers
SET 
  onboarding_completed = false,
  updated_at = now()
WHERE onboarding_completed = true
  AND (stripe_connect_charges_enabled IS NOT TRUE 
       OR stripe_connect_account_id IS NULL);

-- 3) Trigger : empêche onboarding_completed=true sans Stripe Connect actif
CREATE OR REPLACE FUNCTION public.enforce_stripe_connect_before_onboarding()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.onboarding_completed = true 
     AND (OLD.onboarding_completed IS DISTINCT FROM NEW.onboarding_completed) THEN
    
    IF NEW.stripe_connect_account_id IS NULL 
       OR NEW.stripe_connect_charges_enabled IS NOT TRUE THEN
      RAISE EXCEPTION 'Onboarding ne peut être complété sans compte Stripe Connect actif (charges_enabled=true). Driver ID: %', NEW.id
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_stripe_connect_onboarding ON public.drivers;
CREATE TRIGGER trg_enforce_stripe_connect_onboarding
  BEFORE UPDATE ON public.drivers
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_stripe_connect_before_onboarding();