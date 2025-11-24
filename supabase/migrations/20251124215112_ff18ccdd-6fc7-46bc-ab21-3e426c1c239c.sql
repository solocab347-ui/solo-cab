-- Ajouter le champ payment_method_preference à la table courses
ALTER TABLE public.courses 
ADD COLUMN IF NOT EXISTS payment_method_preference TEXT;

COMMENT ON COLUMN public.courses.payment_method_preference IS 'Moyen de paiement préféré du client: carte, espece, virement';
