-- =====================================================
-- EXTENSION: Système de gestion des courses Entreprise → Gestionnaire
-- avec commissions chauffeurs et contrats de paiement indirect
-- =====================================================

-- 1. Ajout de colonnes sur fleet_partner_courses pour le suivi entreprise
ALTER TABLE public.fleet_partner_courses 
ADD COLUMN IF NOT EXISTS payment_handled_by TEXT DEFAULT 'driver' CHECK (payment_handled_by IN ('driver', 'fleet_manager')),
ADD COLUMN IF NOT EXISTS payment_declared_by_driver BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS payment_declared_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS driver_commission_to_fleet NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS driver_commission_paid_to_fleet BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS driver_commission_paid_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS fleet_to_driver_payment_pending NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS fleet_to_driver_payment_sent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS fleet_to_driver_payment_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS fleet_to_driver_payment_confirmed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS fleet_to_driver_payment_confirmed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS payment_notes TEXT;

-- 2. Table pour les contrats de paiement indirect (gestionnaire encaisse pour le chauffeur)
CREATE TABLE IF NOT EXISTS public.fleet_indirect_payment_contracts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partnership_id UUID NOT NULL REFERENCES public.fleet_driver_partnerships(id) ON DELETE CASCADE,
  fleet_manager_id UUID NOT NULL REFERENCES public.fleet_managers(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  
  -- Type de contrat
  contract_type TEXT NOT NULL DEFAULT 'indirect_payment' CHECK (contract_type IN ('indirect_payment', 'direct_collection')),
  
  -- Conditions du contrat
  commission_percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
  payment_frequency TEXT NOT NULL DEFAULT 'per_course' CHECK (payment_frequency IN ('per_course', 'weekly', 'monthly')),
  payment_day INTEGER CHECK (payment_day BETWEEN 1 AND 31),
  
  -- Clauses spécifiques
  clauses JSONB DEFAULT '{}',
  notes TEXT,
  
  -- Signatures
  fleet_manager_signed BOOLEAN DEFAULT false,
  fleet_manager_signed_at TIMESTAMPTZ,
  driver_signed BOOLEAN DEFAULT false,
  driver_signed_at TIMESTAMPTZ,
  contract_signed BOOLEAN DEFAULT false,
  contract_signed_at TIMESTAMPTZ,
  
  -- Statut
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'active', 'suspended', 'terminated')),
  
  -- Tracking financier
  total_collected_by_fleet NUMERIC(10,2) DEFAULT 0,
  total_paid_to_driver NUMERIC(10,2) DEFAULT 0,
  current_balance_owed_to_driver NUMERIC(10,2) DEFAULT 0,
  last_settlement_date TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index pour recherche rapide
CREATE INDEX IF NOT EXISTS idx_fleet_indirect_payment_contracts_partnership ON public.fleet_indirect_payment_contracts(partnership_id);
CREATE INDEX IF NOT EXISTS idx_fleet_indirect_payment_contracts_fleet ON public.fleet_indirect_payment_contracts(fleet_manager_id);
CREATE INDEX IF NOT EXISTS idx_fleet_indirect_payment_contracts_driver ON public.fleet_indirect_payment_contracts(driver_id);
CREATE INDEX IF NOT EXISTS idx_fleet_indirect_payment_contracts_status ON public.fleet_indirect_payment_contracts(status);

-- 3. Table pour les paiements entre gestionnaire et chauffeur (paiements indirects)
CREATE TABLE IF NOT EXISTS public.fleet_driver_indirect_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID NOT NULL REFERENCES public.fleet_indirect_payment_contracts(id) ON DELETE CASCADE,
  fleet_manager_id UUID NOT NULL REFERENCES public.fleet_managers(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  
  -- Montants
  total_collected NUMERIC(10,2) NOT NULL,
  commission_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  amount_to_pay_driver NUMERIC(10,2) NOT NULL,
  
  -- Courses concernées
  course_ids UUID[] DEFAULT '{}',
  courses_count INTEGER DEFAULT 0,
  period_start DATE,
  period_end DATE,
  
  -- Statut du paiement
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'confirmed', 'disputed')),
  
  -- Envoi par le gestionnaire
  sent_at TIMESTAMPTZ,
  sent_by_user_id UUID,
  payment_method TEXT,
  payment_reference TEXT,
  payment_proof_url TEXT,
  
  -- Confirmation par le chauffeur
  confirmed_at TIMESTAMPTZ,
  confirmed_by_user_id UUID,
  
  -- Dispute
  dispute_reason TEXT,
  dispute_created_at TIMESTAMPTZ,
  dispute_resolved_at TIMESTAMPTZ,
  dispute_resolution TEXT,
  
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fleet_driver_indirect_payments_contract ON public.fleet_driver_indirect_payments(contract_id);
CREATE INDEX IF NOT EXISTS idx_fleet_driver_indirect_payments_fleet ON public.fleet_driver_indirect_payments(fleet_manager_id);
CREATE INDEX IF NOT EXISTS idx_fleet_driver_indirect_payments_driver ON public.fleet_driver_indirect_payments(driver_id);
CREATE INDEX IF NOT EXISTS idx_fleet_driver_indirect_payments_status ON public.fleet_driver_indirect_payments(status);

