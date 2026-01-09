-- Ajouter les colonnes pour la priorité du dispatching interne vs externe
ALTER TABLE public.fleet_managers 
ADD COLUMN IF NOT EXISTS dispatch_driver_priority TEXT DEFAULT 'internal_first' CHECK (dispatch_driver_priority IN ('internal_first', 'external_first', 'balanced'));

-- Ajouter une colonne pour le mode de notification aux chauffeurs
ALTER TABLE public.fleet_managers 
ADD COLUMN IF NOT EXISTS dispatch_notification_mode TEXT DEFAULT 'sequential' CHECK (dispatch_notification_mode IN ('sequential', 'broadcast'));

-- Ajouter timeout pour la réponse des chauffeurs (en minutes)
ALTER TABLE public.fleet_managers 
ADD COLUMN IF NOT EXISTS dispatch_timeout_minutes INTEGER DEFAULT 5;

-- Table pour les missions de dispatch en attente
CREATE TABLE IF NOT EXISTS public.fleet_dispatch_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fleet_manager_id UUID NOT NULL REFERENCES public.fleet_managers(id) ON DELETE CASCADE,
  course_request_id UUID REFERENCES public.fleet_manager_course_requests(id) ON DELETE CASCADE,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  
  -- Infos de la course
  pickup_address TEXT NOT NULL,
  destination_address TEXT NOT NULL,
  scheduled_date TIMESTAMPTZ NOT NULL,
  passengers_count INTEGER DEFAULT 1,
  notes TEXT,
  
  -- État du dispatch
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'dispatching', 'assigned', 'expired', 'cancelled', 'manual')),
  dispatch_mode TEXT DEFAULT 'automatic' CHECK (dispatch_mode IN ('automatic', 'manual')),
  
  -- Tracking du dispatch
  current_driver_id UUID REFERENCES public.drivers(id),
  notified_driver_ids UUID[] DEFAULT '{}',
  declined_driver_ids UUID[] DEFAULT '{}',
  timeout_at TIMESTAMPTZ,
  
  -- Résultat
  assigned_driver_id UUID REFERENCES public.drivers(id),
  assigned_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_dispatch_queue_fleet ON public.fleet_dispatch_queue(fleet_manager_id);
CREATE INDEX IF NOT EXISTS idx_dispatch_queue_status ON public.fleet_dispatch_queue(status);
CREATE INDEX IF NOT EXISTS idx_dispatch_queue_driver ON public.fleet_dispatch_queue(current_driver_id);

-- Table pour les réponses des chauffeurs aux demandes de dispatch
CREATE TABLE IF NOT EXISTS public.fleet_dispatch_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispatch_id UUID NOT NULL REFERENCES public.fleet_dispatch_queue(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  response TEXT CHECK (response IN ('accepted', 'declined', 'timeout')),
  decline_reason TEXT,
  responded_at TIMESTAMPTZ DEFAULT now(),
  notified_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_dispatch_responses_dispatch ON public.fleet_dispatch_responses(dispatch_id);
CREATE INDEX IF NOT EXISTS idx_dispatch_responses_driver ON public.fleet_dispatch_responses(driver_id);

-- Activer realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.fleet_dispatch_queue;
ALTER PUBLICATION supabase_realtime ADD TABLE public.fleet_dispatch_responses;

-- RLS pour fleet_dispatch_queue
ALTER TABLE public.fleet_dispatch_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Fleet managers can manage their dispatch queue"
ON public.fleet_dispatch_queue
FOR ALL
USING (
  fleet_manager_id IN (
    SELECT id FROM public.fleet_managers WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Drivers can view dispatch requests for them"
ON public.fleet_dispatch_queue
FOR SELECT
USING (
  current_driver_id IN (
    SELECT id FROM public.drivers WHERE user_id = auth.uid()
  )
  OR assigned_driver_id IN (
    SELECT id FROM public.drivers WHERE user_id = auth.uid()
  )
);

-- RLS pour fleet_dispatch_responses
ALTER TABLE public.fleet_dispatch_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Fleet managers can view responses for their dispatches"
ON public.fleet_dispatch_responses
FOR SELECT
USING (
  dispatch_id IN (
    SELECT id FROM public.fleet_dispatch_queue 
    WHERE fleet_manager_id IN (
      SELECT id FROM public.fleet_managers WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Drivers can manage their responses"
ON public.fleet_dispatch_responses
FOR ALL
USING (
  driver_id IN (
    SELECT id FROM public.drivers WHERE user_id = auth.uid()
  )
);