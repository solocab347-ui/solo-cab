-- Générer le bon de commande manquant pour la course partagée complétée avant la création du trigger
INSERT INTO public.partner_order_documents (
  shared_course_id,
  course_id,
  document_number,
  sender_driver_id,
  receiver_driver_id,
  pickup_address,
  destination_address,
  scheduled_date,
  distance_km,
  passengers_count,
  course_amount,
  commission_percentage,
  commission_amount,
  receiver_earnings,
  payment_method_used,
  status,
  completed_at
)
SELECT 
  sc.id,
  sc.course_id,
  'BCP-' || LPAD(COALESCE((SELECT sharing_number FROM drivers WHERE id = sc.sender_driver_id)::TEXT, '000000'), 6, '0') || '-001',
  sc.sender_driver_id,
  sc.receiver_driver_id,
  c.pickup_address,
  c.destination_address,
  c.scheduled_date,
  c.distance_km,
  c.passengers_count,
  sc.course_amount,
  sc.commission_percentage,
  sc.commission_amount,
  sc.course_amount - sc.commission_amount,
  sc.payment_method_used,
  'completed',
  sc.completed_at
FROM shared_courses sc
JOIN courses c ON sc.course_id = c.id
WHERE sc.status = 'completed' 
AND NOT EXISTS (SELECT 1 FROM partner_order_documents pod WHERE pod.shared_course_id = sc.id);

-- Mettre à jour le compteur de bons de commande pour le sender
UPDATE public.drivers 
SET partner_order_counter = 1 
WHERE id = 'd0f4960d-1f21-4844-8e91-4251c6ca106f' 
AND partner_order_counter = 0;

-- ============================
-- SYSTÈME DE FACTURATION PARTENAIRE
-- ============================

-- Table pour les factures partenaires (FAC-PART-XXX)
CREATE TABLE IF NOT EXISTS public.partner_invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_document_id UUID NOT NULL REFERENCES public.partner_order_documents(id) ON DELETE CASCADE,
  shared_course_id UUID NOT NULL REFERENCES public.shared_courses(id) ON DELETE CASCADE,
  partnership_id UUID NOT NULL REFERENCES public.driver_partnerships(id) ON DELETE RESTRICT,
  
  -- Type de facture: 'sender' (reçoit la commission) ou 'receiver' (paie la commission)
  invoice_type TEXT NOT NULL CHECK (invoice_type IN ('sender', 'receiver')),
  
  -- Driver qui reçoit cette facture
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE RESTRICT,
  
  -- Numéro de facture unique par chauffeur: FAC-PART-XXXXXX-NNN
  invoice_number TEXT NOT NULL,
  
  -- Montants
  course_amount NUMERIC NOT NULL,
  commission_percentage NUMERIC NOT NULL,
  commission_amount NUMERIC NOT NULL,
  
  -- TVA (optionnel, selon le régime fiscal du chauffeur)
  tva_rate NUMERIC DEFAULT 0,
  tva_amount NUMERIC DEFAULT 0,
  
  -- Montant net sur cette facture (différent selon sender ou receiver)
  -- Sender: montant = commission_amount (ce qu'il reçoit)
  -- Receiver: montant = course_amount - commission_amount (ce qu'il garde)
  invoice_amount NUMERIC NOT NULL,
  
  -- Statut de paiement
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'disputed')),
  paid_at TIMESTAMP WITH TIME ZONE,
  
  -- Qui confirme le paiement (l'autre partie)
  payment_confirmed_by UUID REFERENCES auth.users(id),
  payment_notes TEXT,
  
  -- Période de facturation (pour regroupement hebdo/mensuel)
  billing_period_start DATE,
  billing_period_end DATE,
  
  -- Lien avec le calendrier de paiement du partenariat
  payment_schedule TEXT, -- 'per_course', 'weekly', 'monthly'
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(order_document_id, invoice_type)
);

-- Ajouter un compteur de factures partenaires par chauffeur
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS partner_invoice_counter INTEGER DEFAULT 0;

-- Enable RLS
ALTER TABLE public.partner_invoices ENABLE ROW LEVEL SECURITY;

-- Policies pour les factures partenaires
CREATE POLICY "Drivers can view their own partner invoices"
  ON public.partner_invoices FOR SELECT
  USING (driver_id = get_driver_id(auth.uid()));

CREATE POLICY "Admins can manage all partner invoices"
  ON public.partner_invoices FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Fonction pour générer les factures partenaires automatiquement
