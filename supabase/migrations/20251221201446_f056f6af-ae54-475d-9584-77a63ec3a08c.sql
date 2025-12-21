-- Ajouter les colonnes documents à la table fleet_managers
ALTER TABLE public.fleet_managers
ADD COLUMN IF NOT EXISTS documents jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS documents_submitted_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS documents_deadline timestamp with time zone,
ADD COLUMN IF NOT EXISTS documents_status text DEFAULT 'pending' CHECK (documents_status IN ('pending', 'submitted', 'validated', 'rejected'));

-- Créer un bucket de stockage pour les documents fleet managers
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'fleet-manager-documents',
  'fleet-manager-documents',
  false,
  10485760, -- 10MB max
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
)
ON CONFLICT (id) DO NOTHING;

-- Politiques de stockage pour les documents
CREATE POLICY "Fleet managers can upload their documents"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'fleet-manager-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Fleet managers can view their documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'fleet-manager-documents'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'admin')
  )
);

CREATE POLICY "Fleet managers can update their documents"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'fleet-manager-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Fleet managers can delete their documents"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'fleet-manager-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can manage all fleet manager documents"
ON storage.objects
FOR ALL
USING (
  bucket_id = 'fleet-manager-documents'
  AND public.has_role(auth.uid(), 'admin')
);

-- Fonction pour définir la deadline des documents à l'inscription
CREATE OR REPLACE FUNCTION public.set_fleet_manager_documents_deadline()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Définir la deadline à 7 jours après l'inscription
  NEW.documents_deadline := NEW.created_at + INTERVAL '7 days';
  RETURN NEW;
END;
$$;

-- Trigger pour appliquer la deadline automatiquement
DROP TRIGGER IF EXISTS set_fleet_manager_documents_deadline_trigger ON public.fleet_managers;
CREATE TRIGGER set_fleet_manager_documents_deadline_trigger
  BEFORE INSERT ON public.fleet_managers
  FOR EACH ROW
  EXECUTE FUNCTION public.set_fleet_manager_documents_deadline();