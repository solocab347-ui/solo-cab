-- Ajouter les champs de suivi des commissions et paiements dans fleet_driver_partnerships
ALTER TABLE public.fleet_driver_partnerships
ADD COLUMN IF NOT EXISTS payment_schedule TEXT DEFAULT 'per_course' CHECK (payment_schedule IN ('per_course', 'weekly', 'monthly')),
ADD COLUMN IF NOT EXISTS last_payment_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS next_payment_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS total_owed NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_paid NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS partnership_suspended BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS suspension_reason TEXT,
ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS payment_reminder_sent_at TIMESTAMP WITH TIME ZONE;

-- Ajouter partnership_terms dans fleet_managers si pas déjà fait
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'fleet_managers' 
                 AND column_name = 'default_payment_schedule') THEN
    ALTER TABLE public.fleet_managers 
    ADD COLUMN default_payment_schedule TEXT DEFAULT 'per_course' CHECK (default_payment_schedule IN ('per_course', 'weekly', 'monthly'));
  END IF;
END $$;

-- Table pour suivre les commissions par course pour les partenariats
CREATE TABLE IF NOT EXISTS public.partnership_course_commissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partnership_id UUID NOT NULL REFERENCES public.fleet_driver_partnerships(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  course_amount NUMERIC NOT NULL,
  commission_percentage NUMERIC NOT NULL,
  commission_amount NUMERIC NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'overdue')),
  due_date TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(partnership_id, course_id)
);

-- Enable RLS
ALTER TABLE public.partnership_course_commissions ENABLE ROW LEVEL SECURITY;

