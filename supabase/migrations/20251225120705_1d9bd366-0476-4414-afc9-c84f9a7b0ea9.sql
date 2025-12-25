-- Permettre l'accès public à la vitrine des gestionnaires de flotte
CREATE POLICY "Anyone can view public fleet profiles"
ON public.fleet_managers FOR SELECT
USING (show_drivers_in_public_storefront = true);