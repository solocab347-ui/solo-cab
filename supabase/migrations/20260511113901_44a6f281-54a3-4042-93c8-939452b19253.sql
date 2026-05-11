CREATE INDEX IF NOT EXISTS idx_clients_driver_id ON public.clients(driver_id);
CREATE INDEX IF NOT EXISTS idx_clients_driver_ids_gin ON public.clients USING GIN(driver_ids);