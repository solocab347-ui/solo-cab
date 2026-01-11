-- ============================================
-- MIGRATION: Correction TVA et stockage airport_fee
-- Ajoute les colonnes pour stocker explicitement la TVA utilisée et les frais aéroport
-- ============================================

-- 1. Ajouter les colonnes TVA et airport_fee à la table devis
ALTER TABLE public.devis 
ADD COLUMN IF NOT EXISTS tva_rate NUMERIC DEFAULT 10,
ADD COLUMN IF NOT EXISTS tva_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS airport_fee NUMERIC DEFAULT 0;

-- 2. Ajouter les colonnes TVA à la table factures
ALTER TABLE public.factures 
ADD COLUMN IF NOT EXISTS tva_rate NUMERIC DEFAULT 10,
ADD COLUMN IF NOT EXISTS tva_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS airport_fee NUMERIC DEFAULT 0;

-- 3. Mettre à jour les devis existants pour calculer la TVA correctement
-- Pour les mises à disposition (time_price > 0), TVA = 20%
-- Pour les courses classiques, TVA = 10%
UPDATE public.devis
SET 
  tva_rate = CASE 
    WHEN time_price > 0 AND (distance_price IS NULL OR distance_price = 0) THEN 20 
    ELSE 10 
  END,
  tva_amount = CASE 
    WHEN time_price > 0 AND (distance_price IS NULL OR distance_price = 0) THEN 
      amount - (amount / 1.20)
    ELSE 
      amount - (amount / 1.10)
  END
WHERE tva_rate IS NULL OR tva_amount IS NULL OR tva_amount = 0;

-- 4. Mettre à jour les factures existantes pour calculer la TVA correctement
-- On doit joindre avec devis pour déterminer le type de course
UPDATE public.factures f
SET 
  tva_rate = CASE 
    WHEN d.time_price > 0 AND (d.distance_price IS NULL OR d.distance_price = 0) THEN 20 
    ELSE 10 
  END,
  tva_amount = CASE 
    WHEN d.time_price > 0 AND (d.distance_price IS NULL OR d.distance_price = 0) THEN 
      f.amount - (f.amount / 1.20)
    ELSE 
      f.amount - (f.amount / 1.10)
  END
FROM public.devis d
WHERE f.devis_id = d.id
  AND (f.tva_rate IS NULL OR f.tva_amount IS NULL OR f.tva_amount = 0);

-- 5. Créer une fonction helper pour déterminer le taux TVA selon le type de course
CREATE OR REPLACE FUNCTION public.get_course_tva_rate(
  p_is_hourly_rate BOOLEAN DEFAULT FALSE
)
RETURNS NUMERIC
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Selon la législation française VTC:
  -- - 10% TVA pour les courses classiques (transport de personnes)
  -- - 20% TVA pour les mises à disposition (location avec chauffeur)
  IF p_is_hourly_rate THEN
    RETURN 20;
  ELSE
    RETURN 10;
  END IF;
END;
$$;

-- 6. Ajouter un commentaire explicatif sur les colonnes
COMMENT ON COLUMN public.devis.tva_rate IS 'Taux de TVA appliqué: 10% pour courses classiques, 20% pour mises à disposition';
COMMENT ON COLUMN public.devis.tva_amount IS 'Montant de TVA calculé lors de la création du devis';
COMMENT ON COLUMN public.devis.airport_fee IS 'Frais aéroport appliqués si départ/arrivée depuis un aéroport';
COMMENT ON COLUMN public.factures.tva_rate IS 'Taux de TVA appliqué: 10% pour courses classiques, 20% pour mises à disposition';
COMMENT ON COLUMN public.factures.tva_amount IS 'Montant de TVA calculé lors de la création de la facture';
COMMENT ON COLUMN public.factures.airport_fee IS 'Frais aéroport inclus dans le montant';