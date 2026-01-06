-- Permettre aux collaborateurs d'entreprise de voir les profils des chauffeurs partenaires
CREATE POLICY "Company employees can view driver profiles from agreements"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM company_driver_agreements cda
    JOIN drivers d ON d.id = cda.driver_id
    JOIN company_employees ce ON ce.company_id = cda.company_id
    WHERE d.user_id = profiles.id
    AND ce.user_id = auth.uid()
    AND ce.is_active = true
    AND cda.status = 'accepted'
  )
);