DROP FUNCTION IF EXISTS public.claim_pooled_course(uuid, uuid);

CREATE FUNCTION public.claim_pooled_course(
  _pool_id UUID,
  _claimer_driver_id UUID
)
RETURNS TABLE(success BOOLEAN, message TEXT, pool_entry_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pool_entry RECORD;
  v_partner_ref TEXT;
  v_sender_user_id UUID;
  v_claimer_name TEXT;
  v_original_course_number TEXT;
BEGIN
  -- Verrouiller la ligne pour éviter les conflits (atomic claim)
  SELECT * INTO v_pool_entry
  FROM public.partner_course_pool
  WHERE id = _pool_id
  FOR UPDATE NOWAIT;
  
  IF v_pool_entry IS NULL THEN
    RETURN QUERY SELECT false, 'Course non trouvée'::TEXT, NULL::UUID;
    RETURN;
  END IF;
  
  IF v_pool_entry.status != 'available' THEN
    RETURN QUERY SELECT false, 'Cette course n''est plus disponible'::TEXT, NULL::UUID;
    RETURN;
  END IF;
  
  IF v_pool_entry.sender_driver_id = _claimer_driver_id THEN
    RETURN QUERY SELECT false, 'Vous ne pouvez pas réclamer votre propre course'::TEXT, NULL::UUID;
    RETURN;
  END IF;
  
  IF v_pool_entry.expires_at < now() THEN
    UPDATE public.partner_course_pool SET status = 'expired' WHERE id = _pool_id;
    RETURN QUERY SELECT false, 'Cette course a expiré'::TEXT, NULL::UUID;
    RETURN;
  END IF;
  
  -- Scope-based access control
  IF v_pool_entry.sharing_scope = 'favorites' THEN
    IF v_pool_entry.target_driver_ids IS NULL 
       OR NOT (_claimer_driver_id = ANY(v_pool_entry.target_driver_ids)) THEN
      RETURN QUERY SELECT false, 'Cette course n''est pas accessible pour vous'::TEXT, NULL::UUID;
      RETURN;
    END IF;
  END IF;
  -- scope='network': accessible to all Stripe Connect drivers
  
  -- Verify claimer has Stripe Connect
  IF NOT EXISTS (
    SELECT 1 FROM drivers 
    WHERE id = _claimer_driver_id 
    AND stripe_connect_account_id IS NOT NULL 
    AND stripe_connect_charges_enabled = true
  ) THEN
    RETURN QUERY SELECT false, 'Stripe Connect requis pour accepter les courses partagées'::TEXT, NULL::UUID;
    RETURN;
  END IF;
  
  v_partner_ref := generate_partner_reference_number(_claimer_driver_id);
  
  SELECT course_number INTO v_original_course_number
  FROM courses WHERE id = v_pool_entry.course_id;
  
  -- Claim the pool entry
  UPDATE public.partner_course_pool
  SET status = 'claimed', claimed_by_driver_id = _claimer_driver_id, claimed_at = now(), updated_at = now()
  WHERE id = _pool_id;
  
  -- Create shared_courses entry
  INSERT INTO public.shared_courses (
    course_id, partnership_id, sender_driver_id, receiver_driver_id,
    course_amount, commission_percentage, commission_amount,
    solocab_fee_cents, sharing_scope, pool_entry_id,
    status, accepted_at, partner_reference_number,
    sharing_mode, client_notified, earnings_for_receiver
  ) VALUES (
    v_pool_entry.course_id, NULL, v_pool_entry.sender_driver_id, _claimer_driver_id,
    v_pool_entry.course_amount, v_pool_entry.commission_percentage, v_pool_entry.estimated_commission,
    v_pool_entry.solocab_fee_cents, v_pool_entry.sharing_scope, _pool_id,
    'accepted', now(), v_partner_ref,
    'pool', false,
    v_pool_entry.course_amount - v_pool_entry.estimated_commission - (v_pool_entry.solocab_fee_cents::numeric / 100)
  );
  
  -- Update course driver_ids for receiver visibility
  UPDATE public.courses
  SET driver_ids = array_append(COALESCE(driver_ids, ARRAY[]::UUID[]), _claimer_driver_id)
  WHERE id = v_pool_entry.course_id
  AND NOT (_claimer_driver_id = ANY(COALESCE(driver_ids, ARRAY[]::UUID[])));
  
  -- Cancel all other pool entries for same course
  UPDATE public.partner_course_pool
  SET status = 'claimed', updated_at = now()
  WHERE course_id = v_pool_entry.course_id AND id != _pool_id AND status = 'available';
  
  -- Notify sender
  SELECT user_id INTO v_sender_user_id FROM drivers WHERE id = v_pool_entry.sender_driver_id;
  SELECT SPLIT_PART(full_name, ' ', 1) INTO v_claimer_name
  FROM profiles p JOIN drivers d ON d.user_id = p.id WHERE d.id = _claimer_driver_id;
  
  IF v_sender_user_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (
      v_sender_user_id,
      '✅ Course réclamée par un partenaire',
      COALESCE(v_claimer_name, 'Un chauffeur') || ' a pris votre course ' || COALESCE(v_original_course_number, '') || ' (Ref: ' || v_partner_ref || ')',
      'success',
      '/driver-dashboard?tab=partnerships&subtab=sent'
    );
  END IF;
  
  RETURN QUERY SELECT true, ('Course réclamée avec succès. Votre référence: ' || v_partner_ref)::TEXT, _pool_id;
  
EXCEPTION
  WHEN lock_not_available THEN
    RETURN QUERY SELECT false, 'Cette course est en cours de réclamation par un autre chauffeur'::TEXT, NULL::UUID;
  WHEN unique_violation THEN
    RETURN QUERY SELECT false, 'Cette course a déjà été réclamée'::TEXT, NULL::UUID;
END;
$$;