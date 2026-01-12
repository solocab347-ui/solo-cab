
-- Supprimer la contrainte qui bloque les devis pour les courses sans client/company
-- Cette contrainte empêche les chauffeurs de créer des devis pour leurs propres courses (clients non inscrits)
ALTER TABLE public.devis DROP CONSTRAINT IF EXISTS devis_client_or_company_check;

-- La contrainte n'est plus nécessaire car:
-- 1. Les chauffeurs peuvent créer des courses pour des clients non enregistrés
-- 2. Le driver_id est toujours requis et suffit pour identifier le propriétaire du devis
-- 3. Les courses peuvent avoir client_id ET company_id à null (réservations personnelles/guest)
