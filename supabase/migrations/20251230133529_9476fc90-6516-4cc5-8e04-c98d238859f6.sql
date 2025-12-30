-- Fix functions with mutable search paths
-- All functions with SECURITY DEFINER should have search_path set to prevent search path injection attacks

-- 1. Fix create_notification
CREATE OR REPLACE FUNCTION public.create_notification(p_user_id uuid, p_title text, p_message text, p_type text, p_link text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO notifications (user_id, title, message, type, link, is_read)
  VALUES (p_user_id, p_title, p_message, p_type, p_link, false);
END;
$function$;

-- 2. Fix update_driver_total_rides
CREATE OR REPLACE FUNCTION public.update_driver_total_rides()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF (TG_OP = 'UPDATE' AND NEW.status = 'completed' AND OLD.status != 'completed') OR
     (TG_OP = 'INSERT' AND NEW.status = 'completed') THEN
    UPDATE drivers
    SET total_rides = (
      SELECT COUNT(*)
      FROM courses
      WHERE (driver_id = NEW.driver_id OR NEW.driver_id = ANY(driver_ids))
        AND status = 'completed'
    )
    WHERE id = NEW.driver_id;
  END IF;
  RETURN NEW;
END;
$function$;

-- 3. Fix notify_client_new_devis
CREATE OR REPLACE FUNCTION public.notify_client_new_devis()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_client_user_id UUID;
  v_driver_name TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT user_id INTO v_client_user_id
    FROM clients
    WHERE id = NEW.client_id;
    
    SELECT COALESCE(p.full_name, d.company_name, 'Votre chauffeur') INTO v_driver_name
    FROM drivers d
    LEFT JOIN profiles p ON d.user_id = p.id
    WHERE d.id = NEW.driver_id;
    
    IF v_client_user_id IS NOT NULL THEN
      PERFORM create_notification(
        v_client_user_id,
        '💶 Nouveau devis reçu',
        v_driver_name || ' vous a envoyé un devis de ' || NEW.amount::TEXT || '€',
        'payment',
        '/client-dashboard'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- 4. Fix notify_course_accepted
CREATE OR REPLACE FUNCTION public.notify_course_accepted()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_client_user_id UUID;
  v_driver_name TEXT;
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.status = 'pending' AND NEW.status = 'accepted') THEN
    SELECT user_id INTO v_client_user_id
    FROM clients
    WHERE id = NEW.client_id;
    
    SELECT COALESCE(p.full_name, d.company_name, 'Votre chauffeur') INTO v_driver_name
    FROM drivers d
    LEFT JOIN profiles p ON d.user_id = p.id
    WHERE d.id = NEW.driver_id;
    
    IF v_client_user_id IS NOT NULL THEN
      PERFORM create_notification(
        v_client_user_id,
        '✅ Course acceptée',
        v_driver_name || ' a accepté votre demande de course',
        'success',
        '/client-dashboard'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- 5. Fix notify_course_completed
CREATE OR REPLACE FUNCTION public.notify_course_completed()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_client_user_id UUID;
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.status != 'completed' AND NEW.status = 'completed') THEN
    SELECT user_id INTO v_client_user_id
    FROM clients
    WHERE id = NEW.client_id;
    
    IF v_client_user_id IS NOT NULL THEN
      PERFORM create_notification(
        v_client_user_id,
        '🏁 Course terminée',
        'Votre course est terminée. Merci d''avoir utilisé SoloCab !',
        'success',
        '/client-dashboard'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- 6. Fix notify_driver_devis_accepted
CREATE OR REPLACE FUNCTION public.notify_driver_devis_accepted()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_driver_user_id UUID;
  v_client_name TEXT;
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.status = 'pending' AND NEW.status = 'accepted') THEN
    SELECT user_id INTO v_driver_user_id
    FROM drivers
    WHERE id = NEW.driver_id;
    
    SELECT full_name INTO v_client_name
    FROM profiles
    WHERE id = (SELECT user_id FROM clients WHERE id = NEW.client_id);
    
    IF v_driver_user_id IS NOT NULL THEN
      PERFORM create_notification(
        v_driver_user_id,
        '✅ Devis accepté',
        v_client_name || ' a accepté votre devis de ' || NEW.amount::TEXT || '€',
        'success',
        '/driver-dashboard'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- 7. Fix notify_driver_devis_accepted_with_email
CREATE OR REPLACE FUNCTION public.notify_driver_devis_accepted_with_email()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_driver_user_id UUID;
  v_client_name TEXT;
  v_course_date TEXT;
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.status = 'pending' AND NEW.status = 'accepted') THEN
    SELECT user_id INTO v_driver_user_id
    FROM drivers
    WHERE id = NEW.driver_id;
    
    SELECT full_name INTO v_client_name
    FROM profiles
    WHERE id = (SELECT user_id FROM clients WHERE id = NEW.client_id);
    
    SELECT to_char(scheduled_date::timestamp, 'DD/MM/YYYY à HH24:MI') INTO v_course_date
    FROM courses
    WHERE id = NEW.course_id;
    
    IF v_driver_user_id IS NOT NULL THEN
      PERFORM create_notification(
        v_driver_user_id,
        '✅ Devis accepté',
        v_client_name || ' a accepté votre devis de ' || NEW.amount::TEXT || '€',
        'success',
        '/driver-dashboard'
      );
      
      PERFORM
        net.http_post(
          url := current_setting('app.settings.supabase_url') || '/functions/v1/send-driver-devis-accepted',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key')
          ),
          body := jsonb_build_object(
            'driver_id', NEW.driver_id,
            'client_name', v_client_name,
            'devis_amount', NEW.amount,
            'course_date', v_course_date
          )
        );
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- 8. Fix notify_driver_new_course
CREATE OR REPLACE FUNCTION public.notify_driver_new_course()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_driver_user_id UUID;
  v_client_name TEXT;
  v_driver_id UUID;
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.status = 'pending') THEN
    SELECT full_name INTO v_client_name
    FROM profiles
    WHERE id = (SELECT user_id FROM clients WHERE id = NEW.client_id);
    
    IF NEW.driver_id IS NOT NULL THEN
      SELECT user_id INTO v_driver_user_id
      FROM drivers
      WHERE id = NEW.driver_id;
      
      IF v_driver_user_id IS NOT NULL THEN
        PERFORM create_notification(
          v_driver_user_id,
          '🚗 Nouvelle demande de course',
          v_client_name || ' a créé une demande de course pour le ' || 
          to_char(NEW.scheduled_date::timestamp, 'DD/MM/YYYY à HH24:MI'),
          'course',
          '/driver-dashboard'
        );
      END IF;
    END IF;
    
    IF NEW.driver_ids IS NOT NULL AND array_length(NEW.driver_ids, 1) > 0 THEN
      FOR v_driver_id IN SELECT unnest(NEW.driver_ids)
      LOOP
        SELECT user_id INTO v_driver_user_id
        FROM drivers
        WHERE id = v_driver_id;
        
        IF v_driver_user_id IS NOT NULL THEN
          PERFORM create_notification(
            v_driver_user_id,
            '🚗 Nouvelle demande de course',
            v_client_name || ' a créé une demande de course pour le ' || 
            to_char(NEW.scheduled_date::timestamp, 'DD/MM/YYYY à HH24:MI'),
            'course',
            '/driver-dashboard'
          );
        END IF;
      END LOOP;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- 9. Fix notify_driver_new_course_simple
