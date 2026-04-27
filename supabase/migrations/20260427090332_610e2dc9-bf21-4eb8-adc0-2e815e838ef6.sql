-- Atomic admin driver deletion via SECURITY DEFINER RPC
-- Replaces fragile sequential DELETE chain that fails on FK violations.

CREATE OR REPLACE FUNCTION public.admin_hard_delete_driver(p_driver_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_caller uuid;
  v_is_admin boolean;
BEGIN
  v_caller := auth.uid();

  -- Verify caller is admin
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = v_caller AND role = 'admin'
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'forbidden: admin role required';
  END IF;

  -- Lookup the driver's user_id
  SELECT user_id INTO v_user_id FROM public.drivers WHERE id = p_driver_id;
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'driver_not_found');
  END IF;

  -- 1. Disassociate clients (NULL the references — keep clients alive)
  UPDATE public.clients SET favorite_driver_id = NULL WHERE favorite_driver_id = p_driver_id;
  UPDATE public.clients SET preferred_fleet_driver_id = NULL WHERE preferred_fleet_driver_id = p_driver_id;
  UPDATE public.clients SET driver_id = NULL WHERE driver_id = p_driver_id;

  -- 2. Break circular FK with nfc_plate_orders
  UPDATE public.drivers SET nfc_plate_order_id = NULL WHERE id = p_driver_id;

  -- 3. NULL-out optional driver references (CONFDELTYPE = 'a' / NO ACTION columns)
  -- Use dynamic SQL wrapped in EXCEPTION blocks so a missing column doesn't abort the whole op.
  BEGIN UPDATE public.invitation_tokens SET used_by_driver_id = NULL WHERE used_by_driver_id = p_driver_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN UPDATE public.fleet_manager_invitations SET used_by_driver_id = NULL WHERE used_by_driver_id = p_driver_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN UPDATE public.fleet_driver_invitations SET used_by_driver_id = NULL WHERE used_by_driver_id = p_driver_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN UPDATE public.driver_partnerships SET proposed_by = NULL WHERE proposed_by = p_driver_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN UPDATE public.partner_course_pool SET claimed_by_driver_id = NULL WHERE claimed_by_driver_id = p_driver_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN UPDATE public.fleet_driver_declined_courses SET reassigned_to_driver_id = NULL WHERE reassigned_to_driver_id = p_driver_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN UPDATE public.partner_order_documents SET sender_driver_id = NULL WHERE sender_driver_id = p_driver_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN UPDATE public.partner_order_documents SET receiver_driver_id = NULL WHERE receiver_driver_id = p_driver_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN UPDATE public.partner_order_documents SET payment_confirmed_by = NULL WHERE payment_confirmed_by = p_driver_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN UPDATE public.partner_payments SET receiver_driver_id = NULL WHERE receiver_driver_id = p_driver_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN UPDATE public.partner_payments SET payer_driver_id = NULL WHERE payer_driver_id = p_driver_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN UPDATE public.company_course_requests SET fleet_dispatched_driver_id = NULL WHERE fleet_dispatched_driver_id = p_driver_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN UPDATE public.company_course_requests SET accepted_driver_id = NULL WHERE accepted_driver_id = p_driver_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN UPDATE public.fleet_manager_course_requests SET assigned_driver_id = NULL WHERE assigned_driver_id = p_driver_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN UPDATE public.company_payments SET driver_id = NULL WHERE driver_id = p_driver_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN UPDATE public.fleet_partnership_payments SET driver_id = NULL WHERE driver_id = p_driver_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN UPDATE public.course_escalations SET driver_id = NULL WHERE driver_id = p_driver_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;

  -- 4. Delete driver-owned data (CONFDELTYPE = 'c' or 'r' tables, anything still referencing)
  -- Wrapped in DO blocks so missing tables don't fail.
  BEGIN DELETE FROM public.congress_registrations WHERE driver_id = p_driver_id; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.document_reminders WHERE driver_id = p_driver_id; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.driver_vehicle_documents WHERE driver_id = p_driver_id; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.course_queue WHERE driver_id = p_driver_id; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.fleet_course_escalations WHERE driver_id = p_driver_id; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.fleet_partner_courses WHERE driver_id = p_driver_id; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.fleet_driver_blocks WHERE driver_id = p_driver_id; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.company_payment_reminders WHERE driver_id = p_driver_id; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.company_course_quotes WHERE driver_id = p_driver_id; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.guest_registration_tokens WHERE driver_id = p_driver_id; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.partner_invoices WHERE driver_id = p_driver_id; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.vehicle_documents WHERE driver_id = p_driver_id; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.driver_vehicles WHERE driver_id = p_driver_id; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.course_invitations WHERE driver_id = p_driver_id; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.fleet_driver_documents_archive WHERE driver_id = p_driver_id; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.fleet_driver_declined_courses WHERE declined_by_driver_id = p_driver_id; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.company_driver_agreements WHERE driver_id = p_driver_id; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.partner_course_pool WHERE sender_driver_id = p_driver_id; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.city_pricing WHERE driver_id = p_driver_id; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.client_first_orders WHERE driver_id = p_driver_id; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.fleet_driver_partnerships WHERE driver_id = p_driver_id; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.driver_schedules WHERE driver_id = p_driver_id; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.partnership_disputes WHERE reported_driver_id = p_driver_id OR reporter_driver_id = p_driver_id; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.shared_courses WHERE sender_driver_id = p_driver_id OR receiver_driver_id = p_driver_id; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.driver_partnerships WHERE driver_a_id = p_driver_id OR driver_b_id = p_driver_id; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.fleet_manager_drivers WHERE driver_id = p_driver_id; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.company_drivers WHERE driver_id = p_driver_id; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.driver_feedback WHERE driver_id = p_driver_id; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.assistant_requests WHERE driver_id = p_driver_id; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.campaigns WHERE driver_id = p_driver_id; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.promotions WHERE driver_id = p_driver_id; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.factures WHERE driver_id = p_driver_id; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.devis WHERE driver_id = p_driver_id; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.qr_codes WHERE driver_id = p_driver_id; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.driver_availability_slots WHERE driver_id = p_driver_id; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.nfc_plate_orders WHERE driver_id = p_driver_id; EXCEPTION WHEN undefined_table THEN NULL; END;

  -- Detach courses (keep history but null driver)
  BEGIN UPDATE public.courses SET driver_id = NULL WHERE driver_id = p_driver_id; EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;

  -- Delete clients exclusively created by this driver (now safe; FK already nulled)
  BEGIN DELETE FROM public.clients WHERE driver_id = p_driver_id; EXCEPTION WHEN undefined_table THEN NULL; END;

  -- 5. User-scoped tables
  BEGIN DELETE FROM public.notifications WHERE user_id = v_user_id; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.push_subscriptions WHERE user_id = v_user_id; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.user_roles WHERE user_id = v_user_id; EXCEPTION WHEN undefined_table THEN NULL; END;

  -- 6. Finally remove driver and profile
  DELETE FROM public.drivers WHERE id = p_driver_id;
  DELETE FROM public.profiles WHERE id = v_user_id;

  RETURN jsonb_build_object('ok', true, 'user_id', v_user_id);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_hard_delete_driver(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_hard_delete_driver(uuid) TO authenticated, service_role;