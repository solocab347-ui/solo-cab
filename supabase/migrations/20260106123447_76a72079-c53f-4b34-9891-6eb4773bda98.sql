-- Ajouter la policy UPDATE manquante pour que les entreprises puissent modifier leurs paiements
CREATE POLICY "Companies can update their payments"
ON public.company_payments
FOR UPDATE
USING (company_id IN (
  SELECT id FROM companies WHERE user_id = auth.uid()
))
WITH CHECK (company_id IN (
  SELECT id FROM companies WHERE user_id = auth.uid()
));

-- Ajouter aussi la policy INSERT pour les entreprises
CREATE POLICY "Companies can insert their payments"
ON public.company_payments
FOR INSERT
WITH CHECK (company_id IN (
  SELECT id FROM companies WHERE user_id = auth.uid()
));