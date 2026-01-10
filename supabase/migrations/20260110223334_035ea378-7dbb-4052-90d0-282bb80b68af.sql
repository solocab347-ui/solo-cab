-- 1. Ajouter la colonne peak_hours_surcharge_amount au devis
ALTER TABLE public.devis ADD COLUMN IF NOT EXISTS peak_hours_surcharge_amount NUMERIC DEFAULT 0;

-- 2. Créer un trigger pour synchroniser le statut de la course quand le devis est rejeté
CREATE OR REPLACE FUNCTION public.sync_course_status_on_devis_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Si le devis est rejeté, mettre la course en "cancelled"
  IF NEW.status = 'rejected' AND OLD.status != 'rejected' THEN
    UPDATE public.courses
    SET status = 'cancelled',
        updated_at = now()
    WHERE id = NEW.course_id
    AND status = 'pending'; -- Seulement si la course est en attente
    
    RAISE LOG 'Course % cancelled due to rejected devis %', NEW.course_id, NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Supprimer le trigger s'il existe déjà
DROP TRIGGER IF EXISTS trg_sync_course_status_on_devis_update ON public.devis;

-- Créer le trigger
CREATE TRIGGER trg_sync_course_status_on_devis_update
  AFTER UPDATE ON public.devis
  FOR EACH ROW
  WHEN (NEW.status IS DISTINCT FROM OLD.status)
  EXECUTE FUNCTION public.sync_course_status_on_devis_update();

-- 3. Corriger les courses déjà désynchronisées (devis rejeté mais course en pending)
UPDATE public.courses c
SET status = 'cancelled', updated_at = now()
WHERE c.status = 'pending'
AND EXISTS (
  SELECT 1 FROM public.devis d 
  WHERE d.course_id = c.id 
  AND d.status = 'rejected'
);

-- Ajouter un commentaire
COMMENT ON COLUMN public.devis.peak_hours_surcharge_amount IS 'Montant de la majoration heures de pointe';