CREATE OR REPLACE FUNCTION public.notify_driver_new_course_simple()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_driver_user_id UUID;
  v_client_name TEXT;
  v_driver_id UUID;
  v_course_date TEXT;
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.status = 'pending') THEN
    IF NEW.client_id IS NOT NULL THEN
      SELECT full_name INTO v_client_name
      FROM profiles
      WHERE id = (SELECT user_id FROM clients WHERE id = NEW.client_id);
    ELSE
      v_client_name := COALESCE(NEW.guest_name, 'Client invité');
    END IF;
    
    v_course_date := to_char(NEW.scheduled_date::timestamp, 'DD/MM/YYYY à HH24:MI');
    
    IF NEW.driver_id IS NOT NULL THEN
      SELECT user_id INTO v_driver_user_id
      FROM drivers
      WHERE id = NEW.driver_id;
      
      IF v_driver_user_id IS NOT NULL THEN
        PERFORM create_notification(
          v_driver_user_id,
          '🚗 Nouvelle demande de course',
          COALESCE(v_client_name, 'Un client') || ' a créé une demande de course pour le ' || v_course_date,
          'course',
          '/driver-dashboard'
        );
      END IF;
    END IF;
    
    IF NEW.driver_ids IS NOT NULL AND array_length(NEW.driver_ids, 1) > 0 THEN
      FOR v_driver_id IN SELECT unnest(NEW.driver_ids)
      LOOP
        SELECT user_id INTO v_driver_user_id
        FROM drivers
        WHERE id = v_driver_id;
        
        IF v_driver_user_id IS NOT NULL THEN
          PERFORM create_notification(
            v_driver_user_id,
            '🚗 Nouvelle demande de course',
            COALESCE(v_client_name, 'Un client') || ' a créé une demande de course pour le ' || v_course_date,
            'course',
            '/driver-dashboard'
          );
        END IF;
      END LOOP;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- 10. Fix notify_driver_new_course_with_email
