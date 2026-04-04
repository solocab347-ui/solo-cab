-- Fix: Set default_payment_method_id for client Abdfg who has a saved card but no default set
UPDATE public.clients 
SET default_payment_method_id = 'pm_1TIVm2AdFPYTU471cRtUfz5z'
WHERE id = '4d874bce-2cf6-4136-bcfc-c52aff363ff3'
AND default_payment_method_id IS NULL;