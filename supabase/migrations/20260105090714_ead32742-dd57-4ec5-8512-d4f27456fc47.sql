-- Permettre aux entreprises de voir les profils des chauffeurs avec qui elles ont un accord
CREATE POLICY "Companies can view driver profiles from agreements" 
ON public.profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM company_driver_agreements cda
    JOIN drivers d ON d.id = cda.driver_id
    JOIN companies c ON c.id = cda.company_id
    WHERE d.user_id = profiles.id
    AND c.user_id = auth.uid()
  )
);