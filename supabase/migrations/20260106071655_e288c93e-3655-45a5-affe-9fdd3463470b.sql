-- Ajouter une politique pour permettre aux chauffeurs d'insérer des paiements
CREATE POLICY "Drivers can insert their payments"
ON public.company_payments
FOR INSERT
WITH CHECK (driver_id = get_driver_id(auth.uid()));

-- Ajouter une politique pour permettre aux chauffeurs de mettre à jour leurs paiements
CREATE POLICY "Drivers can update their payments"
ON public.company_payments
FOR UPDATE
USING (driver_id = get_driver_id(auth.uid()));