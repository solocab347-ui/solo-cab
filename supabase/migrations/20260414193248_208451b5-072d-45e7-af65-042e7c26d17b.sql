
ALTER TABLE stripe_transactions DROP CONSTRAINT stripe_transactions_transaction_type_check;
ALTER TABLE stripe_transactions ADD CONSTRAINT stripe_transactions_transaction_type_check 
CHECK (transaction_type = ANY (ARRAY['deposit_payment','final_payment','full_payment','cancellation_fee','refund','partner_transfer','capture','spontaneous_payment','course_payment','course_capture','course','shared_course_payment']));
