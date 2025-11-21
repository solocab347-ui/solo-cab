-- Fix security for notification functions by adding search_path
CREATE OR REPLACE FUNCTION public.notify_new_course()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  driver_user_id uuid;
  client_user_id uuid;
  driver_name text;
  client_name text;
BEGIN
  -- Get driver and client user IDs
  SELECT user_id INTO driver_user_id FROM public.drivers WHERE id = NEW.driver_id;
  SELECT user_id INTO client_user_id FROM public.clients WHERE id = NEW.client_id;
  
  -- Get names
  SELECT full_name INTO driver_name FROM public.profiles WHERE id = driver_user_id;
  SELECT full_name INTO client_name FROM public.profiles WHERE id = client_user_id;
  
  -- Notify driver if client created the course
  IF NEW.created_by_user_id = client_user_id THEN
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (
      driver_user_id,
      'Nouvelle demande de course',
      client_name || ' a demandé une course',
      'info',
      '/driver-dashboard'
    );
  END IF;
  
  -- Notify client if driver created the course
  IF NEW.created_by_user_id = driver_user_id THEN
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (
      client_user_id,
      'Nouvelle réservation',
      driver_name || ' a créé une réservation pour vous',
      'info',
      '/client-dashboard'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_new_devis()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  client_user_id uuid;
  driver_name text;
BEGIN
  -- Get client user ID
  SELECT user_id INTO client_user_id FROM public.clients WHERE id = NEW.client_id;
  
  -- Get driver name
  SELECT p.full_name INTO driver_name 
  FROM public.profiles p 
  JOIN public.drivers d ON d.user_id = p.id 
  WHERE d.id = NEW.driver_id;
  
  -- Notify client of new devis
  INSERT INTO public.notifications (user_id, title, message, type, link)
  VALUES (
    client_user_id,
    'Nouveau devis reçu',
    driver_name || ' vous a envoyé un devis de ' || NEW.amount || '€',
    'success',
    '/client-dashboard'
  );
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  receiver_id uuid;
  sender_name text;
BEGIN
  -- Get receiver ID (the other participant in conversation)
  SELECT CASE 
    WHEN c.participant_1_id = NEW.sender_id THEN c.participant_2_id
    ELSE c.participant_1_id
  END INTO receiver_id
  FROM public.conversations c
  WHERE c.id = NEW.conversation_id;
  
  -- Get sender name
  SELECT full_name INTO sender_name FROM public.profiles WHERE id = NEW.sender_id;
  
  -- Notify receiver of new message
  INSERT INTO public.notifications (user_id, title, message, type, link)
  VALUES (
    receiver_id,
    'Nouveau message',
    sender_name || ' vous a envoyé un message',
    'info',
    '/driver-dashboard'
  );
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_new_facture()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  client_user_id uuid;
  driver_name text;
BEGIN
  -- Get client user ID
  SELECT user_id INTO client_user_id FROM public.clients WHERE id = NEW.client_id;
  
  -- Get driver name
  SELECT p.full_name INTO driver_name 
  FROM public.profiles p 
  JOIN public.drivers d ON d.user_id = p.id 
  WHERE d.id = NEW.driver_id;
  
  -- Notify client of new facture
  INSERT INTO public.notifications (user_id, title, message, type, link)
  VALUES (
    client_user_id,
    'Nouvelle facture',
    driver_name || ' a généré une facture de ' || NEW.amount || '€',
    'success',
    '/client-dashboard'
  );
  
  RETURN NEW;
END;
$$;