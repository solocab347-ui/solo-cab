-- =====================================================
-- FIX: Enregistrer les commissions pour les courses fleet partenaires
-- =====================================================

-- 1. Créer une fonction pour enregistrer les commissions des fleet_partner_courses
CREATE OR REPLACE FUNCTION public.record_fleet_partner_commission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_due_date TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Ne traiter que les courses terminées (completed)
  IF NEW.status = 'completed' AND (OLD IS NULL OR OLD.status != 'completed') THEN
    
    -- Vérifier que les données financières existent
    IF NEW.commission_amount IS NOT NULL AND NEW.commission_amount > 0 THEN
      
      -- Calculer la date d'échéance selon le schedule du partenariat
      SELECT 
        CASE payment_schedule
          WHEN 'per_course' THEN NOW() + INTERVAL '48 hours'
          WHEN 'weekly' THEN date_trunc('week', NOW()) + INTERVAL '1 week'
          WHEN 'monthly' THEN date_trunc('month', NOW()) + INTERVAL '1 month'
          ELSE NOW() + INTERVAL '7 days'
        END INTO v_due_date
      FROM public.fleet_driver_partnerships
      WHERE id = NEW.partnership_id;
      
      -- Enregistrer la commission dans partnership_course_commissions
      INSERT INTO public.partnership_course_commissions (
        partnership_id,
        course_id,
        course_amount,
        commission_percentage,
        commission_amount,
        due_date,
        payment_status
      ) VALUES (
        NEW.partnership_id,
        NEW.course_id,
        NEW.course_amount,
        NEW.commission_percentage,
        NEW.commission_amount,
        COALESCE(v_due_date, NOW() + INTERVAL '7 days'),
        'pending'
      ) ON CONFLICT (partnership_id, course_id) DO NOTHING;
      
      -- Mettre à jour le total dû dans le partenariat
      UPDATE public.fleet_driver_partnerships
      SET 
        total_owed = COALESCE(total_owed, 0) + NEW.commission_amount,
        next_payment_date = COALESCE(next_payment_date, v_due_date)
      WHERE id = NEW.partnership_id;
      
      -- Marquer le paiement flotte comme "pending" si pas déjà fait
      IF NEW.fleet_payment_to_driver_status IS NULL OR NEW.fleet_payment_to_driver_status = '' THEN
        UPDATE public.fleet_partner_courses
        SET fleet_payment_to_driver_status = 'pending'
        WHERE id = NEW.id;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 2. Attacher le trigger à fleet_partner_courses
DROP TRIGGER IF EXISTS trigger_record_fleet_partner_commission ON fleet_partner_courses;
CREATE TRIGGER trigger_record_fleet_partner_commission
  AFTER UPDATE ON fleet_partner_courses
  FOR EACH ROW
  EXECUTE FUNCTION record_fleet_partner_commission();

