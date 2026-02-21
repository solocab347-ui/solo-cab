
-- Function to completely clean up a user and all related data before deletion
CREATE OR REPLACE FUNCTION public.admin_delete_user_cascade(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_driver_id UUID;
BEGIN
  -- Get driver ID if exists
  SELECT id INTO target_driver_id FROM public.drivers WHERE user_id = target_user_id;

  -- Clean up driver-related data if user is a driver
  IF target_driver_id IS NOT NULL THEN
    -- SET NULL on nullable FK references to this driver
    UPDATE public.clients SET favorite_driver_id = NULL WHERE favorite_driver_id = target_driver_id;
    UPDATE public.clients SET preferred_fleet_driver_id = NULL WHERE preferred_fleet_driver_id = target_driver_id;
    UPDATE public.invitation_tokens SET used_by_driver_id = NULL WHERE used_by_driver_id = target_driver_id;
    UPDATE public.fleet_manager_invitations SET used_by_driver_id = NULL WHERE used_by_driver_id = target_driver_id;
    UPDATE public.fleet_driver_invitations SET used_by_driver_id = NULL WHERE used_by_driver_id = target_driver_id;
    UPDATE public.driver_partnerships SET proposed_by = NULL WHERE proposed_by = target_driver_id;
    UPDATE public.partner_course_pool SET claimed_by_driver_id = NULL WHERE claimed_by_driver_id = target_driver_id;
    UPDATE public.company_course_requests SET accepted_driver_id = NULL WHERE accepted_driver_id = target_driver_id;
    UPDATE public.company_course_requests SET fleet_dispatched_driver_id = NULL WHERE fleet_dispatched_driver_id = target_driver_id;
    UPDATE public.fleet_manager_course_requests SET assigned_driver_id = NULL WHERE assigned_driver_id = target_driver_id;
    UPDATE public.fleet_course_escalations SET reassigned_to_driver_id = NULL WHERE reassigned_to_driver_id = target_driver_id;
    UPDATE public.fleet_dispatch_queue SET assigned_driver_id = NULL WHERE assigned_driver_id = target_driver_id;
    UPDATE public.fleet_dispatch_queue SET current_driver_id = NULL WHERE current_driver_id = target_driver_id;
    UPDATE public.fleet_driver_declined_courses SET reassigned_to_driver_id = NULL WHERE reassigned_to_driver_id = target_driver_id;
    UPDATE public.ride_requests SET selected_driver_id = NULL WHERE selected_driver_id = target_driver_id;

    -- DELETE rows that reference this driver and can't be SET NULL
    DELETE FROM public.company_payments WHERE driver_id = target_driver_id;
    DELETE FROM public.fleet_partnership_payments WHERE driver_id = target_driver_id;
    DELETE FROM public.partner_order_documents WHERE sender_driver_id = target_driver_id OR receiver_driver_id = target_driver_id;
    DELETE FROM public.partner_invoices WHERE driver_id = target_driver_id;
    DELETE FROM public.partner_payments WHERE payer_driver_id = target_driver_id OR receiver_driver_id = target_driver_id;
    DELETE FROM public.course_escalations WHERE driver_id = target_driver_id;
    DELETE FROM public.congress_registrations WHERE driver_id = target_driver_id;
    DELETE FROM public.shared_course_payments WHERE sender_driver_id = target_driver_id OR receiver_driver_id = target_driver_id;
    DELETE FROM public.partnership_balances WHERE driver_a_id = target_driver_id OR driver_b_id = target_driver_id;
    DELETE FROM public.partnership_settlements WHERE payer_driver_id = target_driver_id OR receiver_driver_id = target_driver_id;
    DELETE FROM public.nfc_plate_orders WHERE driver_id = target_driver_id;
    DELETE FROM public.deposit_transactions WHERE driver_id = target_driver_id;
    DELETE FROM public.client_driver_blocks WHERE driver_id = target_driver_id;
    DELETE FROM public.driver_document_validations WHERE driver_id = target_driver_id;
    DELETE FROM public.driver_vehicle_documents WHERE driver_id = target_driver_id;
    DELETE FROM public.vehicle_documents WHERE driver_id = target_driver_id;

    -- Delete the driver record (CASCADE will handle: qr_codes, devis, factures, promotions, campaigns, etc.)
    DELETE FROM public.drivers WHERE id = target_driver_id;
  END IF;

  -- Clean up profile-related NO ACTION references (admin refs → SET NULL)
  UPDATE public.assistant_requests SET admin_id = NULL WHERE admin_id = target_user_id;
  UPDATE public.disputes SET admin_id = NULL WHERE admin_id = target_user_id;
  UPDATE public.driver_feedback SET admin_id = NULL WHERE admin_id = target_user_id;
  UPDATE public.driver_partnerships SET blocked_by_admin_id = NULL WHERE blocked_by_admin_id = target_user_id;
  UPDATE public.partnership_disputes SET admin_id = NULL WHERE admin_id = target_user_id;
  UPDATE public.unassigned_fleet_courses SET resolved_by = NULL WHERE resolved_by = target_user_id;
  UPDATE public.vehicle_documents SET validated_by = NULL WHERE validated_by = target_user_id;
  UPDATE public.expense_reports SET reviewed_by = NULL WHERE reviewed_by = target_user_id;
  UPDATE public.driver_vehicle_documents SET validated_by = NULL WHERE validated_by = target_user_id;
  UPDATE public.document_reminders SET sent_by = NULL WHERE sent_by = target_user_id;
  DELETE FROM public.scheduled_user_deletions WHERE scheduled_by = target_user_id OR cancelled_by = target_user_id OR user_id = target_user_id;
  DELETE FROM public.invitation_tokens WHERE created_by_admin_id = target_user_id;

  -- Delete profile (CASCADE will handle: clients, conversations, messages, push_subscriptions)
  DELETE FROM public.profiles WHERE id = target_user_id;
END;
$$;