-- 4. Vue pour les courses entreprise reçues par le gestionnaire avec détails financiers
CREATE OR REPLACE VIEW public.fleet_company_courses_view AS
SELECT 
  fpc.id,
  fpc.course_id,
  fpc.fleet_manager_id,
  fpc.driver_id,
  fpc.partnership_id,
  fpc.company_id,
  fpc.company_request_id,
  fpc.course_amount,
  fpc.commission_percentage,
  fpc.commission_amount,
  fpc.earnings_for_driver,
  fpc.equipment_type,
  fpc.payment_source,
  fpc.payment_handled_by,
  fpc.payment_declared_by_driver,
  fpc.payment_declared_at,
  fpc.driver_commission_to_fleet,
  fpc.driver_commission_paid_to_fleet,
  fpc.fleet_to_driver_payment_pending,
  fpc.fleet_to_driver_payment_sent,
  fpc.status,
  fpc.created_at,
  fpc.completed_at,
  c.pickup_address,
  c.destination_address,
  c.scheduled_date,
  c.status AS course_status,
  comp.company_name,
  comp.logo_url AS company_logo,
  ccr.guest_employee_name,
  ccr.guest_employee_email,
  ccr.payment_method_requested
FROM public.fleet_partner_courses fpc
JOIN public.courses c ON c.id = fpc.course_id
LEFT JOIN public.companies comp ON comp.id = fpc.company_id
LEFT JOIN public.company_course_requests ccr ON ccr.id = fpc.company_request_id;

-- 5. Enable RLS on new tables
ALTER TABLE public.fleet_indirect_payment_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fleet_driver_indirect_payments ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies pour fleet_indirect_payment_contracts
CREATE POLICY "Fleet managers can view their contracts"
  ON public.fleet_indirect_payment_contracts FOR SELECT
  USING (
    fleet_manager_id IN (SELECT id FROM public.fleet_managers WHERE user_id = auth.uid())
  );

CREATE POLICY "Drivers can view their contracts"
  ON public.fleet_indirect_payment_contracts FOR SELECT
  USING (
    driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid())
  );

CREATE POLICY "Fleet managers can create contracts"
  ON public.fleet_indirect_payment_contracts FOR INSERT
  WITH CHECK (
    fleet_manager_id IN (SELECT id FROM public.fleet_managers WHERE user_id = auth.uid())
  );

CREATE POLICY "Fleet managers can update their contracts"
  ON public.fleet_indirect_payment_contracts FOR UPDATE
  USING (
    fleet_manager_id IN (SELECT id FROM public.fleet_managers WHERE user_id = auth.uid())
  );

CREATE POLICY "Drivers can update contracts for signing"
  ON public.fleet_indirect_payment_contracts FOR UPDATE
  USING (
    driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid())
  );

-- 7. RLS Policies pour fleet_driver_indirect_payments
CREATE POLICY "Fleet managers can view their payments"
  ON public.fleet_driver_indirect_payments FOR SELECT
  USING (
    fleet_manager_id IN (SELECT id FROM public.fleet_managers WHERE user_id = auth.uid())
  );

CREATE POLICY "Drivers can view their payments"
  ON public.fleet_driver_indirect_payments FOR SELECT
  USING (
    driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid())
  );

CREATE POLICY "Fleet managers can create payments"
  ON public.fleet_driver_indirect_payments FOR INSERT
  WITH CHECK (
    fleet_manager_id IN (SELECT id FROM public.fleet_managers WHERE user_id = auth.uid())
  );

CREATE POLICY "Fleet managers can update payments"
  ON public.fleet_driver_indirect_payments FOR UPDATE
  USING (
    fleet_manager_id IN (SELECT id FROM public.fleet_managers WHERE user_id = auth.uid())
  );

