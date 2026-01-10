-- Supprimer la CONTRAINTE (pas l'index) d'abord
ALTER TABLE public.courses DROP CONSTRAINT IF EXISTS courses_driver_course_number_unique;

-- Supprimer l'index s'il existe encore
DROP INDEX IF EXISTS courses_driver_course_number_unique;

-- Créer une nouvelle contrainte unique PARTIELLE qui exclut les courses annulées
-- Cela permet de réassigner une course avec le même numéro à un autre chauffeur
CREATE UNIQUE INDEX courses_driver_course_number_unique 
ON public.courses (driver_id, course_number)
WHERE status != 'cancelled';

-- Ajouter un commentaire explicatif
COMMENT ON INDEX courses_driver_course_number_unique IS 
'Contrainte unique sur driver_id + course_number SAUF pour les courses annulées. 
Permet aux courses partagées d''être réassignées même si le chauffeur avait une ancienne course annulée avec ce numéro.';