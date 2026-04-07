
-- Fix backfilled driver_balance_pending: set created_at to course updated_at
UPDATE driver_balance_pending dbp
SET created_at = c.updated_at
FROM courses c
WHERE dbp.course_id = c.id
  AND dbp.created_at >= '2026-04-07 16:34:00+00'
  AND dbp.created_at <= '2026-04-07 16:35:00+00';

-- Fix backfilled solo_admin_ledger
UPDATE solo_admin_ledger sal
SET created_at = c.updated_at
FROM courses c
WHERE sal.course_id = c.id
  AND sal.created_at >= '2026-04-07 16:34:00+00'
  AND sal.created_at <= '2026-04-07 16:35:00+00';

-- Fix backfilled stripe_transactions
UPDATE stripe_transactions st
SET created_at = c.updated_at
FROM courses c
WHERE st.course_id = c.id
  AND st.created_at >= '2026-04-07 16:34:00+00'
  AND st.created_at <= '2026-04-07 16:35:00+00';
