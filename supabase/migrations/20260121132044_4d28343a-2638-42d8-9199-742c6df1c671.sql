
-- =====================================================
-- MIGRATION: Fix public profile visibility and self-healing system
-- =====================================================

-- 1. Update the public_driver_profiles view to include ALL eligible drivers
DROP VIEW IF EXISTS public_driver_profiles;

CREATE VIEW public_driver_profiles
WITH (security_invoker = on) AS
SELECT 
  d.id,
  d.user_id,
  d.company_name,
  d.vehicle_model,
  d.vehicle_brand,
  d.vehicle_color,
  d.vehicle_year,
  d.bio,
  d.service_description,
  d.services_offered,
  d.vehicle_equipment,
  d.working_sectors,
  d.vehicle_photos,
  d.gallery_photos,
  d.rating,
  d.total_rides,
  d.max_passengers,
  d.display_driver_name,
  d.display_company_name,
  d.show_phone,
  d.show_email,
  d.card_photo_url,
  d.is_pioneer
FROM drivers d
WHERE d.public_profile_enabled = true
  AND (d.is_fleet_driver IS NULL OR d.is_fleet_driver = false)
  AND d.fleet_manager_id IS NULL
  AND (
    -- Validated drivers
    d.status = 'validated'
    -- Pioneers with active trial
    OR (d.is_pioneer = true AND d.free_access_end_date > now())
    -- New drivers within 30 days (any non-rejected status)
    OR (d.created_at > now() - interval '30 days' AND d.status IN ('pending', 'validated', 'on_hold'))
    -- Drivers with active subscription (even if not validated yet)
    OR (d.subscription_paid = true AND d.subscription_status = 'active' AND d.status IN ('pending', 'validated', 'on_hold'))
    -- Drivers with admin-granted free access
    OR (d.free_access_granted = true)
  );

-- 2. Update the RPC function to match the view conditions
CREATE OR REPLACE FUNCTION public.get_public_driver_profile_by_id(driver_id_param uuid)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  company_name text,
  vehicle_model text,
  vehicle_brand text,
  vehicle_year integer,
  vehicle_color text,
  service_description text,
  base_rate numeric,
  per_km_rate numeric,
  working_sectors text[],
  vehicle_equipment text[],
  services_offered text[],
  vehicle_photos text[],
  gallery_photos text[],
  show_phone boolean,
  show_email boolean,
  show_rating_public boolean,
  display_driver_name boolean,
  display_company_name boolean,
  is_pioneer boolean,
  status text,
  free_access_type text,
  free_access_end_date timestamp with time zone,
  contact_phone text,
  contact_email text,
  profile_full_name text,
  profile_email text,
  profile_phone text,
  profile_photo_url text,
  created_at timestamp with time zone,
  rating numeric,
  total_rides integer,
  sharing_number integer,
  show_phone_for_sharing boolean,
  show_rating_for_sharing boolean,
  show_rides_for_sharing boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id,
    d.user_id,
    d.company_name,
    COALESCE(fv.model, d.vehicle_model) AS vehicle_model,
    COALESCE(fv.brand, d.vehicle_brand) AS vehicle_brand,
    COALESCE(fv.year, d.vehicle_year) AS vehicle_year,
    COALESCE(fv.color, d.vehicle_color) AS vehicle_color,
    d.service_description,
    d.base_rate,
    d.per_km_rate,
    d.working_sectors,
    COALESCE(fv.equipment, d.vehicle_equipment) AS vehicle_equipment,
    d.services_offered,
    COALESCE(fv.photos, d.vehicle_photos) AS vehicle_photos,
    d.gallery_photos,
    d.show_phone,
    d.show_email,
    d.show_rating_public,
    d.display_driver_name,
    d.display_company_name,
    d.is_pioneer,
    d.status::TEXT,
    d.free_access_type,
    d.free_access_end_date,
    d.contact_phone,
    d.contact_email,
    p.full_name AS profile_full_name,
    p.email AS profile_email,
    p.phone AS profile_phone,
    p.profile_photo_url AS profile_photo_url,
    d.created_at,
    COALESCE(d.rating, 5.0) AS rating,
    COALESCE(d.total_rides, 0) AS total_rides,
    d.sharing_number,
    COALESCE(d.show_phone_for_sharing, false) AS show_phone_for_sharing,
    COALESCE(d.show_rating_for_sharing, true) AS show_rating_for_sharing,
    COALESCE(d.show_rides_for_sharing, true) AS show_rides_for_sharing
  FROM drivers d
  LEFT JOIN profiles p ON p.id = d.user_id
  LEFT JOIN driver_vehicles fv ON fv.driver_id = d.id AND fv.is_favorite = true AND fv.is_active = true
  WHERE d.id = driver_id_param
    AND d.public_profile_enabled = true
    AND (
      -- Validated drivers
      d.status = 'validated'
      -- Pioneers with active trial
      OR (d.is_pioneer = true AND d.free_access_end_date > now())
      -- New drivers within 30 days
      OR (d.created_at > now() - interval '30 days' AND d.status IN ('pending', 'validated', 'on_hold'))
      -- Drivers with active subscription
      OR (d.subscription_paid = true AND d.subscription_status = 'active' AND d.status IN ('pending', 'validated', 'on_hold'))
      -- Drivers with admin-granted free access
      OR (d.free_access_granted = true)
    );
