-- ============================================================
-- NETTOYAGE COMPLET CHAUFFEUR ABDALLAH KANOUTE
-- driver_id: d0f4960d-1f21-4844-8e91-4251c6ca106f
-- ============================================================

-- IDs cibles
DO $$
DECLARE
  v_driver_id uuid := 'd0f4960d-1f21-4844-8e91-4251c6ca106f';
  v_test_client_ids uuid[] := ARRAY[
    '056535bc-7adc-496d-bab0-1a5db3b26d9f'::uuid, -- Testtes / test72@gmail.com
    '4d874bce-2cf6-4136-bcfc-c52aff363ff3'::uuid  -- Abdfg / abdoucoach24@gmail.com
  ];
  v_test_user_ids uuid[] := ARRAY[
    '07ef5177-e310-47f1-a400-6adb8e25fe17'::uuid,
    'a722b622-1547-41fb-853d-f7c365d26245'::uuid
  ];
  v_course_ids uuid[];
BEGIN
  -- 1) Récupérer toutes les courses du chauffeur
  SELECT array_agg(id) INTO v_course_ids FROM courses WHERE driver_id = v_driver_id;

  -- 2) Délier les FK sans cascade qui référencent ces courses
  IF v_course_ids IS NOT NULL THEN
    -- ride_requests.final_course_id => NULL
    UPDATE ride_requests SET final_course_id = NULL 
    WHERE final_course_id = ANY(v_course_ids);

    -- solo_admin_ledger.course_id => NULL (garder l'audit financier)
    UPDATE solo_admin_ledger SET course_id = NULL 
    WHERE course_id = ANY(v_course_ids);

    -- driver_balance_pending => DELETE (pending non payé, pas d'audit critique)
    DELETE FROM driver_balance_pending WHERE course_id = ANY(v_course_ids);

    -- company_course_requests.final_course_id => NULL
    UPDATE company_course_requests SET final_course_id = NULL 
    WHERE final_course_id = ANY(v_course_ids);

    -- admin_manual_operations.reference_course_id => NULL
    UPDATE admin_manual_operations SET reference_course_id = NULL 
    WHERE reference_course_id = ANY(v_course_ids);
  END IF;

  -- 3) Supprimer les ride_messages liés aux ride_requests du chauffeur
  DELETE FROM ride_messages 
  WHERE ride_id IN (
    SELECT id FROM ride_requests 
    WHERE selected_driver_id = v_driver_id 
       OR accepted_by_driver_id = v_driver_id
  );

  -- 4) Supprimer les ride_requests du chauffeur
  DELETE FROM ride_requests 
  WHERE selected_driver_id = v_driver_id 
     OR accepted_by_driver_id = v_driver_id;

  -- 5) Supprimer toutes les courses du chauffeur (CASCADE sur la plupart des tables liées)
  DELETE FROM courses WHERE driver_id = v_driver_id;

  -- 6) Reset compteurs de TOUS les clients liés à Abdallah
  UPDATE clients 
  SET total_rides = 0, total_spent = 0, abusive_ratings_count = 0, total_ratings_given = 0
  WHERE driver_id = v_driver_id 
     OR favorite_driver_id = v_driver_id 
     OR preferred_fleet_driver_id = v_driver_id;

  -- 7) Supprimer les ride_requests des 2 clients test (au cas où ils en auraient ailleurs)
  DELETE FROM ride_messages WHERE ride_id IN (
    SELECT id FROM ride_requests WHERE client_id = ANY(v_test_client_ids)
  );
  DELETE FROM ride_requests WHERE client_id = ANY(v_test_client_ids);

  -- 8) Délier admin_manual_operations des clients test
  UPDATE admin_manual_operations SET target_client_id = NULL 
  WHERE target_client_id = ANY(v_test_client_ids);

  -- 9) Supprimer les invitations / deposits des clients test
  DELETE FROM fleet_client_invitations WHERE client_id = ANY(v_test_client_ids);
  DELETE FROM course_invitations WHERE client_id = ANY(v_test_client_ids);
  DELETE FROM deposit_transactions WHERE client_id = ANY(v_test_client_ids);

  -- 10) Supprimer les comptes clients test (CASCADE sur tables liées)
  DELETE FROM clients WHERE id = ANY(v_test_client_ids);

  -- 11) Supprimer les profiles + auth.users des comptes test
  DELETE FROM profiles WHERE id = ANY(v_test_user_ids);
  DELETE FROM auth.users WHERE id = ANY(v_test_user_ids);

  RAISE NOTICE 'Nettoyage terminé pour Abdallah';
END $$;