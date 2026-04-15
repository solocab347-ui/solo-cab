
-- Step 1: Clean up any existing duplicates in driver_balance_pending
DELETE FROM driver_balance_pending
WHERE id NOT IN (
  SELECT DISTINCT ON (course_id, driver_id) id
  FROM driver_balance_pending
  ORDER BY course_id, driver_id, created_at ASC
);

-- Step 2: Clean up any existing duplicates in stripe_transactions
DELETE FROM stripe_transactions
WHERE id NOT IN (
  SELECT DISTINCT ON (course_id, driver_id) id
  FROM stripe_transactions
  ORDER BY course_id, driver_id, created_at ASC
);

-- Step 3: Clean up any existing duplicates in solo_admin_ledger
DELETE FROM solo_admin_ledger
WHERE id NOT IN (
  SELECT DISTINCT ON (course_id, driver_id) id
  FROM solo_admin_ledger
  ORDER BY course_id, driver_id, created_at ASC
);

-- Step 4: Add unique constraints
ALTER TABLE driver_balance_pending
ADD CONSTRAINT driver_balance_course_driver_unique UNIQUE (course_id, driver_id);

ALTER TABLE stripe_transactions
ADD CONSTRAINT stripe_transactions_course_driver_unique UNIQUE (course_id, driver_id);

ALTER TABLE solo_admin_ledger
ADD CONSTRAINT solo_admin_ledger_course_driver_unique UNIQUE (course_id, driver_id);
