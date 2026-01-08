-- Table pour les documents véhicules (assurance + carte grise par véhicule)
CREATE TABLE IF NOT EXISTS public.driver_vehicle_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES public.driver_vehicles(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('insurance', 'registration_card')),
  document_url TEXT,
  document_name TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'validated', 'rejected')),
  rejection_reason TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE,
  validated_at TIMESTAMP WITH TIME ZONE,
  validated_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(vehicle_id, document_type)
);

-- Table pour les relances de documents
CREATE TABLE IF NOT EXISTS public.document_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  vehicle_id UUID REFERENCES public.driver_vehicles(id) ON DELETE CASCADE,
  reminder_message TEXT,
  sent_by UUID REFERENCES public.profiles(id),
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Ajouter catégorie pour les notifications admin
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS category TEXT;

-- Enable RLS
ALTER TABLE public.driver_vehicle_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_reminders ENABLE ROW LEVEL SECURITY;

-- RLS for driver_vehicle_documents
CREATE POLICY "Drivers can view their own vehicle documents"
  ON public.driver_vehicle_documents
  FOR SELECT
  USING (driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid()));

CREATE POLICY "Drivers can manage their own vehicle documents"
  ON public.driver_vehicle_documents
  FOR ALL
  USING (driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage all vehicle documents"
  ON public.driver_vehicle_documents
  FOR ALL
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- RLS for document_reminders
CREATE POLICY "Drivers can view reminders sent to them"
  ON public.document_reminders
  FOR SELECT
  USING (driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid()));

CREATE POLICY "Drivers can update reminders read status"
  ON public.document_reminders
  FOR UPDATE
  USING (driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage all reminders"
  ON public.document_reminders
  FOR ALL
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_vehicle_documents_driver ON public.driver_vehicle_documents(driver_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_documents_vehicle ON public.driver_vehicle_documents(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_document_reminders_driver ON public.document_reminders(driver_id);
CREATE INDEX IF NOT EXISTS idx_notifications_category ON public.notifications(category);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.document_reminders;