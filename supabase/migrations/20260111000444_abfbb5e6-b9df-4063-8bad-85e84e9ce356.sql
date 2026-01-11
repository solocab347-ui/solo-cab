-- CORRECTION CRITIQUE: Désactiver le trigger qui met automatiquement les courses en "accepted"
-- quand un devis est accepté. Cette logique est déjà gérée correctement par accept_devis_safely
-- qui différencie entre courses créées par le client (→ pending pour attente chauffeur)
-- et courses créées par le chauffeur (→ accepted directement)

-- Supprimer la fonction problématique
DROP FUNCTION IF EXISTS public.sync_course_status_on_devis_change() CASCADE;

-- Recréer une version corrigée qui NE MET PAS en "accepted" sur acceptation du devis
-- (car accept_devis_safely gère cette logique avec la distinction créateur)
CREATE OR REPLACE FUNCTION public.sync_course_status_on_devis_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- NE PAS mettre en "accepted" quand le devis est accepté !
  -- Cette logique est gérée par accept_devis_safely qui vérifie qui a créé la course
  
  -- Quand un devis est rejeté, annuler la course (si elle est en pending)
  IF NEW.status = 'rejected' AND (OLD.status IS NULL OR OLD.status != 'rejected') THEN
    UPDATE courses 
    SET status = 'cancelled', updated_at = NOW()
    WHERE id = NEW.course_id 
      AND status = 'pending';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recréer le trigger sur la table devis
DROP TRIGGER IF EXISTS sync_course_status_on_devis_change_trigger ON devis;

CREATE TRIGGER sync_course_status_on_devis_change_trigger
AFTER UPDATE ON devis
FOR EACH ROW
EXECUTE FUNCTION public.sync_course_status_on_devis_change();

-- Ajouter un commentaire explicatif
COMMENT ON FUNCTION public.sync_course_status_on_devis_change() IS 
'Synchronise le statut de la course quand un devis est rejeté (annule la course).
Note: L''acceptation de devis est gérée par accept_devis_safely qui différencie 
les courses créées par le client (→ pending pour attente chauffeur) 
des courses créées par le chauffeur (→ accepted directement).';