END;
$$;

-- 3. Create a function to check and fix driver visibility issues
CREATE OR REPLACE FUNCTION public.ensure_driver_profile_visibility(target_driver_id uuid DEFAULT NULL)
RETURNS TABLE(
  driver_id uuid,
  driver_name text,
  issue_found text,
  action_taken text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  rec RECORD;
BEGIN
  -- Check all drivers or specific driver
  FOR rec IN 
    SELECT 
      d.id,
      p.full_name,
      d.public_profile_enabled,
      d.status::text as status,
      d.subscription_paid,
      d.subscription_status,
      d.is_pioneer,
      d.free_access_granted,
      d.free_access_end_date,
      d.created_at
    FROM drivers d
    JOIN profiles p ON p.id = d.user_id
    WHERE (target_driver_id IS NULL OR d.id = target_driver_id)
  LOOP
    -- Check if driver SHOULD be visible but public_profile_enabled is false
    IF rec.public_profile_enabled = false THEN
      -- Check if they have paid subscription
      IF rec.subscription_paid = true AND rec.subscription_status = 'active' THEN
        driver_id := rec.id;
        driver_name := rec.full_name;
        issue_found := 'Paid driver without public profile enabled';
        action_taken := 'No auto-action (requires user to enable profile)';
        RETURN NEXT;
      END IF;
    END IF;
    
    -- Check for visibility issues when public_profile_enabled = true
    IF rec.public_profile_enabled = true THEN
      -- Check if driver is NOT in public_driver_profiles view
      IF NOT EXISTS (SELECT 1 FROM public_driver_profiles pdp WHERE pdp.id = rec.id) THEN
        driver_id := rec.id;
        driver_name := rec.full_name;
        issue_found := 'Profile enabled but not visible. Status: ' || rec.status;
        
        -- Auto-fix: If they have active subscription, ensure visibility
        IF rec.subscription_paid = true AND rec.subscription_status = 'active' THEN
          -- They should be visible - the view conditions now include this case
          action_taken := 'View conditions updated to include paid subscribers';
        ELSE
          action_taken := 'Review required - no active subscription';
        END IF;
        RETURN NEXT;
      END IF;
    END IF;
  END LOOP;
  
  RETURN;
END;
$$;

-- 4. Create self-healing function for data integrity issues
CREATE OR REPLACE FUNCTION public.detect_and_fix_data_issues()
RETURNS TABLE(
  entity_type text,
  entity_id uuid,
  issue_type text,
  issue_description text,
  fix_applied text,
  fix_success boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  rec RECORD;
  fix_result boolean;
BEGIN
  -- 1. Check for completed courses without factures
  FOR rec IN 
    SELECT c.id as course_id, c.driver_id, c.price
    FROM courses c
    LEFT JOIN factures f ON f.course_id = c.id
    WHERE c.status = 'completed' 
      AND f.id IS NULL
      AND c.updated_at < NOW() - INTERVAL '1 hour'
      AND c.price IS NOT NULL
      AND c.price > 0
    LIMIT 10
  LOOP
    entity_type := 'course';
    entity_id := rec.course_id;
    issue_type := 'MISSING_FACTURE';
    issue_description := 'Completed course without facture';
    
    -- Auto-create facture
    BEGIN
      INSERT INTO factures (course_id, driver_id, amount, payment_status, created_at)
      VALUES (rec.course_id, rec.driver_id, rec.price, 'pending', now());
      
      fix_applied := 'Created facture with pending status';
      fix_success := true;
      
      -- Log the fix
      INSERT INTO auto_fix_logs (entity_type, entity_id, fix_applied, success, context)
      VALUES ('course', rec.course_id, fix_applied, true, jsonb_build_object('issue', issue_type));
    EXCEPTION WHEN OTHERS THEN
      fix_applied := 'Failed to create facture: ' || SQLERRM;
      fix_success := false;
    END;
    
    RETURN NEXT;
  END LOOP;
  
  -- 2. Check for drivers with subscription_paid=true but subscription_status=inactive
  FOR rec IN 
    SELECT d.id as driver_id, p.full_name
    FROM drivers d
    JOIN profiles p ON p.id = d.user_id
    WHERE d.subscription_paid = true 
      AND d.subscription_status = 'inactive'
    LIMIT 10
  LOOP
    entity_type := 'driver';
    entity_id := rec.driver_id;
    issue_type := 'SUBSCRIPTION_STATUS_MISMATCH';
    issue_description := 'Driver with subscription_paid=true but status=inactive: ' || rec.full_name;
    
    -- Auto-fix: Update status to active
    UPDATE drivers SET subscription_status = 'active' WHERE id = rec.driver_id;
    fix_applied := 'Updated subscription_status to active';
    fix_success := true;
    
    -- Log the fix
    INSERT INTO auto_fix_logs (entity_type, entity_id, fix_applied, success, context)
    VALUES ('driver', rec.driver_id, fix_applied, true, jsonb_build_object('issue', issue_type));
    
    RETURN NEXT;
  END LOOP;
  
  -- 3. Check for pioneer drivers past trial end without subscription
  FOR rec IN 
    SELECT d.id as driver_id, p.full_name, d.free_access_end_date
    FROM drivers d
    JOIN profiles p ON p.id = d.user_id
    WHERE d.is_pioneer = true 
      AND d.free_access_type = 'trial'
      AND d.free_access_end_date < NOW()
      AND d.subscription_paid = false
      AND d.subscription_status = 'active'
    LIMIT 10
  LOOP
    entity_type := 'driver';
    entity_id := rec.driver_id;
    issue_type := 'PIONEER_TRIAL_EXPIRED';
    issue_description := 'Pioneer trial expired but subscription_status still active: ' || rec.full_name;
    
    -- Auto-fix: Update status to inactive
    UPDATE drivers 
    SET subscription_status = 'inactive',
        free_access_granted = false
    WHERE id = rec.driver_id;
    
    fix_applied := 'Set subscription_status to inactive (trial expired)';
    fix_success := true;
    
    -- Log the fix
    INSERT INTO auto_fix_logs (entity_type, entity_id, fix_applied, success, context)
    VALUES ('driver', rec.driver_id, fix_applied, true, jsonb_build_object('issue', issue_type, 'trial_end', rec.free_access_end_date));
    
    RETURN NEXT;
  END LOOP;
  
  -- 4. Update error pattern occurrences count
  UPDATE error_patterns 
  SET occurrences_count = occurrences_count + 1,
      last_occurrence_at = NOW()
  WHERE pattern_code = 'MISSING_INVOICE'
    AND EXISTS (
      SELECT 1 FROM courses c
      LEFT JOIN factures f ON f.course_id = c.id
      WHERE c.status = 'completed' AND f.id IS NULL AND c.price > 0
    );
  
  RETURN;
END;
$$;

-- 5. Update RLS policy for drivers to include more visibility conditions
DROP POLICY IF EXISTS "Public can view limited driver profiles" ON drivers;

CREATE POLICY "Public can view limited driver profiles" ON drivers
FOR SELECT USING (
  public_profile_enabled = true 
  AND (
    -- Validated drivers
    status = 'validated'
    -- Pioneers with active trial
    OR (is_pioneer = true AND free_access_end_date > now())
    -- New drivers within 30 days
    OR (created_at > now() - interval '30 days' AND status IN ('pending', 'validated', 'on_hold'))
    -- Drivers with active subscription
    OR (subscription_paid = true AND subscription_status = 'active' AND status IN ('pending', 'validated', 'on_hold'))
    -- Drivers with admin-granted free access
    OR (free_access_granted = true)
  )
);

-- 6. Grant execute permissions
GRANT EXECUTE ON FUNCTION public.ensure_driver_profile_visibility TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_driver_profile_visibility TO service_role;
GRANT EXECUTE ON FUNCTION public.detect_and_fix_data_issues TO service_role;
