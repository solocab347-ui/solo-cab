
-- Add 'completed' to allowed status values
ALTER TABLE stripe_transactions DROP CONSTRAINT stripe_transactions_status_check;
ALTER TABLE stripe_transactions ADD CONSTRAINT stripe_transactions_status_check 
  CHECK (status = ANY (ARRAY['pending','succeeded','failed','refunded','completed']));

-- Now force recalculation of existing records
UPDATE payments SET payment_method = payment_method 
WHERE status IN ('succeeded', 'captured') AND course_id IS NOT NULL AND driver_id IS NOT NULL;
