-- =====================================================
-- SYSTÈME DE POOL DE COURSES PARTAGÉES AVEC VERROUILLAGE
-- =====================================================

-- Table pour les courses mises en attente de prise par les partenaires
CREATE TABLE public.partner_course_pool (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  sender_driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  partnership_ids UUID[] NOT NULL, -- Les partenariats concernés
  course_amount NUMERIC NOT NULL DEFAULT 0,
  commission_percentage NUMERIC NOT NULL DEFAULT 10,
  estimated_commission NUMERIC NOT NULL DEFAULT 0,
  message TEXT, -- Message du chauffeur envoyeur
  status TEXT NOT NULL DEFAULT 'available', -- available, claimed, expired, cancelled
  claimed_by_driver_id UUID REFERENCES public.drivers(id),
  claimed_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- Contrainte: une course ne peut être dans le pool qu'une fois
  CONSTRAINT unique_course_in_pool UNIQUE (course_id, status) 
    DEFERRABLE INITIALLY DEFERRED
);

-- Ajouter une colonne pour le document de contrat dans driver_partnerships
ALTER TABLE public.driver_partnerships 
ADD COLUMN IF NOT EXISTS contract_document_url TEXT,
ADD COLUMN IF NOT EXISTS contract_generated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS driver_a_signed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS driver_b_signed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS driver_a_signed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS driver_b_signed_at TIMESTAMP WITH TIME ZONE;

-- Index pour améliorer les performances
CREATE INDEX idx_partner_pool_status ON public.partner_course_pool(status);
CREATE INDEX idx_partner_pool_sender ON public.partner_course_pool(sender_driver_id);
CREATE INDEX idx_partner_pool_expires ON public.partner_course_pool(expires_at);

-- Enable RLS
ALTER TABLE public.partner_course_pool ENABLE ROW LEVEL SECURITY;

-- Policies pour partner_course_pool
CREATE POLICY "Drivers can view pool courses from their partners"
ON public.partner_course_pool FOR SELECT
USING (
  -- Le chauffeur peut voir si il est partenaire de l'envoyeur
  EXISTS (
    SELECT 1 FROM public.driver_partnerships dp
    WHERE dp.id = ANY(partner_course_pool.partnership_ids)
      AND dp.status = 'active'
      AND (
        (dp.driver_a_id = get_driver_id(auth.uid()) AND dp.driver_b_id = partner_course_pool.sender_driver_id) OR
        (dp.driver_b_id = get_driver_id(auth.uid()) AND dp.driver_a_id = partner_course_pool.sender_driver_id)
      )
  )
  OR sender_driver_id = get_driver_id(auth.uid())
);

CREATE POLICY "Drivers can create pool entries for their courses"
ON public.partner_course_pool FOR INSERT
WITH CHECK (sender_driver_id = get_driver_id(auth.uid()));

CREATE POLICY "Drivers can update pool entries they own or claim"
ON public.partner_course_pool FOR UPDATE
USING (
  sender_driver_id = get_driver_id(auth.uid()) OR
  claimed_by_driver_id = get_driver_id(auth.uid()) OR
  EXISTS (
    SELECT 1 FROM public.driver_partnerships dp
    WHERE dp.id = ANY(partner_course_pool.partnership_ids)
      AND dp.status = 'active'
      AND (dp.driver_a_id = get_driver_id(auth.uid()) OR dp.driver_b_id = get_driver_id(auth.uid()))
  )
);

CREATE POLICY "Senders can delete their pool entries"
ON public.partner_course_pool FOR DELETE
USING (sender_driver_id = get_driver_id(auth.uid()) AND status = 'available');