CREATE POLICY "Drivers can update payments for confirmation"
  ON public.fleet_driver_indirect_payments FOR UPDATE
  USING (
    driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid())
  );

-- 8. Trigger pour mettre à jour updated_at
CREATE TRIGGER update_fleet_indirect_payment_contracts_updated_at
  BEFORE UPDATE ON public.fleet_indirect_payment_contracts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_fleet_driver_indirect_payments_updated_at
  BEFORE UPDATE ON public.fleet_driver_indirect_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 9. Fonction RPC pour déclarer un paiement sur place (chauffeur)
CREATE OR REPLACE FUNCTION public.declare_fleet_course_payment_on_site(
  p_course_id UUID,
  p_payment_method TEXT DEFAULT 'cash'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_driver_id UUID;
  v_fpc_record RECORD;
  v_commission_amount NUMERIC(10,2);
BEGIN
  -- Vérifier que le chauffeur est bien propriétaire
  SELECT id INTO v_driver_id FROM drivers WHERE user_id = auth.uid();
  IF v_driver_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Chauffeur non trouvé');
  END IF;

  -- Récupérer les infos de la course partagée
  SELECT * INTO v_fpc_record
  FROM fleet_partner_courses
  WHERE course_id = p_course_id AND driver_id = v_driver_id;

  IF v_fpc_record IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Course non trouvée');
  END IF;

  -- Calculer la commission due au gestionnaire
  v_commission_amount := COALESCE(v_fpc_record.commission_amount, 
    (COALESCE(v_fpc_record.course_amount, 0) * COALESCE(v_fpc_record.commission_percentage, 0) / 100));

  -- Mettre à jour la course
  UPDATE fleet_partner_courses
  SET 
    payment_declared_by_driver = true,
    payment_declared_at = now(),
    payment_method_used = p_payment_method,
    payment_handled_by = 'driver',
    driver_commission_to_fleet = v_commission_amount,
    driver_commission_paid_to_fleet = false
  WHERE id = v_fpc_record.id;

  RETURN jsonb_build_object(
    'success', true, 
    'commission_amount', v_commission_amount,
    'message', 'Paiement déclaré avec succès'
  );
END;
$$;

-- 10. Fonction RPC pour que le gestionnaire déclare avoir reçu le paiement d'une entreprise
CREATE OR REPLACE FUNCTION public.fleet_receive_company_payment(
  p_course_id UUID,
  p_amount NUMERIC(10,2),
  p_payment_method TEXT DEFAULT 'transfer'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fm_id UUID;
  v_fpc_record RECORD;
  v_driver_amount NUMERIC(10,2);
  v_commission_amount NUMERIC(10,2);
BEGIN
  -- Vérifier que c'est bien le gestionnaire
  SELECT id INTO v_fm_id FROM fleet_managers WHERE user_id = auth.uid();
  IF v_fm_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Gestionnaire non trouvé');
  END IF;

  -- Récupérer les infos
  SELECT * INTO v_fpc_record
  FROM fleet_partner_courses
  WHERE course_id = p_course_id AND fleet_manager_id = v_fm_id;

  IF v_fpc_record IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Course non trouvée');
  END IF;

  -- Calculer la répartition
  v_commission_amount := (p_amount * COALESCE(v_fpc_record.commission_percentage, 0) / 100);
  v_driver_amount := p_amount - v_commission_amount;

  -- Mettre à jour la course
  UPDATE fleet_partner_courses
  SET 
    course_amount = p_amount,
    commission_amount = v_commission_amount,
    earnings_for_driver = v_driver_amount,
    payment_handled_by = 'fleet_manager',
    company_payment_status = 'received',
    company_pays_fleet_amount = p_amount,
    fleet_to_driver_payment_pending = v_driver_amount,
    fleet_to_driver_payment_sent = false,
    payment_method_used = p_payment_method
  WHERE id = v_fpc_record.id;

  -- Mettre à jour le contrat de paiement indirect si existant
  UPDATE fleet_indirect_payment_contracts
  SET 
    total_collected_by_fleet = total_collected_by_fleet + p_amount,
    current_balance_owed_to_driver = current_balance_owed_to_driver + v_driver_amount,
    updated_at = now()
  WHERE fleet_manager_id = v_fm_id 
    AND driver_id = v_fpc_record.driver_id 
    AND status = 'active';

  RETURN jsonb_build_object(
    'success', true,
    'total_received', p_amount,
    'commission', v_commission_amount,
    'driver_share', v_driver_amount,
    'message', 'Paiement reçu et répartition calculée'
  );
END;
$$;

-- 11. Fonction RPC pour envoyer le paiement au chauffeur
CREATE OR REPLACE FUNCTION public.fleet_send_payment_to_driver(
  p_contract_id UUID,
  p_amount NUMERIC(10,2),
  p_course_ids UUID[],
  p_payment_method TEXT,
  p_payment_reference TEXT DEFAULT NULL,
  p_period_start DATE DEFAULT NULL,
  p_period_end DATE DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fm_id UUID;
  v_contract RECORD;
  v_payment_id UUID;
BEGIN
  -- Vérifier que c'est bien le gestionnaire
  SELECT id INTO v_fm_id FROM fleet_managers WHERE user_id = auth.uid();
  IF v_fm_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Gestionnaire non trouvé');
  END IF;

  -- Récupérer le contrat
  SELECT * INTO v_contract
  FROM fleet_indirect_payment_contracts
  WHERE id = p_contract_id AND fleet_manager_id = v_fm_id;

  IF v_contract IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Contrat non trouvé');
  END IF;

  -- Créer l'enregistrement de paiement
  INSERT INTO fleet_driver_indirect_payments (
    contract_id,
    fleet_manager_id,
    driver_id,
    total_collected,
    commission_amount,
    amount_to_pay_driver,
    course_ids,
    courses_count,
    period_start,
    period_end,
    status,
    sent_at,
    sent_by_user_id,
    payment_method,
    payment_reference
  ) VALUES (
    p_contract_id,
    v_fm_id,
    v_contract.driver_id,
    p_amount + (p_amount * v_contract.commission_percentage / 100),
    (p_amount * v_contract.commission_percentage / 100),
    p_amount,
    p_course_ids,
    array_length(p_course_ids, 1),
    p_period_start,
    p_period_end,
    'sent',
    now(),
    auth.uid(),
    p_payment_method,
    p_payment_reference
  )
  RETURNING id INTO v_payment_id;

  -- Mettre à jour les courses concernées
  UPDATE fleet_partner_courses
  SET 
    fleet_to_driver_payment_sent = true,
    fleet_to_driver_payment_sent_at = now(),
    fleet_payment_to_driver_status = 'sent'
  WHERE course_id = ANY(p_course_ids)
    AND fleet_manager_id = v_fm_id;

  -- Mettre à jour le contrat
  UPDATE fleet_indirect_payment_contracts
  SET 
    total_paid_to_driver = total_paid_to_driver + p_amount,
    current_balance_owed_to_driver = current_balance_owed_to_driver - p_amount,
    last_settlement_date = now(),
    updated_at = now()
  WHERE id = p_contract_id;

  RETURN jsonb_build_object(
    'success', true,
    'payment_id', v_payment_id,
    'amount', p_amount,
    'message', 'Paiement envoyé au chauffeur'
  );
END;
$$;

-- 12. Fonction RPC pour que le chauffeur confirme la réception du paiement
CREATE OR REPLACE FUNCTION public.driver_confirm_fleet_payment(
  p_payment_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_driver_id UUID;
  v_payment RECORD;
BEGIN
  -- Vérifier que c'est bien le chauffeur
  SELECT id INTO v_driver_id FROM drivers WHERE user_id = auth.uid();
  IF v_driver_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Chauffeur non trouvé');
  END IF;

  -- Récupérer le paiement
  SELECT * INTO v_payment
  FROM fleet_driver_indirect_payments
  WHERE id = p_payment_id AND driver_id = v_driver_id;

  IF v_payment IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Paiement non trouvé');
  END IF;

  -- Confirmer le paiement
  UPDATE fleet_driver_indirect_payments
  SET 
    status = 'confirmed',
    confirmed_at = now(),
    confirmed_by_user_id = auth.uid()
  WHERE id = p_payment_id;

  -- Mettre à jour les courses concernées
  UPDATE fleet_partner_courses
  SET 
    fleet_to_driver_payment_confirmed = true,
    fleet_to_driver_payment_confirmed_at = now(),
    fleet_payment_to_driver_status = 'confirmed',
    payment_settled = true,
    payment_settled_at = now()
  WHERE course_id = ANY(v_payment.course_ids)
    AND driver_id = v_driver_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Paiement confirmé'
  );
END;
$$;

-- 13. Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.fleet_indirect_payment_contracts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.fleet_driver_indirect_payments;