-- Drop the existing problematic INSERT policies and create a unified one
DROP POLICY IF EXISTS "Company employees can create courses with partner drivers" ON courses;
DROP POLICY IF EXISTS "Clients can create their own courses" ON courses;

-- Create unified INSERT policy that handles all cases
CREATE POLICY "Users can create courses" ON courses
FOR INSERT TO authenticated
WITH CHECK (
  -- Case 1: Admin can create any course
  has_role(auth.uid(), 'admin')
  -- Case 2: Client creating their own course
  OR client_id = get_client_id(auth.uid())
  -- Case 3: Driver creating course for their client
  OR (
    driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid())
    AND (
      (is_guest_booking = true AND guest_name IS NOT NULL AND guest_phone IS NOT NULL)
      OR EXISTS (
        SELECT 1 FROM clients c
        WHERE c.id = client_id
        AND (c.driver_id = (SELECT id FROM drivers WHERE user_id = auth.uid())
             OR (SELECT id FROM drivers WHERE user_id = auth.uid()) = ANY(c.driver_ids))
      )
    )
  )
  -- Case 4: Company employee creating course for partner driver
  OR (
    client_id IS NULL
    AND driver_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM company_employees ce
      JOIN company_driver_agreements cda ON cda.company_id = ce.company_id
      WHERE ce.user_id = auth.uid()
        AND ce.is_active = true
        AND (ce.is_suspended IS NULL OR ce.is_suspended = false)
        AND cda.driver_id = courses.driver_id
        AND cda.status = 'accepted'
    )
  )
  -- Case 5: Company administrator creating course for partner driver
  OR (
    client_id IS NULL
    AND driver_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM company_administrators ca
      JOIN company_driver_agreements cda ON cda.company_id = ca.company_id
      WHERE ca.user_id = auth.uid()
        AND ca.is_active = true
        AND cda.driver_id = courses.driver_id
        AND cda.status = 'accepted'
    )
  )
  -- Case 6: Fleet client creating course with fleet driver
  OR EXISTS (
    SELECT 1 FROM clients c
    WHERE c.user_id = auth.uid()
    AND c.fleet_manager_id IS NOT NULL
    AND c.driver_id IN (
      SELECT d.id FROM drivers d WHERE d.fleet_manager_id = c.fleet_manager_id
    )
  )
);

-- Drop old driver INSERT policies that are now merged
DROP POLICY IF EXISTS "Drivers can create courses for their clients" ON courses;
DROP POLICY IF EXISTS "Drivers can create guest courses" ON courses;
DROP POLICY IF EXISTS "Fleet clients can create courses with fleet drivers" ON courses;