-- 3. Mise à jour de sync_fleet_partner_course_status pour aussi assigner le driver_id à la course
CREATE OR REPLACE FUNCTION public.sync_fleet_partner_course_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Quand une course partenaire est acceptée
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    -- Mettre la course originale en "accepted" et assigner le chauffeur
    UPDATE courses 
    SET status = 'accepted', 
        driver_id = NEW.driver_id,
        updated_at = now()
    WHERE id = NEW.course_id;
    
    -- Annuler les autres demandes du même pool
    IF NEW.pool_group_id IS NOT NULL THEN
      UPDATE fleet_partner_courses
      SET status = 'cancelled', 
          cancelled_at = now(), 
          cancelled_reason = 'Claimed by another partner'
      WHERE pool_group_id = NEW.pool_group_id
        AND id != NEW.id
        AND status = 'pending';
    END IF;
  END IF;
  
  -- Quand une course partenaire est en cours
  IF NEW.status = 'in_progress' AND OLD.status = 'accepted' THEN
    UPDATE courses 
    SET status = 'in_progress', updated_at = now()
    WHERE id = NEW.course_id;
  END IF;
  
  -- Quand une course partenaire est terminée
  IF NEW.status = 'completed' AND OLD.status = 'in_progress' THEN
    UPDATE courses 
    SET status = 'completed', updated_at = now()
    WHERE id = NEW.course_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 4. Améliorer calculate_driver_fleet_commissions pour inclure les courses fleet partenaires
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
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    fdp.id AS partnership_id,
    fdp.fleet_manager_id,
    fm.company_name AS fleet_manager_name,
    fdp.commission_percentage,
    fdp.payment_schedule,
    -- Total en attente: de partnership_course_commissions OU de fleet_partner_courses (pour les plus récentes)
    GREATEST(
      COALESCE(fdp.total_owed, 0),
      COALESCE(
        (SELECT SUM(fpc.commission_amount) 
         FROM public.fleet_partner_courses fpc 
         WHERE fpc.partnership_id = fdp.id 
           AND fpc.status = 'completed'
           AND fpc.payment_settled = false), 
        0
      )
    ) AS total_pending,
    COALESCE(fdp.total_paid, 0) AS total_paid,
    fdp.next_payment_date AS next_due_date,
    -- Nombre de courses en attente
    GREATEST(
      (SELECT COUNT(*)::INTEGER FROM public.partnership_course_commissions pcc 
       WHERE pcc.partnership_id = fdp.id AND pcc.payment_status = 'pending'),
      (SELECT COUNT(*)::INTEGER FROM public.fleet_partner_courses fpc 
       WHERE fpc.partnership_id = fdp.id AND fpc.status = 'completed' AND fpc.payment_settled = false)
    ) AS courses_count
  FROM public.fleet_driver_partnerships fdp
  JOIN public.fleet_managers fm ON fdp.fleet_manager_id = fm.id
  WHERE fdp.driver_id = _driver_id
    AND fdp.status = 'accepted'
    AND fdp.contract_signed = true
  GROUP BY fdp.id, fdp.fleet_manager_id, fm.company_name, fdp.commission_percentage, fdp.payment_schedule, fdp.next_payment_date, fdp.total_owed, fdp.total_paid;
END;
$$;

-- 5. Fonction pour marquer les commissions payées (amélioration)
CREATE OR REPLACE FUNCTION public.mark_fleet_partner_commission_paid(
  p_fleet_partner_course_ids UUID[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_amount NUMERIC := 0;
  v_partnership_id UUID;
  v_course RECORD;
BEGIN
  FOR v_course IN 
    SELECT * FROM public.fleet_partner_courses 
    WHERE id = ANY(p_fleet_partner_course_ids)
      AND status = 'completed'
      AND payment_settled = false
  LOOP
    v_partnership_id := v_course.partnership_id;
    v_total_amount := v_total_amount + COALESCE(v_course.commission_amount, 0);
    
    -- Marquer comme payé
    UPDATE public.fleet_partner_courses
    SET payment_settled = true,
        payment_settled_at = NOW(),
        fleet_payment_to_driver_status = 'paid'
    WHERE id = v_course.id;
    
    -- Aussi dans partnership_course_commissions si existe
    UPDATE public.partnership_course_commissions
    SET payment_status = 'paid', paid_at = NOW()
    WHERE partnership_id = v_course.partnership_id
      AND course_id = v_course.course_id;
  END LOOP;
  
  -- Mettre à jour les totaux du partenariat
  IF v_partnership_id IS NOT NULL AND v_total_amount > 0 THEN
    UPDATE public.fleet_driver_partnerships
    SET 
      total_owed = GREATEST(0, COALESCE(total_owed, 0) - v_total_amount),
      total_paid = COALESCE(total_paid, 0) + v_total_amount,
      last_payment_date = NOW()
    WHERE id = v_partnership_id;
  END IF;
END;
$$;

-- 6. Grants
GRANT EXECUTE ON FUNCTION public.record_fleet_partner_commission() TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_fleet_partner_commission_paid(UUID[]) TO authenticated;