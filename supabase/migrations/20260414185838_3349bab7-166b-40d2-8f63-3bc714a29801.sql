
-- 1. Auto-create QR code entry on driver creation
CREATE OR REPLACE FUNCTION public.auto_create_qr_code_for_driver()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Create a QR code entry for the new driver (image will be generated lazily by qr-code-manager)
  INSERT INTO public.qr_codes (driver_id, code, is_active)
  VALUES (NEW.id, gen_random_uuid()::text, true)
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_auto_create_qr_code
AFTER INSERT ON public.drivers
FOR EACH ROW
EXECUTE FUNCTION auto_create_qr_code_for_driver();

-- 2. Auto-sync vehicle data from drivers table to driver_vehicles when vehicle is set during onboarding
CREATE OR REPLACE FUNCTION public.sync_driver_to_vehicle_on_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_vehicle_id UUID;
BEGIN
  -- Only act when vehicle data is being set (from empty to filled)
  IF NEW.vehicle_brand IS NOT NULL AND NEW.vehicle_brand != '' 
     AND NEW.vehicle_model IS NOT NULL AND NEW.vehicle_model != ''
     AND (OLD.vehicle_brand IS NULL OR OLD.vehicle_brand = '' OR OLD.vehicle_model IS NULL OR OLD.vehicle_model = '') THEN
    
    -- Check if a vehicle already exists for this driver
    SELECT id INTO v_vehicle_id FROM public.driver_vehicles WHERE driver_id = NEW.id LIMIT 1;
    
    IF v_vehicle_id IS NULL THEN
      -- Create new vehicle entry
      INSERT INTO public.driver_vehicles (
        driver_id, brand, model, year, color, 
        is_favorite, is_active, category, max_passengers
      ) VALUES (
        NEW.id, 
        NEW.vehicle_brand, 
        NEW.vehicle_model, 
        COALESCE(NEW.vehicle_year, EXTRACT(YEAR FROM NOW())::INT),
        COALESCE(NEW.vehicle_color, ''),
        true, true, 'berline', COALESCE(NEW.max_passengers, 4)
      );
    ELSE
      -- Update existing vehicle if it's the favorite
      UPDATE public.driver_vehicles
      SET brand = NEW.vehicle_brand,
          model = NEW.vehicle_model,
          year = COALESCE(NEW.vehicle_year, year),
          color = COALESCE(NEW.vehicle_color, color)
      WHERE id = v_vehicle_id AND is_favorite = true;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_sync_vehicle_from_driver
AFTER UPDATE OF vehicle_brand, vehicle_model, vehicle_color, vehicle_year ON public.drivers
FOR EACH ROW
EXECUTE FUNCTION sync_driver_to_vehicle_on_update();

-- 3. Backfill: Create missing QR codes for existing drivers
INSERT INTO public.qr_codes (driver_id, code, is_active)
SELECT d.id, gen_random_uuid()::text, true
FROM public.drivers d
LEFT JOIN public.qr_codes q ON q.driver_id = d.id
WHERE q.id IS NULL;

-- 4. Backfill: Create missing driver_vehicles for drivers with vehicle data
INSERT INTO public.driver_vehicles (driver_id, brand, model, year, color, is_favorite, is_active, category, max_passengers)
SELECT d.id, d.vehicle_brand, d.vehicle_model, 
       COALESCE(d.vehicle_year, EXTRACT(YEAR FROM NOW())::INT),
       COALESCE(d.vehicle_color, ''),
       true, true, 'berline', COALESCE(d.max_passengers, 4)
FROM public.drivers d
LEFT JOIN public.driver_vehicles dv ON dv.driver_id = d.id
WHERE dv.id IS NULL 
  AND d.vehicle_brand IS NOT NULL AND d.vehicle_brand != ''
  AND d.vehicle_model IS NOT NULL AND d.vehicle_model != '';
