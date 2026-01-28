-- Ajouter la colonne has_nfc_plate pour tracker les chauffeurs ayant une plaque NFC
ALTER TABLE public.drivers 
ADD COLUMN IF NOT EXISTS has_nfc_plate boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS nfc_plate_order_id uuid REFERENCES public.nfc_plate_orders(id),
ADD COLUMN IF NOT EXISTS nfc_plate_ordered_at timestamp with time zone;

-- Créer un index pour recherche rapide
CREATE INDEX IF NOT EXISTS idx_drivers_has_nfc_plate ON public.drivers(has_nfc_plate);

-- Créer une fonction pour synchroniser automatiquement has_nfc_plate quand une commande est payée
CREATE OR REPLACE FUNCTION public.sync_driver_nfc_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Si le paiement passe à 'paid' et qu'un driver_id est lié
  IF NEW.payment_status = 'paid' AND NEW.driver_id IS NOT NULL THEN
    UPDATE public.drivers
    SET 
      has_nfc_plate = true,
      nfc_plate_order_id = NEW.id,
      nfc_plate_ordered_at = NOW()
    WHERE id = NEW.driver_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Créer le trigger sur nfc_plate_orders
DROP TRIGGER IF EXISTS trigger_sync_driver_nfc_status ON public.nfc_plate_orders;
CREATE TRIGGER trigger_sync_driver_nfc_status
  AFTER INSERT OR UPDATE OF payment_status ON public.nfc_plate_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_driver_nfc_status();

-- Synchroniser les données existantes: marquer les drivers ayant déjà une commande payée
UPDATE public.drivers d
SET 
  has_nfc_plate = true,
  nfc_plate_order_id = o.id,
  nfc_plate_ordered_at = o.created_at
FROM public.nfc_plate_orders o
WHERE o.driver_id = d.id 
  AND o.payment_status = 'paid'
  AND d.has_nfc_plate IS NOT TRUE;