CREATE OR REPLACE FUNCTION public.generate_partner_invoices()
RETURNS TRIGGER AS $$
DECLARE
  v_partnership RECORD;
  v_sender_counter INTEGER;
  v_receiver_counter INTEGER;
  v_sender_invoice_num TEXT;
  v_receiver_invoice_num TEXT;
  v_sender_sharing_num TEXT;
  v_receiver_sharing_num TEXT;
  v_tva_rate NUMERIC;
BEGIN
  -- Get partnership details
  SELECT * INTO v_partnership 
  FROM public.driver_partnerships 
  WHERE (driver_a_id = NEW.sender_driver_id AND driver_b_id = NEW.receiver_driver_id)
     OR (driver_a_id = NEW.receiver_driver_id AND driver_b_id = NEW.sender_driver_id);
  
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Get sharing numbers
  SELECT LPAD(COALESCE(sharing_number::TEXT, '000000'), 6, '0') INTO v_sender_sharing_num
  FROM public.drivers WHERE id = NEW.sender_driver_id;
  
  SELECT LPAD(COALESCE(sharing_number::TEXT, '000000'), 6, '0') INTO v_receiver_sharing_num
  FROM public.drivers WHERE id = NEW.receiver_driver_id;

  -- Increment counters and get invoice numbers
  UPDATE public.drivers 
  SET partner_invoice_counter = COALESCE(partner_invoice_counter, 0) + 1 
  WHERE id = NEW.sender_driver_id
  RETURNING partner_invoice_counter INTO v_sender_counter;
  
  UPDATE public.drivers 
  SET partner_invoice_counter = COALESCE(partner_invoice_counter, 0) + 1 
  WHERE id = NEW.receiver_driver_id
  RETURNING partner_invoice_counter INTO v_receiver_counter;

  -- Generate invoice numbers: FAC-PART-XXXXXX-NNN
  v_sender_invoice_num := 'FAC-PART-' || v_sender_sharing_num || '-' || LPAD(v_sender_counter::TEXT, 3, '0');
  v_receiver_invoice_num := 'FAC-PART-' || v_receiver_sharing_num || '-' || LPAD(v_receiver_counter::TEXT, 3, '0');

  -- TVA par défaut (peut être ajusté selon les paramètres du chauffeur)
  v_tva_rate := 10; -- 10% TVA standard pour VTC

  -- Facture pour le sender (celui qui reçoit la commission)
  INSERT INTO public.partner_invoices (
    order_document_id,
    shared_course_id,
    partnership_id,
    invoice_type,
    driver_id,
    invoice_number,
    course_amount,
    commission_percentage,
    commission_amount,
    tva_rate,
    tva_amount,
    invoice_amount,
    payment_schedule,
    billing_period_start,
    billing_period_end
  ) VALUES (
    NEW.id,
    NEW.shared_course_id,
    v_partnership.id,
    'sender',
    NEW.sender_driver_id,
    v_sender_invoice_num,
    NEW.course_amount,
    NEW.commission_percentage,
    NEW.commission_amount,
    v_tva_rate,
    ROUND(NEW.commission_amount * v_tva_rate / (100 + v_tva_rate), 2),
    NEW.commission_amount, -- Le sender reçoit la commission
    v_partnership.payment_schedule,
    CURRENT_DATE,
    CURRENT_DATE
  );

  -- Facture pour le receiver (celui qui paie la commission mais garde le net)
  INSERT INTO public.partner_invoices (
    order_document_id,
    shared_course_id,
    partnership_id,
    invoice_type,
    driver_id,
    invoice_number,
    course_amount,
    commission_percentage,
    commission_amount,
    tva_rate,
    tva_amount,
    invoice_amount,
    payment_schedule,
    billing_period_start,
    billing_period_end
  ) VALUES (
    NEW.id,
    NEW.shared_course_id,
    v_partnership.id,
    'receiver',
    NEW.receiver_driver_id,
    v_receiver_invoice_num,
    NEW.course_amount,
    NEW.commission_percentage,
    NEW.commission_amount,
    v_tva_rate,
    ROUND((NEW.course_amount - NEW.commission_amount) * v_tva_rate / (100 + v_tva_rate), 2),
    NEW.receiver_earnings, -- Le receiver garde le net
    v_partnership.payment_schedule,
    CURRENT_DATE,
    CURRENT_DATE
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger pour générer les factures quand un bon de commande est créé
CREATE TRIGGER generate_partner_invoices_on_order_creation
AFTER INSERT ON public.partner_order_documents
FOR EACH ROW
EXECUTE FUNCTION public.generate_partner_invoices();

-- Générer les factures pour les bons de commande existants
INSERT INTO public.partner_invoices (
  order_document_id,
  shared_course_id,
  partnership_id,
  invoice_type,
  driver_id,
  invoice_number,
  course_amount,
  commission_percentage,
  commission_amount,
  tva_rate,
  tva_amount,
  invoice_amount,
  payment_schedule,
  payment_status
)
SELECT 
  pod.id,
  pod.shared_course_id,
  dp.id,
  'sender',
  pod.sender_driver_id,
  'FAC-PART-' || LPAD(COALESCE(d.sharing_number::TEXT, '000000'), 6, '0') || '-001',
  pod.course_amount,
  pod.commission_percentage,
  pod.commission_amount,
  10,
  ROUND(pod.commission_amount * 10 / 110, 2),
  pod.commission_amount,
  COALESCE(dp.payment_schedule, 'per_course'),
  'pending'
FROM partner_order_documents pod
JOIN drivers d ON pod.sender_driver_id = d.id
JOIN driver_partnerships dp ON (
  (dp.driver_a_id = pod.sender_driver_id AND dp.driver_b_id = pod.receiver_driver_id)
  OR (dp.driver_a_id = pod.receiver_driver_id AND dp.driver_b_id = pod.sender_driver_id)
)
WHERE NOT EXISTS (
  SELECT 1 FROM partner_invoices pi WHERE pi.order_document_id = pod.id AND pi.invoice_type = 'sender'
);

INSERT INTO public.partner_invoices (
  order_document_id,
  shared_course_id,
  partnership_id,
  invoice_type,
  driver_id,
  invoice_number,
  course_amount,
  commission_percentage,
  commission_amount,
  tva_rate,
  tva_amount,
  invoice_amount,
  payment_schedule,
  payment_status
)
SELECT 
  pod.id,
  pod.shared_course_id,
  dp.id,
  'receiver',
  pod.receiver_driver_id,
  'FAC-PART-' || LPAD(COALESCE(d.sharing_number::TEXT, '000000'), 6, '0') || '-001',
  pod.course_amount,
  pod.commission_percentage,
  pod.commission_amount,
  10,
  ROUND(pod.receiver_earnings * 10 / 110, 2),
  pod.receiver_earnings,
  COALESCE(dp.payment_schedule, 'per_course'),
  'pending'
FROM partner_order_documents pod
JOIN drivers d ON pod.receiver_driver_id = d.id
JOIN driver_partnerships dp ON (
  (dp.driver_a_id = pod.sender_driver_id AND dp.driver_b_id = pod.receiver_driver_id)
  OR (dp.driver_a_id = pod.receiver_driver_id AND dp.driver_b_id = pod.sender_driver_id)
)
WHERE NOT EXISTS (
  SELECT 1 FROM partner_invoices pi WHERE pi.order_document_id = pod.id AND pi.invoice_type = 'receiver'
);

-- Mettre à jour les compteurs de factures
UPDATE public.drivers SET partner_invoice_counter = 1 
WHERE id IN (SELECT DISTINCT driver_id FROM partner_invoices) AND partner_invoice_counter = 0;

-- Ajouter index pour performance
CREATE INDEX IF NOT EXISTS idx_partner_invoices_driver ON public.partner_invoices(driver_id);
CREATE INDEX IF NOT EXISTS idx_partner_invoices_order ON public.partner_invoices(order_document_id);
CREATE INDEX IF NOT EXISTS idx_partner_invoices_payment_status ON public.partner_invoices(payment_status);

-- Policy pour que les partenaires puissent voir les factures concernant leurs courses
CREATE POLICY "Partners can view related invoices"
  ON public.partner_invoices FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM partner_order_documents pod 
      WHERE pod.id = order_document_id 
      AND (pod.sender_driver_id = get_driver_id(auth.uid()) OR pod.receiver_driver_id = get_driver_id(auth.uid()))
    )
  );

-- Policy pour confirmer le paiement (l'autre partie)
CREATE POLICY "Partners can update payment status"
  ON public.partner_invoices FOR UPDATE
  USING (
    -- Le sender peut confirmer qu'il a reçu le paiement sur la facture du receiver
    -- Le receiver peut confirmer qu'il a payé sur la facture du sender
    EXISTS (
      SELECT 1 FROM partner_order_documents pod 
      WHERE pod.id = order_document_id 
      AND (
        (invoice_type = 'receiver' AND pod.sender_driver_id = get_driver_id(auth.uid()))
        OR (invoice_type = 'sender' AND pod.receiver_driver_id = get_driver_id(auth.uid()))
        OR driver_id = get_driver_id(auth.uid())
      )
    )
  );