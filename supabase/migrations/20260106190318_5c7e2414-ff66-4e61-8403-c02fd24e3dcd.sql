-- Ajouter le champ created_by_user_id pour savoir qui a créé la demande de partenariat
ALTER TABLE public.company_driver_agreements 
ADD COLUMN IF NOT EXISTS created_by_user_id uuid REFERENCES auth.users(id);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_company_driver_agreements_created_by 
ON public.company_driver_agreements(created_by_user_id);

-- Commentaire explicatif
COMMENT ON COLUMN public.company_driver_agreements.created_by_user_id IS 'User ID of the person who created the partnership request (admin or employee)';