CREATE OR REPLACE FUNCTION public.notify_driver_new_course_with_email()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_driver_user_id UUID;
  v_client_name TEXT;
  v_driver_id UUID;
  v_course_date TEXT;
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.status = 'pending') THEN
    SELECT full_name INTO v_client_name
    FROM profiles
    WHERE id = (SELECT user_id FROM clients WHERE id = NEW.client_id);
    
    v_course_date := to_char(NEW.scheduled_date::timestamp, 'DD/MM/YYYY à HH24:MI');
    
    IF NEW.driver_id IS NOT NULL THEN
      SELECT user_id INTO v_driver_user_id
      FROM drivers
      WHERE id = NEW.driver_id;
      
      IF v_driver_user_id IS NOT NULL THEN
        PERFORM create_notification(
          v_driver_user_id,
          '🚗 Nouvelle demande de course',
          v_client_name || ' a créé une demande de course pour le ' || v_course_date,
          'course',
          '/driver-dashboard'
        );
        
        PERFORM
          net.http_post(
            url := current_setting('app.settings.supabase_url') || '/functions/v1/send-driver-course-request',
            headers := jsonb_build_object(
              'Content-Type', 'application/json',
              'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key')
            ),
            body := jsonb_build_object(
              'driver_id', NEW.driver_id,
              'client_name', v_client_name,
              'course_date', v_course_date,
              'pickup_address', NEW.pickup_address,
              'destination_address', NEW.destination_address
            )
          );
      END IF;
    END IF;
    
    IF NEW.driver_ids IS NOT NULL AND array_length(NEW.driver_ids, 1) > 0 THEN
      FOR v_driver_id IN SELECT unnest(NEW.driver_ids)
      LOOP
        SELECT user_id INTO v_driver_user_id
        FROM drivers
        WHERE id = v_driver_id;
        
        IF v_driver_user_id IS NOT NULL THEN
          PERFORM create_notification(
            v_driver_user_id,
            '🚗 Nouvelle demande de course',
            v_client_name || ' a créé une demande de course pour le ' || v_course_date,
            'course',
            '/driver-dashboard'
          );
          
          PERFORM
            net.http_post(
              url := current_setting('app.settings.supabase_url') || '/functions/v1/send-driver-course-request',
              headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key')
              ),
              body := jsonb_build_object(
                'driver_id', v_driver_id,
                'client_name', v_client_name,
                'course_date', v_course_date,
                'pickup_address', NEW.pickup_address,
                'destination_address', NEW.destination_address
              )
            );
        END IF;
      END LOOP;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- 11. Fix notify_new_message
