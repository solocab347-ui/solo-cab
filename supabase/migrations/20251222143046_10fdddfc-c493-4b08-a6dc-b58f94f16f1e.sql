-- Ajouter les colonnes pour les promotions gestionnaire de flotte
ALTER TABLE public.fleet_managers
ADD COLUMN IF NOT EXISTS first_order_commission_reduction numeric DEFAULT 50,
ADD COLUMN IF NOT EXISTS first_order_discount_percentage numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS first_order_discount_fixed numeric DEFAULT 0;

-- Table pour les promotions des gestionnaires de flotte
CREATE TABLE IF NOT EXISTS public.fleet_promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fleet_manager_id uuid NOT NULL REFERENCES public.fleet_managers(id) ON DELETE CASCADE,
  code text NOT NULL,
  description text,
  type text NOT NULL CHECK (type IN ('percentage', 'fixed', 'first_order')),
  value numeric NOT NULL,
  min_amount numeric DEFAULT 0,
  max_uses integer,
  current_uses integer DEFAULT 0,
  valid_until timestamp with time zone,
  active boolean DEFAULT true,
  for_new_clients_only boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(fleet_manager_id, code)
);

-- Table pour tracker les premières commandes des clients
CREATE TABLE IF NOT EXISTS public.client_first_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  fleet_manager_id uuid REFERENCES public.fleet_managers(id) ON DELETE SET NULL,
  driver_id uuid REFERENCES public.drivers(id) ON DELETE SET NULL,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  discount_applied numeric DEFAULT 0,
  commission_reduced boolean DEFAULT false,
  original_commission_percentage numeric,
  reduced_commission_percentage numeric,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(client_id, fleet_manager_id),
  UNIQUE(client_id, driver_id)
);

-- Activer RLS
ALTER TABLE public.fleet_promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_first_orders ENABLE ROW LEVEL SECURITY;

-- Policies pour fleet_promotions
CREATE POLICY "Fleet managers can manage their promotions"
ON public.fleet_promotions FOR ALL
USING (fleet_manager_id IN (SELECT id FROM fleet_managers WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage all fleet promotions"
ON public.fleet_promotions FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Public can view active fleet promotions for validation"
ON public.fleet_promotions FOR SELECT
USING (active = true);

-- Policies pour client_first_orders
CREATE POLICY "Fleet managers can view their first orders"
ON public.client_first_orders FOR SELECT
USING (fleet_manager_id IN (SELECT id FROM fleet_managers WHERE user_id = auth.uid()));

CREATE POLICY "Drivers can view their first orders"
ON public.client_first_orders FOR SELECT
USING (driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage all first orders"
ON public.client_first_orders FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Fonction pour vérifier si c'est une première commande
CREATE OR REPLACE FUNCTION public.is_first_order(
  p_client_id uuid,
  p_fleet_manager_id uuid DEFAULT NULL,
  p_driver_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_fleet_manager_id IS NOT NULL THEN
    RETURN NOT EXISTS (
      SELECT 1 FROM client_first_orders 
      WHERE client_id = p_client_id AND fleet_manager_id = p_fleet_manager_id
    );
  ELSIF p_driver_id IS NOT NULL THEN
    RETURN NOT EXISTS (
      SELECT 1 FROM client_first_orders 
      WHERE client_id = p_client_id AND driver_id = p_driver_id
    );
  END IF;
  RETURN false;
END;
$$;

-- Fonction pour appliquer la réduction première commande
CREATE OR REPLACE FUNCTION public.apply_first_order_discount(
  p_client_id uuid,
  p_course_id uuid,
  p_fleet_manager_id uuid DEFAULT NULL,
  p_driver_id uuid DEFAULT NULL,
  p_original_amount numeric DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_discount numeric := 0;
  v_discount_percentage numeric := 0;
  v_discount_fixed numeric := 0;
  v_commission_reduction numeric := 50;
  v_original_commission numeric := 0;
  v_is_first boolean;
BEGIN
  -- Vérifier si c'est une première commande
  v_is_first := is_first_order(p_client_id, p_fleet_manager_id, p_driver_id);
  
  IF NOT v_is_first THEN
    RETURN jsonb_build_object(
      'is_first_order', false,
      'discount', 0,
      'final_amount', p_original_amount
    );
  END IF;
  
  -- Récupérer les paramètres de réduction
  IF p_fleet_manager_id IS NOT NULL THEN
    SELECT 
      COALESCE(first_order_discount_percentage, 0),
      COALESCE(first_order_discount_fixed, 0),
      COALESCE(first_order_commission_reduction, 50),
      COALESCE(default_commission_percentage, 10)
    INTO v_discount_percentage, v_discount_fixed, v_commission_reduction, v_original_commission
    FROM fleet_managers WHERE id = p_fleet_manager_id;
  END IF;
  
  -- Calculer la réduction
  IF v_discount_percentage > 0 THEN
    v_discount := p_original_amount * (v_discount_percentage / 100);
  END IF;
  IF v_discount_fixed > 0 THEN
    v_discount := GREATEST(v_discount, v_discount_fixed);
  END IF;
  
  -- Enregistrer la première commande
  INSERT INTO client_first_orders (
    client_id, 
    course_id, 
    fleet_manager_id, 
    driver_id,
    discount_applied,
    commission_reduced,
    original_commission_percentage,
    reduced_commission_percentage
  ) VALUES (
    p_client_id,
    p_course_id,
    p_fleet_manager_id,
    p_driver_id,
    v_discount,
    true,
    v_original_commission,
    v_original_commission * (1 - v_commission_reduction / 100)
  );
  
  RETURN jsonb_build_object(
    'is_first_order', true,
    'discount', v_discount,
    'final_amount', GREATEST(0, p_original_amount - v_discount),
    'commission_reduced', true,
    'original_commission', v_original_commission,
    'reduced_commission', v_original_commission * (1 - v_commission_reduction / 100)
  );
END;
$$;