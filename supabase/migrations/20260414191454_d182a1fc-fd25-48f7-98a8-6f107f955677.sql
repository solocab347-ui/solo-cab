
INSERT INTO public.courses (
  id, driver_id, pickup_address, destination_address,
  pickup_latitude, pickup_longitude, destination_latitude, destination_longitude,
  distance_km, status, payment_method, payment_method_requested, scheduled_date,
  guest_name, guest_phone, guest_email, guest_estimated_price, final_payment_amount,
  solocab_fee_amount, is_guest_booking, created_at, updated_at,
  created_by_user_id, origin_type, course_started_at
) VALUES (
  'a0000001-0001-0001-0001-000000000001',
  'aa1242a2-4e07-44d2-9b0e-c48bb318ec9a',
  '15 Rue de Rivoli, 75001 Paris', 'Aéroport CDG Terminal 2',
  48.8566, 2.3522, 49.0097, 2.5479,
  32.5, 'completed', 'cash', 'cash', NOW() - INTERVAL '2 hours',
  'Test Client Alpha', '+33612345678', 'alpha@test.com', 45.00, 45.00,
  0.50, true, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '1 hour',
  '93782a08-c06b-440d-bb81-6ab2335acdd3', 'direct', NOW() - INTERVAL '2 hours'
);

INSERT INTO public.courses (
  id, driver_id, pickup_address, destination_address,
  pickup_latitude, pickup_longitude, destination_latitude, destination_longitude,
  distance_km, status, payment_method, payment_method_requested, scheduled_date,
  guest_name, guest_phone, guest_email, guest_estimated_price, final_payment_amount,
  solocab_fee_amount, stripe_fee_amount, is_guest_booking, created_at, updated_at,
  created_by_user_id, origin_type, course_started_at, payment_status
) VALUES (
  'a0000001-0001-0001-0001-000000000002',
  'aa1242a2-4e07-44d2-9b0e-c48bb318ec9a',
  'Gare de Lyon, Paris', '25 Avenue des Champs-Élysées, Paris',
  48.8443, 2.3735, 48.8698, 2.3076,
  8.2, 'completed', 'stripe', 'card', NOW() - INTERVAL '1 hour',
  'Test Client Beta', '+33698765432', 'beta@test.com', 80.00, 80.00,
  0.50, 2.60, true, NOW() - INTERVAL '1 hour', NOW() - INTERVAL '30 minutes',
  '93782a08-c06b-440d-bb81-6ab2335acdd3', 'direct', NOW() - INTERVAL '1 hour', 'captured'
);

INSERT INTO public.courses (
  id, driver_id, pickup_address, destination_address,
  pickup_latitude, pickup_longitude, destination_latitude, destination_longitude,
  distance_km, status, payment_method, payment_method_requested, scheduled_date,
  guest_name, guest_phone, guest_email, guest_estimated_price, final_payment_amount,
  solocab_fee_amount, is_guest_booking, created_at, updated_at,
  created_by_user_id, origin_type, course_started_at
) VALUES (
  'a0000001-0001-0001-0001-000000000003',
  'd0f4960d-1f21-4844-8e91-4251c6ca106f',
  '10 Place de la République, Paris', 'La Défense, Puteaux',
  48.8676, 2.3634, 48.8920, 2.2376,
  12.0, 'completed', 'cash', 'cash', NOW() - INTERVAL '3 hours',
  'Test Client Gamma', '+33611223344', 'gamma@test.com', 55.00, 55.00,
  0.50, true, NOW() - INTERVAL '3 hours', NOW() - INTERVAL '2 hours',
  'edccc702-1533-4c93-a5ca-98dc85efc2f4', 'direct', NOW() - INTERVAL '3 hours'
);

INSERT INTO public.courses (
  id, driver_id, pickup_address, destination_address,
  pickup_latitude, pickup_longitude, destination_latitude, destination_longitude,
  distance_km, status, payment_method, payment_method_requested, scheduled_date,
  guest_name, guest_phone, guest_email, guest_estimated_price, final_payment_amount,
  solocab_fee_amount, stripe_fee_amount, is_guest_booking, created_at, updated_at,
  created_by_user_id, origin_type, course_started_at, payment_status
) VALUES (
  'a0000001-0001-0001-0001-000000000004',
  'd0f4960d-1f21-4844-8e91-4251c6ca106f',
  'Gare Montparnasse, Paris', 'Aéroport Orly Terminal 4',
  48.8413, 2.3209, 48.7262, 2.3652,
  18.5, 'completed', 'stripe', 'card', NOW() - INTERVAL '90 minutes',
  'Test Client Delta', '+33699887766', 'delta@test.com', 120.00, 120.00,
  0.50, 3.78, true, NOW() - INTERVAL '90 minutes', NOW() - INTERVAL '45 minutes',
  'edccc702-1533-4c93-a5ca-98dc85efc2f4', 'direct', NOW() - INTERVAL '90 minutes', 'captured'
);

-- Transactions financières
INSERT INTO public.stripe_transactions (id, course_id, driver_id, transaction_type, gross_amount, solocab_fee_amount, stripe_fee_amount, net_amount, status, payment_method, description, created_at)
VALUES ('b0000001-0001-0001-0001-000000000001', 'a0000001-0001-0001-0001-000000000001', 'aa1242a2-4e07-44d2-9b0e-c48bb318ec9a', 'course_payment', 45.00, 0.50, 0, 44.50, 'succeeded', 'cash', 'Course espèces Test Alpha', NOW() - INTERVAL '1 hour');

INSERT INTO public.stripe_transactions (id, course_id, driver_id, transaction_type, gross_amount, solocab_fee_amount, stripe_fee_amount, net_amount, status, payment_method, stripe_payment_intent_id, description, created_at)
VALUES ('b0000001-0001-0001-0001-000000000002', 'a0000001-0001-0001-0001-000000000002', 'aa1242a2-4e07-44d2-9b0e-c48bb318ec9a', 'course_payment', 80.00, 0.50, 2.60, 76.90, 'succeeded', 'stripe', 'pi_test_qasim_card_001', 'Course carte Test Beta', NOW() - INTERVAL '30 minutes');

INSERT INTO public.stripe_transactions (id, course_id, driver_id, transaction_type, gross_amount, solocab_fee_amount, stripe_fee_amount, net_amount, status, payment_method, description, created_at)
VALUES ('b0000001-0001-0001-0001-000000000003', 'a0000001-0001-0001-0001-000000000003', 'd0f4960d-1f21-4844-8e91-4251c6ca106f', 'course_payment', 55.00, 0.50, 0, 54.50, 'succeeded', 'cash', 'Course espèces Test Gamma', NOW() - INTERVAL '2 hours');

INSERT INTO public.stripe_transactions (id, course_id, driver_id, transaction_type, gross_amount, solocab_fee_amount, stripe_fee_amount, net_amount, status, payment_method, stripe_payment_intent_id, description, created_at)
VALUES ('b0000001-0001-0001-0001-000000000004', 'a0000001-0001-0001-0001-000000000004', 'd0f4960d-1f21-4844-8e91-4251c6ca106f', 'course_payment', 120.00, 0.50, 3.78, 115.72, 'succeeded', 'stripe', 'pi_test_abdallah_card_001', 'Course carte Test Delta', NOW() - INTERVAL '45 minutes');
