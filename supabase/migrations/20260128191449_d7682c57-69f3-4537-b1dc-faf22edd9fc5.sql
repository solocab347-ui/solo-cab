-- Table pour suivre les suppressions d'utilisateurs planifiées
CREATE TABLE public.scheduled_user_deletions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID REFERENCES public.drivers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  scheduled_by UUID REFERENCES public.profiles(id),
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  deletion_date TIMESTAMP WITH TIME ZONE NOT NULL,
  deletion_type TEXT NOT NULL CHECK (deletion_type IN ('immediate', '3_days', '1_week', '1_month')),
  reason_type TEXT NOT NULL CHECK (reason_type IN ('inactivity', 'violation', 'fraud', 'request', 'duplicate', 'other')),
  reason_custom TEXT,
  stripe_subscription_cancelled BOOLEAN DEFAULT false,
  email_notification_sent BOOLEAN DEFAULT false,
  email_sent_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'notified', 'cancelled', 'completed')),
  cancelled_at TIMESTAMP WITH TIME ZONE,
  cancelled_by UUID REFERENCES public.profiles(id),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index pour les recherches
CREATE INDEX idx_scheduled_deletions_status ON public.scheduled_user_deletions(status);
CREATE INDEX idx_scheduled_deletions_date ON public.scheduled_user_deletions(deletion_date);
CREATE INDEX idx_scheduled_deletions_driver ON public.scheduled_user_deletions(driver_id);

-- RLS
ALTER TABLE public.scheduled_user_deletions ENABLE ROW LEVEL SECURITY;

-- Seuls les admins peuvent voir et gérer les suppressions
CREATE POLICY "Admins can view scheduled deletions"
  ON public.scheduled_user_deletions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert scheduled deletions"
  ON public.scheduled_user_deletions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update scheduled deletions"
  ON public.scheduled_user_deletions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete scheduled deletions"
  ON public.scheduled_user_deletions
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'admin'
    )
  );

-- Trigger pour updated_at
CREATE TRIGGER update_scheduled_deletions_updated_at
  BEFORE UPDATE ON public.scheduled_user_deletions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();