-- Fonction pour réclamer une course avec verrouillage
CREATE OR REPLACE FUNCTION public.claim_pooled_course(
  _pool_id UUID,
  _claimer_driver_id UUID
)
RETURNS TABLE(success BOOLEAN, message TEXT, pool_entry_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_pool_entry RECORD;
  v_partnership RECORD;
BEGIN
  -- Verrouiller la ligne pour éviter les conflits
  SELECT * INTO v_pool_entry
  FROM public.partner_course_pool
  WHERE id = _pool_id
  FOR UPDATE NOWAIT;
  
  -- Vérifier si la course est encore disponible
  IF v_pool_entry IS NULL THEN
    RETURN QUERY SELECT false, 'Course non trouvée'::TEXT, NULL::UUID;
    RETURN;
  END IF;
  
  IF v_pool_entry.status != 'available' THEN
    RETURN QUERY SELECT false, 'Cette course n''est plus disponible'::TEXT, NULL::UUID;
    RETURN;
  END IF;
  
  IF v_pool_entry.expires_at < now() THEN
    -- Marquer comme expirée
    UPDATE public.partner_course_pool SET status = 'expired' WHERE id = _pool_id;
    RETURN QUERY SELECT false, 'Cette course a expiré'::TEXT, NULL::UUID;
    RETURN;
  END IF;
  
  -- Vérifier que le claimer est bien partenaire
  SELECT * INTO v_partnership
  FROM public.driver_partnerships dp
  WHERE dp.id = ANY(v_pool_entry.partnership_ids)
    AND dp.status = 'active'
    AND (
      (dp.driver_a_id = _claimer_driver_id AND dp.driver_b_id = v_pool_entry.sender_driver_id) OR
      (dp.driver_b_id = _claimer_driver_id AND dp.driver_a_id = v_pool_entry.sender_driver_id)
    )
  LIMIT 1;
  
  IF v_partnership IS NULL THEN
    RETURN QUERY SELECT false, 'Vous n''êtes pas partenaire de ce chauffeur'::TEXT, NULL::UUID;
    RETURN;
  END IF;
  
  -- Réclamer la course
  UPDATE public.partner_course_pool
  SET 
    status = 'claimed',
    claimed_by_driver_id = _claimer_driver_id,
    claimed_at = now(),
    updated_at = now()
  WHERE id = _pool_id;
  
  -- Créer l'entrée dans shared_courses
  INSERT INTO public.shared_courses (
    course_id,
    partnership_id,
    sender_driver_id,
    receiver_driver_id,
    course_amount,
    commission_percentage,
    commission_amount,
    status,
    client_notified
  ) VALUES (
    v_pool_entry.course_id,
    v_partnership.id,
    v_pool_entry.sender_driver_id,
    _claimer_driver_id,
    v_pool_entry.course_amount,
    v_pool_entry.commission_percentage,
    v_pool_entry.estimated_commission,
    'accepted',
    false
  );
  
  -- Mettre à jour la course pour assigner le nouveau chauffeur
  UPDATE public.courses
  SET driver_ids = ARRAY[_claimer_driver_id]
  WHERE id = v_pool_entry.course_id;
  
  RETURN QUERY SELECT true, 'Course réclamée avec succès!'::TEXT, _pool_id;
  
EXCEPTION
  WHEN lock_not_available THEN
    RETURN QUERY SELECT false, 'Cette course est en cours de réclamation par un autre chauffeur'::TEXT, NULL::UUID;
END;
$$;

-- Vue pour les courses disponibles dans le pool d'un partenaire
CREATE OR REPLACE VIEW public.available_partner_courses AS
SELECT 
  pcp.id AS pool_id,
  pcp.course_id,
  pcp.sender_driver_id,
  pcp.course_amount,
  pcp.commission_percentage,
  pcp.estimated_commission,
  pcp.message,
  pcp.expires_at,
  pcp.created_at,
  c.pickup_address,
  c.destination_address,
  c.scheduled_date,
  c.passengers_count,
  c.distance_km,
  c.duration_minutes,
  p.full_name AS sender_name,
  pr.profile_photo_url AS sender_photo,
  d.company_name AS sender_company
FROM public.partner_course_pool pcp
JOIN public.courses c ON c.id = pcp.course_id
JOIN public.drivers d ON d.id = pcp.sender_driver_id
JOIN public.profiles p ON p.id = d.user_id
LEFT JOIN public.profiles pr ON pr.id = d.user_id
WHERE pcp.status = 'available'
  AND pcp.expires_at > now();

-- Fonction pour calculer le solde entre deux partenaires
CREATE OR REPLACE FUNCTION public.get_partnership_balance(
  _partnership_id UUID,
  _driver_id UUID
)
RETURNS TABLE(
  total_sent_amount NUMERIC,
  total_received_amount NUMERIC,
  total_sent_commission NUMERIC,
  total_received_commission NUMERIC,
  net_balance NUMERIC,
  courses_sent INTEGER,
  courses_received INTEGER,
  last_settlement_date TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_partnership RECORD;
  v_other_driver_id UUID;
BEGIN
  SELECT * INTO v_partnership FROM public.driver_partnerships WHERE id = _partnership_id;
  
  IF v_partnership IS NULL THEN
    RETURN;
  END IF;
  
  -- Déterminer l'autre chauffeur
  IF v_partnership.driver_a_id = _driver_id THEN
    v_other_driver_id := v_partnership.driver_b_id;
  ELSE
    v_other_driver_id := v_partnership.driver_a_id;
  END IF;
  
  RETURN QUERY
  SELECT
    COALESCE(SUM(CASE WHEN sc.sender_driver_id = _driver_id THEN sc.course_amount ELSE 0 END), 0) AS total_sent_amount,
    COALESCE(SUM(CASE WHEN sc.receiver_driver_id = _driver_id THEN sc.course_amount ELSE 0 END), 0) AS total_received_amount,
    COALESCE(SUM(CASE WHEN sc.sender_driver_id = _driver_id THEN sc.commission_amount ELSE 0 END), 0) AS total_sent_commission,
    COALESCE(SUM(CASE WHEN sc.receiver_driver_id = _driver_id THEN sc.commission_amount ELSE 0 END), 0) AS total_received_commission,
    -- Net: Ce que je dois (commissions sur courses reçues) - Ce qu'on me doit (commissions sur courses envoyées)
    COALESCE(SUM(CASE WHEN sc.receiver_driver_id = _driver_id THEN sc.commission_amount ELSE 0 END), 0) -
    COALESCE(SUM(CASE WHEN sc.sender_driver_id = _driver_id THEN sc.commission_amount ELSE 0 END), 0) AS net_balance,
    COUNT(CASE WHEN sc.sender_driver_id = _driver_id THEN 1 END)::INTEGER AS courses_sent,
    COUNT(CASE WHEN sc.receiver_driver_id = _driver_id THEN 1 END)::INTEGER AS courses_received,
    v_partnership.last_payment_date AS last_settlement_date
  FROM public.shared_courses sc
  WHERE sc.partnership_id = _partnership_id
    AND sc.status = 'completed'
    AND (sc.created_at > COALESCE(v_partnership.last_payment_date, '1970-01-01'::TIMESTAMP WITH TIME ZONE));
END;
$$;

-- Enable realtime for pool
ALTER PUBLICATION supabase_realtime ADD TABLE public.partner_course_pool;