-- Fix the stuck course: link the orphaned PI and update status
UPDATE public.courses 
SET 
  stripe_payment_intent_id = 'pi_3TJEZvAdFPYTU4711hqzEvBd',
  stripe_hold_payment_intent_id = 'pi_3TJEZvAdFPYTU4711hqzEvBd',
  card_hold_status = 'confirmed',
  payment_status = 'bank_imprint_confirmed',
  final_payment_status = 'pending',
  status = 'accepted'
WHERE id = 'ead9d274-db45-4a4a-9841-db0bbdc24715';

-- Delete the false transaction (money was never captured)
DELETE FROM public.stripe_transactions
WHERE course_id = 'ead9d274-db45-4a4a-9841-db0bbdc24715';