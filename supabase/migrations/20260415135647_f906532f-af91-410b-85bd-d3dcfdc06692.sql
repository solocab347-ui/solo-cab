
-- Clean up test data
DELETE FROM solo_admin_ledger WHERE course_id IN (SELECT id FROM courses WHERE pickup_address LIKE 'Test %' AND (pickup_address LIKE '%Abdallah%' OR pickup_address LIKE '%Alexandre%'));
DELETE FROM stripe_transactions WHERE course_id IN (SELECT id FROM courses WHERE pickup_address LIKE 'Test %' AND (pickup_address LIKE '%Abdallah%' OR pickup_address LIKE '%Alexandre%'));
DELETE FROM driver_balance_pending WHERE course_id IN (SELECT id FROM courses WHERE pickup_address LIKE 'Test %' AND (pickup_address LIKE '%Abdallah%' OR pickup_address LIKE '%Alexandre%'));
DELETE FROM courses WHERE pickup_address LIKE 'Test %' AND (pickup_address LIKE '%Abdallah%' OR pickup_address LIKE '%Alexandre%');
