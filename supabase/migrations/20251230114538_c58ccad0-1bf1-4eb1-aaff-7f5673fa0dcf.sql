-- Table pour les documents de véhicules
CREATE TABLE public.vehicle_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES public.driver_vehicles(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  document_url TEXT,
  file_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  validated_by UUID REFERENCES public.profiles(id),
  validated_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  expires_at DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(vehicle_id, document_type)
);

-- Index pour les performances
CREATE INDEX idx_vehicle_documents_vehicle ON public.vehicle_documents(vehicle_id);
CREATE INDEX idx_vehicle_documents_driver ON public.vehicle_documents(driver_id);
CREATE INDEX idx_vehicle_documents_status ON public.vehicle_documents(status);

-- Enable RLS
ALTER TABLE public.vehicle_documents ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Drivers can view own vehicle documents"
ON public.vehicle_documents FOR SELECT
USING (driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid()));

CREATE POLICY "Drivers can insert own vehicle documents"
ON public.vehicle_documents FOR INSERT
WITH CHECK (driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid()));

CREATE POLICY "Drivers can update own vehicle documents"
ON public.vehicle_documents FOR UPDATE
USING (driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid()));

CREATE POLICY "Fleet managers can view driver vehicle documents"
ON public.vehicle_documents FOR SELECT
USING (driver_id IN (
  SELECT fmd.driver_id FROM public.fleet_manager_drivers fmd
  JOIN public.fleet_managers fm ON fmd.fleet_manager_id = fm.id
  WHERE fm.user_id = auth.uid()
));

CREATE POLICY "Fleet managers can update driver vehicle documents"
ON public.vehicle_documents FOR UPDATE
USING (driver_id IN (
  SELECT fmd.driver_id FROM public.fleet_manager_drivers fmd
  JOIN public.fleet_managers fm ON fmd.fleet_manager_id = fm.id
  WHERE fm.user_id = auth.uid()
));

CREATE POLICY "Admins can manage all vehicle documents"
ON public.vehicle_documents FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION public.update_vehicle_documents_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_vehicle_documents_timestamp
BEFORE UPDATE ON public.vehicle_documents
FOR EACH ROW EXECUTE FUNCTION public.update_vehicle_documents_timestamp();

-- Ajouter colonne sur driver_vehicles
ALTER TABLE public.driver_vehicles ADD COLUMN IF NOT EXISTS documents_validated BOOLEAN DEFAULT false;

-- Fonction pour créer les documents requis lors de l'ajout d'un véhicule
CREATE OR REPLACE FUNCTION public.create_vehicle_document_requirements()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.vehicle_documents (vehicle_id, driver_id, document_type, status)
  VALUES 
    (NEW.id, NEW.driver_id, 'carte_grise', 'pending'),
    (NEW.id, NEW.driver_id, 'assurance', 'pending'),
    (NEW.id, NEW.driver_id, 'controle_technique', 'pending');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER create_vehicle_documents_on_insert
AFTER INSERT ON public.driver_vehicles
FOR EACH ROW EXECUTE FUNCTION public.create_vehicle_document_requirements();

-- Fonction pour vérifier si tous les documents d'un véhicule sont validés
CREATE OR REPLACE FUNCTION public.check_vehicle_documents_status(_vehicle_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  all_validated BOOLEAN;
BEGIN
  SELECT BOOL_AND(status = 'validated') INTO all_validated
  FROM public.vehicle_documents WHERE vehicle_id = _vehicle_id;
  RETURN COALESCE(all_validated, false);
END;
$$;

-- Fonction et trigger pour mettre à jour le statut de validation
CREATE OR REPLACE FUNCTION public.update_vehicle_validation_status()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.driver_vehicles
  SET documents_validated = public.check_vehicle_documents_status(NEW.vehicle_id)
  WHERE id = NEW.vehicle_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_vehicle_documents_validation
AFTER UPDATE ON public.vehicle_documents
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.update_vehicle_validation_status();