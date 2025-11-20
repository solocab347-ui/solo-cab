-- PARTIE 3: MODULE CHAUFFEUR - Ajouter champs professionnels

-- 1. Ajouter tous les champs manquants de la structure MongoDB
ALTER TABLE public.drivers 
ADD COLUMN IF NOT EXISTS vehicle_color TEXT,
ADD COLUMN IF NOT EXISTS hourly_rate DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS base_fare DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS tva_rate DECIMAL(5, 2) DEFAULT 20.00,
ADD COLUMN IF NOT EXISTS company_name TEXT,
ADD COLUMN IF NOT EXISTS siret TEXT,
ADD COLUMN IF NOT EXISTS quote_counter INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS invoice_counter INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS course_counter INTEGER DEFAULT 0;

-- 2. Créer index pour les compteurs et numéros professionnels
CREATE INDEX IF NOT EXISTS idx_drivers_siret ON public.drivers(siret) WHERE siret IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_drivers_company ON public.drivers(company_name) WHERE company_name IS NOT NULL;

-- 3. Fonction pour générer numéro de devis (REV-001, REV-002...)
CREATE OR REPLACE FUNCTION public.generate_quote_number(_driver_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _counter INTEGER;
  _quote_number TEXT;
BEGIN
  -- Incrémenter le compteur
  UPDATE public.drivers
  SET quote_counter = quote_counter + 1
  WHERE id = _driver_id
  RETURNING quote_counter INTO _counter;
  
  -- Générer le numéro (REV-001, REV-002, etc.)
  _quote_number := 'REV-' || LPAD(_counter::TEXT, 3, '0');
  
  RETURN _quote_number;
END;
$$;

-- 4. Fonction pour générer numéro de facture (FAC-001, FAC-002...)
CREATE OR REPLACE FUNCTION public.generate_invoice_number(_driver_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _counter INTEGER;
  _invoice_number TEXT;
BEGIN
  -- Incrémenter le compteur
  UPDATE public.drivers
  SET invoice_counter = invoice_counter + 1
  WHERE id = _driver_id
  RETURNING invoice_counter INTO _counter;
  
  -- Générer le numéro (FAC-001, FAC-002, etc.)
  _invoice_number := 'FAC-' || LPAD(_counter::TEXT, 3, '0');
  
  RETURN _invoice_number;
END;
$$;

-- 5. Fonction pour générer numéro de course (DEV-001, DEV-002...)
CREATE OR REPLACE FUNCTION public.generate_course_number(_driver_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _counter INTEGER;
  _course_number TEXT;
BEGIN
  -- Incrémenter le compteur
  UPDATE public.drivers
  SET course_counter = course_counter + 1
  WHERE id = _driver_id
  RETURNING course_counter INTO _counter;
  
  -- Générer le numéro (DEV-001, DEV-002, etc.)
  _course_number := 'DEV-' || LPAD(_counter::TEXT, 3, '0');
  
  RETURN _course_number;
END;
$$;

-- 6. Fonction pour calculer le prix d'une course selon les tarifs du chauffeur
CREATE OR REPLACE FUNCTION public.calculate_course_price(
  _driver_id UUID,
  _distance_km DECIMAL,
  _duration_minutes INTEGER,
  _use_hourly_rate BOOLEAN DEFAULT false
)
RETURNS TABLE (
  base_price DECIMAL,
  distance_price DECIMAL,
  time_price DECIMAL,
  subtotal DECIMAL,
  tva_amount DECIMAL,
  total_price DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _base_fare DECIMAL;
  _per_km_rate DECIMAL;
  _hourly_rate DECIMAL;
  _tva_rate DECIMAL;
  _base DECIMAL;
  _distance DECIMAL;
  _time DECIMAL;
  _sub DECIMAL;
  _tva DECIMAL;
  _total DECIMAL;
BEGIN
  -- Récupérer les tarifs du chauffeur
  SELECT 
    d.base_fare,
    d.per_km_rate,
    d.hourly_rate,
    d.tva_rate
  INTO 
    _base_fare,
    _per_km_rate,
    _hourly_rate,
    _tva_rate
  FROM public.drivers d
  WHERE d.id = _driver_id;
  
  -- Calculs
  _base := COALESCE(_base_fare, 0);
  _distance := COALESCE(_distance_km * _per_km_rate, 0);
  
  -- Calcul temps : soit hourly_rate (par heure) soit inclus dans base
  IF _use_hourly_rate AND _hourly_rate IS NOT NULL THEN
    _time := (_duration_minutes / 60.0) * _hourly_rate;
  ELSE
    _time := 0;
  END IF;
  
  _sub := _base + _distance + _time;
  _tva := _sub * (COALESCE(_tva_rate, 20) / 100.0);
  _total := _sub + _tva;
  
  RETURN QUERY SELECT 
    _base,
    _distance,
    _time,
    _sub,
    _tva,
    _total;
END;
$$;

-- 7. Ajouter colonne pour stocker numéro de devis/facture/course
ALTER TABLE public.devis 
ADD COLUMN IF NOT EXISTS quote_number TEXT UNIQUE;

ALTER TABLE public.factures
ADD COLUMN IF NOT EXISTS invoice_number_generated TEXT UNIQUE;

ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS course_number TEXT;

-- 8. Index pour les numéros
CREATE INDEX IF NOT EXISTS idx_devis_quote_number ON public.devis(quote_number);
CREATE INDEX IF NOT EXISTS idx_factures_invoice_generated ON public.factures(invoice_number_generated);
CREATE INDEX IF NOT EXISTS idx_courses_course_number ON public.courses(course_number);

-- 9. Commentaires documentation
COMMENT ON COLUMN public.drivers.quote_counter IS 'Compteur pour générer REV-001, REV-002, etc.';
COMMENT ON COLUMN public.drivers.invoice_counter IS 'Compteur pour générer FAC-001, FAC-002, etc.';
COMMENT ON COLUMN public.drivers.course_counter IS 'Compteur pour générer DEV-001, DEV-002, etc.';
COMMENT ON COLUMN public.drivers.base_fare IS 'Tarif de base pour une course (forfait départ)';
COMMENT ON COLUMN public.drivers.hourly_rate IS 'Tarif horaire si facturation au temps';
COMMENT ON COLUMN public.drivers.tva_rate IS 'Taux de TVA appliqué (par défaut 20%)';
COMMENT ON COLUMN public.drivers.siret IS 'Numéro SIRET pour chauffeurs professionnels';