-- RLS policies pour partnership_course_commissions
CREATE POLICY "Admins can manage all partnership commissions"
ON public.partnership_course_commissions
FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Fleet managers can view commissions for their partnerships"
ON public.partnership_course_commissions
FOR SELECT
USING (
  partnership_id IN (
    SELECT id FROM public.fleet_driver_partnerships 
    WHERE fleet_manager_id IN (
      SELECT id FROM public.fleet_managers WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Drivers can view and update their commissions"
ON public.partnership_course_commissions
FOR ALL
USING (
  partnership_id IN (
    SELECT id FROM public.fleet_driver_partnerships 
    WHERE driver_id = get_driver_id(auth.uid())
  )
);

-- Fonction pour calculer les commissions dues par un chauffeur à un gestionnaire
CREATE OR REPLACE FUNCTION public.calculate_driver_fleet_commissions(_driver_id UUID)
RETURNS TABLE(
  partnership_id UUID,
  fleet_manager_id UUID,
  fleet_manager_name TEXT,
  commission_percentage NUMERIC,
  payment_schedule TEXT,
  total_pending NUMERIC,
  total_paid NUMERIC,
  next_due_date TIMESTAMP WITH TIME ZONE,
  courses_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    fdp.id AS partnership_id,
    fdp.fleet_manager_id,
    fm.company_name AS fleet_manager_name,
    fdp.commission_percentage,
    fdp.payment_schedule,
    COALESCE(SUM(CASE WHEN pcc.payment_status = 'pending' THEN pcc.commission_amount ELSE 0 END), 0) AS total_pending,
    COALESCE(SUM(CASE WHEN pcc.payment_status = 'paid' THEN pcc.commission_amount ELSE 0 END), 0) AS total_paid,
    fdp.next_payment_date AS next_due_date,
    COUNT(CASE WHEN pcc.payment_status = 'pending' THEN 1 END)::INTEGER AS courses_count
  FROM public.fleet_driver_partnerships fdp
  JOIN public.fleet_managers fm ON fdp.fleet_manager_id = fm.id
  LEFT JOIN public.partnership_course_commissions pcc ON pcc.partnership_id = fdp.id
  WHERE fdp.driver_id = _driver_id
    AND fdp.status = 'accepted'
    AND fdp.contract_signed = true
  GROUP BY fdp.id, fdp.fleet_manager_id, fm.company_name, fdp.commission_percentage, fdp.payment_schedule, fdp.next_payment_date;
END;
$$;

-- Fonction pour enregistrer une commission suite à une course
CREATE OR REPLACE FUNCTION public.record_partnership_course_commission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_partnership RECORD;
  v_course_amount NUMERIC;
  v_commission_amount NUMERIC;
  v_due_date TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Ne traiter que les courses complétées
  IF NEW.status = 'completed' AND (OLD IS NULL OR OLD.status != 'completed') THEN
    -- Vérifier si le chauffeur a un partenariat actif
    SELECT fdp.* INTO v_partnership
    FROM public.fleet_driver_partnerships fdp
    WHERE fdp.driver_id = NEW.driver_id
      AND fdp.status = 'accepted'
      AND fdp.contract_signed = true
      AND fdp.partnership_suspended = false
    LIMIT 1;
    
    IF v_partnership IS NOT NULL THEN
      -- Récupérer le montant de la course via la facture
      SELECT f.amount INTO v_course_amount
      FROM public.factures f
      WHERE f.course_id = NEW.id
      LIMIT 1;
      
      IF v_course_amount IS NOT NULL THEN
        -- Calculer la commission
        v_commission_amount := v_course_amount * (v_partnership.commission_percentage / 100);
        
        -- Calculer la date d'échéance selon le schedule
        CASE v_partnership.payment_schedule
          WHEN 'per_course' THEN
            v_due_date := NOW() + INTERVAL '48 hours';
          WHEN 'weekly' THEN
            v_due_date := date_trunc('week', NOW()) + INTERVAL '1 week';
          WHEN 'monthly' THEN
            v_due_date := date_trunc('month', NOW()) + INTERVAL '1 month';
          ELSE
            v_due_date := NOW() + INTERVAL '7 days';
        END CASE;
        
        -- Enregistrer la commission
        INSERT INTO public.partnership_course_commissions (
          partnership_id,
          course_id,
          course_amount,
          commission_percentage,
          commission_amount,
          due_date
        ) VALUES (
          v_partnership.id,
          NEW.id,
          v_course_amount,
          v_partnership.commission_percentage,
          v_commission_amount,
          v_due_date
        ) ON CONFLICT (partnership_id, course_id) DO NOTHING;
        
        -- Mettre à jour le total dû
        UPDATE public.fleet_driver_partnerships
        SET total_owed = COALESCE(total_owed, 0) + v_commission_amount,
            next_payment_date = COALESCE(next_payment_date, v_due_date)
        WHERE id = v_partnership.id;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Créer le trigger pour enregistrer les commissions
DROP TRIGGER IF EXISTS record_partnership_commission_trigger ON public.courses;
CREATE TRIGGER record_partnership_commission_trigger
AFTER UPDATE ON public.courses
FOR EACH ROW
EXECUTE FUNCTION public.record_partnership_course_commission();

-- Fonction pour marquer une commission comme payée
CREATE OR REPLACE FUNCTION public.mark_commission_paid(_commission_ids UUID[])
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_total_amount NUMERIC;
  v_partnership_id UUID;
BEGIN
  -- Récupérer le partnership_id et le total
  SELECT partnership_id, SUM(commission_amount) 
  INTO v_partnership_id, v_total_amount
  FROM public.partnership_course_commissions
  WHERE id = ANY(_commission_ids)
  GROUP BY partnership_id;
  
  -- Mettre à jour les commissions
  UPDATE public.partnership_course_commissions
  SET payment_status = 'paid',
      paid_at = NOW()
  WHERE id = ANY(_commission_ids);
  
  -- Mettre à jour le partenariat
  UPDATE public.fleet_driver_partnerships
  SET total_owed = GREATEST(0, COALESCE(total_owed, 0) - v_total_amount),
      total_paid = COALESCE(total_paid, 0) + v_total_amount,
      last_payment_date = NOW()
  WHERE id = v_partnership_id;
END;
$$;

-- Ajouter les champs de suspension dans drivers pour bloquer les partenariats
ALTER TABLE public.drivers
ADD COLUMN IF NOT EXISTS partnerships_suspended BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS partnerships_suspended_reason TEXT,
ADD COLUMN IF NOT EXISTS partnerships_suspended_at TIMESTAMP WITH TIME ZONE;