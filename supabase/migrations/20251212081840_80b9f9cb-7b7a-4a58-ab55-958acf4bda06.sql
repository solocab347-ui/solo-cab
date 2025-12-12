
-- Ajouter un code unique à chaque chauffeur
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS driver_code TEXT UNIQUE;

-- Générer automatiquement un code pour les chauffeurs existants
UPDATE public.drivers 
SET driver_code = 'DRV-' || UPPER(SUBSTRING(id::text, 1, 6))
WHERE driver_code IS NULL;

-- Fonction pour générer le code automatiquement à la création
CREATE OR REPLACE FUNCTION public.generate_driver_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.driver_code IS NULL THEN
    NEW.driver_code := 'DRV-' || UPPER(SUBSTRING(NEW.id::text, 1, 6));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger pour générer le code automatiquement
DROP TRIGGER IF EXISTS trigger_generate_driver_code ON public.drivers;
CREATE TRIGGER trigger_generate_driver_code
  BEFORE INSERT ON public.drivers
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_driver_code();

-- Table des partenariats entre chauffeurs
CREATE TABLE public.driver_partnerships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_a_id UUID REFERENCES public.drivers(id) ON DELETE CASCADE NOT NULL,
  driver_b_id UUID REFERENCES public.drivers(id) ON DELETE CASCADE NOT NULL,
  commission_percentage NUMERIC DEFAULT 10 CHECK (commission_percentage >= 0 AND commission_percentage <= 50),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'terminated')),
  proposed_by UUID REFERENCES public.drivers(id) NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(driver_a_id, driver_b_id),
  CHECK (driver_a_id != driver_b_id)
);

-- Table des courses partagées
CREATE TABLE public.shared_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  partnership_id UUID REFERENCES public.driver_partnerships(id) ON DELETE CASCADE NOT NULL,
  sender_driver_id UUID REFERENCES public.drivers(id) ON DELETE CASCADE NOT NULL,
  receiver_driver_id UUID REFERENCES public.drivers(id) ON DELETE CASCADE NOT NULL,
  course_amount NUMERIC NOT NULL,
  commission_percentage NUMERIC NOT NULL,
  commission_amount NUMERIC NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'completed', 'cancelled')),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index pour les performances
CREATE INDEX idx_driver_partnerships_driver_a ON public.driver_partnerships(driver_a_id);
CREATE INDEX idx_driver_partnerships_driver_b ON public.driver_partnerships(driver_b_id);
CREATE INDEX idx_driver_partnerships_status ON public.driver_partnerships(status);
CREATE INDEX idx_shared_courses_sender ON public.shared_courses(sender_driver_id);
CREATE INDEX idx_shared_courses_receiver ON public.shared_courses(receiver_driver_id);
CREATE INDEX idx_shared_courses_status ON public.shared_courses(status);
CREATE INDEX idx_drivers_driver_code ON public.drivers(driver_code);

-- RLS pour driver_partnerships
ALTER TABLE public.driver_partnerships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Drivers can view their partnerships"
ON public.driver_partnerships FOR SELECT
USING (
  driver_a_id = get_driver_id(auth.uid()) OR 
  driver_b_id = get_driver_id(auth.uid())
);

CREATE POLICY "Drivers can create partnerships"
ON public.driver_partnerships FOR INSERT
WITH CHECK (
  proposed_by = get_driver_id(auth.uid()) AND
  (driver_a_id = get_driver_id(auth.uid()) OR driver_b_id = get_driver_id(auth.uid()))
);

CREATE POLICY "Drivers can update their partnerships"
ON public.driver_partnerships FOR UPDATE
USING (
  driver_a_id = get_driver_id(auth.uid()) OR 
  driver_b_id = get_driver_id(auth.uid())
);

CREATE POLICY "Drivers can delete their partnerships"
ON public.driver_partnerships FOR DELETE
USING (
  driver_a_id = get_driver_id(auth.uid()) OR 
  driver_b_id = get_driver_id(auth.uid())
);

-- RLS pour shared_courses
ALTER TABLE public.shared_courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Drivers can view their shared courses"
ON public.shared_courses FOR SELECT
USING (
  sender_driver_id = get_driver_id(auth.uid()) OR 
  receiver_driver_id = get_driver_id(auth.uid())
);

CREATE POLICY "Drivers can create shared courses"
ON public.shared_courses FOR INSERT
WITH CHECK (
  sender_driver_id = get_driver_id(auth.uid())
);

CREATE POLICY "Drivers can update their shared courses"
ON public.shared_courses FOR UPDATE
USING (
  sender_driver_id = get_driver_id(auth.uid()) OR 
  receiver_driver_id = get_driver_id(auth.uid())
);

-- Vue pour calculer les soldes entre partenaires
CREATE OR REPLACE VIEW public.driver_partnership_balances AS
SELECT 
  dp.id as partnership_id,
  dp.driver_a_id,
  dp.driver_b_id,
  dp.commission_percentage,
  dp.status,
  -- Montant que driver_a doit à driver_b (courses envoyées par A, effectuées par B)
  COALESCE(SUM(CASE 
    WHEN sc.sender_driver_id = dp.driver_a_id AND sc.status = 'completed' 
    THEN sc.commission_amount 
    ELSE 0 
  END), 0) as driver_a_owes_b,
  -- Montant que driver_b doit à driver_a (courses envoyées par B, effectuées par A)
  COALESCE(SUM(CASE 
    WHEN sc.sender_driver_id = dp.driver_b_id AND sc.status = 'completed' 
    THEN sc.commission_amount 
    ELSE 0 
  END), 0) as driver_b_owes_a,
  -- Solde net (positif = driver_a doit à driver_b, négatif = driver_b doit à driver_a)
  COALESCE(SUM(CASE 
    WHEN sc.sender_driver_id = dp.driver_a_id AND sc.status = 'completed' 
    THEN sc.commission_amount 
    WHEN sc.sender_driver_id = dp.driver_b_id AND sc.status = 'completed' 
    THEN -sc.commission_amount 
    ELSE 0 
  END), 0) as net_balance,
  -- Nombre de courses partagées
  COUNT(CASE WHEN sc.status = 'completed' THEN 1 END) as total_shared_courses
FROM public.driver_partnerships dp
LEFT JOIN public.shared_courses sc ON sc.partnership_id = dp.id
GROUP BY dp.id, dp.driver_a_id, dp.driver_b_id, dp.commission_percentage, dp.status;

-- Fonction pour rechercher un chauffeur par son code
CREATE OR REPLACE FUNCTION public.find_driver_by_code(_code TEXT)
RETURNS TABLE (
  id UUID,
  driver_code TEXT,
  full_name TEXT,
  company_name TEXT,
  profile_photo_url TEXT,
  rating NUMERIC,
  total_rides INTEGER
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    d.id,
    d.driver_code,
    p.full_name,
    d.company_name,
    p.profile_photo_url,
    d.rating,
    d.total_rides
  FROM public.drivers d
  JOIN public.profiles p ON d.user_id = p.id
  WHERE UPPER(d.driver_code) = UPPER(_code)
    AND d.status = 'validated';
$$;
