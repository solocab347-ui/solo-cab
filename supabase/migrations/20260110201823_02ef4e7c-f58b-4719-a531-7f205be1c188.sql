-- Index sans CONCURRENTLY pour éviter l'erreur de transaction
CREATE INDEX IF NOT EXISTS idx_drivers_sharing_visibility 
  ON public.drivers (sharing_available, visible_to_drivers, status)
  WHERE sharing_available = true AND visible_to_drivers = true AND status = 'validated';