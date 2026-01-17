-- Table pour les commandes de plaques NFC
CREATE TABLE public.nfc_plate_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID REFERENCES public.drivers(id),
  user_id UUID,
  
  -- Informations de contact (pour commandes sans compte)
  email TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  
  -- Adresse d'expédition
  shipping_address TEXT NOT NULL,
  shipping_city TEXT NOT NULL,
  shipping_postal_code TEXT NOT NULL,
  shipping_country TEXT NOT NULL DEFAULT 'France',
  
  -- Informations de commande
  order_number TEXT NOT NULL UNIQUE,
  amount NUMERIC(10,2) NOT NULL DEFAULT 29.99,
  stripe_payment_intent_id TEXT,
  stripe_checkout_session_id TEXT,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  
  -- Lien QR code associé (pour chauffeurs inscrits)
  qr_code_link TEXT,
  
  -- Statut de livraison
  delivery_status TEXT NOT NULL DEFAULT 'pending',
  tracking_number TEXT,
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  estimated_delivery_date DATE,
  
  -- Tracking token pour suivi sans compte
  tracking_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  
  -- Avec abonnement ?
  with_subscription BOOLEAN DEFAULT false,
  subscription_id TEXT,
  
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.nfc_plate_orders ENABLE ROW LEVEL SECURITY;

-- Policy pour les admins (utilise 'roles' au lieu de 'role')
CREATE POLICY "Admins can manage all orders"
ON public.nfc_plate_orders
FOR ALL
USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND 'admin' = ANY(roles))
);

-- Policy pour les chauffeurs (leurs propres commandes)
CREATE POLICY "Drivers can view their own orders"
ON public.nfc_plate_orders
FOR SELECT
USING (
  driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid())
);

-- Policy pour insertion publique (commandes sans compte)
CREATE POLICY "Anyone can create plate orders"
ON public.nfc_plate_orders
FOR INSERT
WITH CHECK (true);

-- Policy pour consultation par token de suivi
CREATE POLICY "Anyone can view orders by tracking token"
ON public.nfc_plate_orders
FOR SELECT
USING (tracking_token IS NOT NULL);

-- Index pour recherche par token
CREATE INDEX idx_nfc_plate_orders_tracking_token ON public.nfc_plate_orders(tracking_token);
CREATE INDEX idx_nfc_plate_orders_order_number ON public.nfc_plate_orders(order_number);
CREATE INDEX idx_nfc_plate_orders_email ON public.nfc_plate_orders(email);
CREATE INDEX idx_nfc_plate_orders_driver_id ON public.nfc_plate_orders(driver_id);

-- Trigger pour mise à jour automatique
CREATE TRIGGER update_nfc_plate_orders_updated_at
BEFORE UPDATE ON public.nfc_plate_orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();