CREATE OR REPLACE FUNCTION public.notify_new_message()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_recipient_id UUID;
  v_sender_name TEXT;
  v_conversation_participant_1 UUID;
  v_conversation_participant_2 UUID;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT participant_1_id, participant_2_id INTO v_conversation_participant_1, v_conversation_participant_2
    FROM conversations
    WHERE id = NEW.conversation_id;
    
    IF NEW.sender_id = v_conversation_participant_1 THEN
      v_recipient_id := v_conversation_participant_2;
    ELSE
      v_recipient_id := v_conversation_participant_1;
    END IF;
    
    SELECT full_name INTO v_sender_name
    FROM profiles
    WHERE id = NEW.sender_id;
    
    IF v_recipient_id IS NOT NULL THEN
      PERFORM create_notification(
        v_recipient_id,
        '💬 Nouveau message',
        v_sender_name || ' vous a envoyé un message',
        'message',
        '/messaging'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- 12. Fix refresh_driver_statistics
CREATE OR REPLACE FUNCTION public.refresh_driver_statistics()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY driver_statistics;
END;
$function$;

-- 13. Fix update_company_employee_timestamp (non-SECURITY DEFINER but still good practice)
CREATE OR REPLACE FUNCTION public.update_company_employee_timestamp()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 14-16. Fix price calculation functions (non-SECURITY DEFINER but still good practice)
CREATE OR REPLACE FUNCTION public.calculate_city_course_price(p_city_pricing_id uuid, p_distance_km numeric, p_duration_minutes integer, p_scheduled_date timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS TABLE(base_price numeric, distance_price numeric, time_price numeric, subtotal numeric, tva_amount numeric, total_price numeric, surcharge_evening numeric, surcharge_weekend numeric, peak_adjustment numeric, off_peak_discount numeric)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_pricing RECORD;
  v_base_price NUMERIC := 0;
  v_distance_price NUMERIC := 0;
  v_time_price NUMERIC := 0;
  v_subtotal NUMERIC := 0;
  v_tva NUMERIC := 0;
  v_evening_amount NUMERIC := 0;
  v_weekend_amount NUMERIC := 0;
  v_peak_amount NUMERIC := 0;
  v_off_peak_amount NUMERIC := 0;
  v_is_evening BOOLEAN := false;
  v_is_weekend BOOLEAN := false;
  v_is_peak BOOLEAN := false;
  v_is_off_peak BOOLEAN := false;
  v_hour INTEGER;
  v_time TIME;
  v_day_of_week INTEGER;
BEGIN
  SELECT * INTO v_pricing FROM city_pricing cp WHERE cp.id = p_city_pricing_id;
  
  IF v_pricing IS NULL THEN
    RAISE EXCEPTION 'City pricing not found';
  END IF;
  
  IF p_scheduled_date IS NOT NULL THEN
    v_hour := EXTRACT(HOUR FROM p_scheduled_date AT TIME ZONE 'Europe/Paris');
    v_time := (p_scheduled_date AT TIME ZONE 'Europe/Paris')::TIME;
    v_day_of_week := EXTRACT(DOW FROM p_scheduled_date AT TIME ZONE 'Europe/Paris');
    
    v_is_evening := (v_hour >= 20 OR v_hour < 6);
    v_is_weekend := (v_day_of_week = 0 OR v_day_of_week = 6);
    
    IF v_pricing.peak_hours_enabled AND v_pricing.peak_hours_start IS NOT NULL AND v_pricing.peak_hours_end IS NOT NULL THEN
      IF v_pricing.peak_hours_start < v_pricing.peak_hours_end THEN
        v_is_peak := v_time >= v_pricing.peak_hours_start AND v_time <= v_pricing.peak_hours_end;
      ELSE
        v_is_peak := v_time >= v_pricing.peak_hours_start OR v_time <= v_pricing.peak_hours_end;
      END IF;
    END IF;
    
    IF v_pricing.off_peak_enabled AND v_pricing.off_peak_start IS NOT NULL AND v_pricing.off_peak_end IS NOT NULL THEN
      IF v_pricing.off_peak_start < v_pricing.off_peak_end THEN
        v_is_off_peak := v_time >= v_pricing.off_peak_start AND v_time <= v_pricing.off_peak_end;
      ELSE
        v_is_off_peak := v_time >= v_pricing.off_peak_start OR v_time <= v_pricing.off_peak_end;
      END IF;
    END IF;
  END IF;
  
  IF v_pricing.pricing_type = 'hourly' THEN
    v_base_price := 0;
    v_distance_price := 0;
    v_time_price := v_pricing.hourly_rate * (p_duration_minutes / 60.0);
  ELSE
    v_base_price := v_pricing.base_fare;
    v_distance_price := v_pricing.per_km_rate * p_distance_km;
    v_time_price := 0;
  END IF;
  
  v_subtotal := v_base_price + v_distance_price + v_time_price;
  
  IF v_pricing.minimum_price > 0 AND v_subtotal < v_pricing.minimum_price THEN
    v_distance_price := v_pricing.minimum_price - v_base_price;
    IF v_distance_price < 0 THEN
      v_distance_price := 0;
      v_base_price := v_pricing.minimum_price;
    END IF;
    v_subtotal := v_pricing.minimum_price;
  END IF;
  
  IF v_is_peak AND v_pricing.peak_hours_multiplier > 1.0 THEN
    v_peak_amount := v_subtotal * (v_pricing.peak_hours_multiplier - 1.0);
    v_subtotal := v_subtotal + v_peak_amount;
  END IF;
  
  IF NOT v_is_peak AND v_is_off_peak AND v_pricing.off_peak_discount > 0 THEN
    v_off_peak_amount := v_subtotal * (v_pricing.off_peak_discount / 100);
    v_subtotal := v_subtotal - v_off_peak_amount;
  END IF;
  
  IF v_is_evening AND v_pricing.evening_surcharge > 0 THEN
    v_evening_amount := v_subtotal * (v_pricing.evening_surcharge / 100);
    v_subtotal := v_subtotal + v_evening_amount;
  END IF;
  
  IF v_is_weekend AND v_pricing.weekend_surcharge > 0 THEN
    v_weekend_amount := v_subtotal * (v_pricing.weekend_surcharge / 100);
    v_subtotal := v_subtotal + v_weekend_amount;
  END IF;
  
  IF v_pricing.tva_included THEN
    v_tva := v_subtotal - (v_subtotal / (1 + v_pricing.tva_rate / 100));
  ELSE
    v_tva := v_subtotal * (v_pricing.tva_rate / 100);
  END IF;
  
  base_price := v_base_price;
  distance_price := v_distance_price;
  time_price := v_time_price;
  subtotal := v_subtotal;
  tva_amount := v_tva;
  total_price := v_subtotal + (CASE WHEN v_pricing.tva_included THEN 0 ELSE v_tva END);
  surcharge_evening := v_evening_amount;
  surcharge_weekend := v_weekend_amount;
  peak_adjustment := v_peak_amount;
  off_peak_discount := v_off_peak_amount;
  
  RETURN NEXT;
END;
$function$;

CREATE OR REPLACE FUNCTION public.calculate_course_price(_driver_id uuid, _distance_km numeric, _duration_minutes integer, _use_hourly_rate boolean DEFAULT false, _scheduled_date timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS TABLE(base_price numeric, distance_price numeric, time_price numeric, subtotal numeric, tva_amount numeric, total_price numeric, surcharge_evening numeric, surcharge_weekend numeric)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_base_fare numeric;
  v_per_km_rate numeric;
  v_hourly_rate numeric;
  v_tva_rate numeric;
  v_tva_included boolean;
  v_evening_surcharge numeric;
  v_weekend_surcharge numeric;
  v_minimum_price numeric;
  v_subtotal numeric;
  v_tva numeric;
  v_evening_amount numeric := 0;
  v_weekend_amount numeric := 0;
  v_is_evening boolean := false;
  v_is_weekend boolean := false;
  v_hour integer;
  v_day_of_week integer;
  v_calculated_subtotal numeric;
BEGIN
  SELECT 
    COALESCE(d.base_fare, 0),
    COALESCE(d.per_km_rate, 0),
    COALESCE(d.hourly_rate, 0),
    COALESCE(d.tva_rate, 20),
    COALESCE(d.tva_included, false),
    COALESCE(d.evening_surcharge, 0),
    COALESCE(d.weekend_surcharge, 0),
    COALESCE(d.minimum_price, 0)
  INTO 
    v_base_fare,
    v_per_km_rate,
    v_hourly_rate,
    v_tva_rate,
    v_tva_included,
    v_evening_surcharge,
    v_weekend_surcharge,
    v_minimum_price
  FROM drivers d
  WHERE d.id = _driver_id;

  IF _scheduled_date IS NOT NULL THEN
    v_hour := EXTRACT(HOUR FROM _scheduled_date AT TIME ZONE 'Europe/Paris');
    v_day_of_week := EXTRACT(DOW FROM _scheduled_date AT TIME ZONE 'Europe/Paris');
    v_is_evening := (v_hour >= 20 OR v_hour < 6);
    v_is_weekend := (v_day_of_week = 0 OR v_day_of_week = 6);
  END IF;

  IF _use_hourly_rate THEN
    base_price := 0;
    distance_price := 0;
    time_price := v_hourly_rate * (_duration_minutes / 60.0);
    v_tva_rate := 20;
  ELSE
    base_price := v_base_fare;
    distance_price := v_per_km_rate * _distance_km;
    time_price := 0;
    v_tva_rate := 10;
  END IF;

  v_calculated_subtotal := base_price + distance_price + time_price;

  IF NOT _use_hourly_rate AND v_minimum_price > 0 AND v_calculated_subtotal < v_minimum_price THEN
    distance_price := v_minimum_price - base_price;
    IF distance_price < 0 THEN
      distance_price := 0;
      base_price := v_minimum_price;
    END IF;
    v_calculated_subtotal := v_minimum_price;
  END IF;

  v_subtotal := v_calculated_subtotal;

  IF v_is_evening AND v_evening_surcharge > 0 THEN
    v_evening_amount := v_subtotal * (v_evening_surcharge / 100);
    v_subtotal := v_subtotal + v_evening_amount;
  END IF;

  IF v_is_weekend AND v_weekend_surcharge > 0 THEN
    v_weekend_amount := v_subtotal * (v_weekend_surcharge / 100);
    v_subtotal := v_subtotal + v_weekend_amount;
  END IF;

  subtotal := v_subtotal;

  IF v_tva_included THEN
    v_tva := v_subtotal - (v_subtotal / (1 + v_tva_rate / 100));
  ELSE
    v_tva := v_subtotal * (v_tva_rate / 100);
  END IF;

  tva_amount := v_tva;
  total_price := v_subtotal + (CASE WHEN v_tva_included THEN 0 ELSE v_tva END);
  surcharge_evening := v_evening_amount;
  surcharge_weekend := v_weekend_amount;

  RETURN QUERY SELECT 
    base_price,
    distance_price,
    time_price,
    subtotal,
    tva_amount,
    total_price,
    surcharge_evening,
    surcharge_weekend;
END;
$function$;

CREATE OR REPLACE FUNCTION public.calculate_fleet_course_price(p_fleet_manager_id uuid, p_distance_km numeric, p_duration_minutes integer, p_use_hourly_rate boolean DEFAULT false, p_scheduled_date timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS TABLE(base_price numeric, distance_price numeric, time_price numeric, subtotal numeric, tva_amount numeric, total_price numeric, surcharge_evening numeric, surcharge_weekend numeric)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_base_fare numeric;
  v_per_km_rate numeric;
  v_hourly_rate numeric;
  v_tva_rate numeric;
  v_tva_included boolean;
  v_evening_surcharge numeric;
  v_weekend_surcharge numeric;
  v_minimum_price numeric;
  v_subtotal numeric;
  v_tva numeric;
  v_evening_amount numeric := 0;
  v_weekend_amount numeric := 0;
  v_is_evening boolean := false;
  v_is_weekend boolean := false;
  v_hour integer;
  v_day_of_week integer;
  v_calculated_subtotal numeric;
BEGIN
  SELECT 
    COALESCE(fm.base_fare, 0),
    COALESCE(fm.per_km_rate, 0),
    COALESCE(fm.hourly_rate, 0),
    COALESCE(fm.tva_rate, 20),
    COALESCE(fm.tva_included, false),
    COALESCE(fm.evening_surcharge, 0),
    COALESCE(fm.weekend_surcharge, 0),
    COALESCE(fm.minimum_price, 0)
  INTO 
    v_base_fare,
    v_per_km_rate,
    v_hourly_rate,
    v_tva_rate,
    v_tva_included,
    v_evening_surcharge,
    v_weekend_surcharge,
    v_minimum_price
  FROM fleet_managers fm
  WHERE fm.id = p_fleet_manager_id;

  IF p_scheduled_date IS NOT NULL THEN
    v_hour := EXTRACT(HOUR FROM p_scheduled_date AT TIME ZONE 'Europe/Paris');
    v_day_of_week := EXTRACT(DOW FROM p_scheduled_date AT TIME ZONE 'Europe/Paris');
    v_is_evening := (v_hour >= 20 OR v_hour < 6);
    v_is_weekend := (v_day_of_week = 0 OR v_day_of_week = 6);
  END IF;

  IF p_use_hourly_rate THEN
    base_price := 0;
    distance_price := 0;
    time_price := v_hourly_rate * (p_duration_minutes / 60.0);
    v_tva_rate := 20;
  ELSE
    base_price := v_base_fare;
    distance_price := v_per_km_rate * p_distance_km;
    time_price := 0;
    v_tva_rate := 10;
  END IF;

  v_calculated_subtotal := base_price + distance_price + time_price;

  IF NOT p_use_hourly_rate AND v_minimum_price > 0 AND v_calculated_subtotal < v_minimum_price THEN
    distance_price := v_minimum_price - base_price;
    IF distance_price < 0 THEN
      distance_price := 0;
      base_price := v_minimum_price;
    END IF;
    v_calculated_subtotal := v_minimum_price;
  END IF;

  v_subtotal := v_calculated_subtotal;

  IF v_is_evening AND v_evening_surcharge > 0 THEN
    v_evening_amount := v_subtotal * (v_evening_surcharge / 100);
    v_subtotal := v_subtotal + v_evening_amount;
  END IF;

  IF v_is_weekend AND v_weekend_surcharge > 0 THEN
    v_weekend_amount := v_subtotal * (v_weekend_surcharge / 100);
    v_subtotal := v_subtotal + v_weekend_amount;
  END IF;

  subtotal := v_subtotal;

  IF v_tva_included THEN
    v_tva := v_subtotal - (v_subtotal / (1 + v_tva_rate / 100));
  ELSE
    v_tva := v_subtotal * (v_tva_rate / 100);
  END IF;

  tva_amount := v_tva;
  total_price := v_subtotal + (CASE WHEN v_tva_included THEN 0 ELSE v_tva END);
  surcharge_evening := v_evening_amount;
  surcharge_weekend := v_weekend_amount;

  RETURN QUERY SELECT 
    base_price,
    distance_price,
    time_price,
    subtotal,
    tva_amount,
    total_price,
    surcharge_evening,
    surcharge_weekend;
END;
$function$;