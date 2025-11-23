-- Table pour stocker les retours chauffeurs (améliorations et bugs)
CREATE TABLE public.driver_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('improvement', 'bug')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_review', 'resolved', 'rejected')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  ai_analysis TEXT,
  ai_suggestion TEXT,
  admin_response TEXT,
  admin_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Index pour améliorer les performances
CREATE INDEX idx_driver_feedback_driver_id ON public.driver_feedback(driver_id);
CREATE INDEX idx_driver_feedback_type ON public.driver_feedback(type);
CREATE INDEX idx_driver_feedback_status ON public.driver_feedback(status);
CREATE INDEX idx_driver_feedback_created_at ON public.driver_feedback(created_at DESC);

-- Trigger pour mettre à jour updated_at
CREATE TRIGGER update_driver_feedback_updated_at
  BEFORE UPDATE ON public.driver_feedback
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies
ALTER TABLE public.driver_feedback ENABLE ROW LEVEL SECURITY;

-- Les chauffeurs peuvent créer leurs propres feedbacks
CREATE POLICY "Drivers can create their own feedback"
  ON public.driver_feedback
  FOR INSERT
  WITH CHECK (
    driver_id IN (
      SELECT id FROM public.drivers WHERE user_id = auth.uid()
    )
  );

-- Les chauffeurs peuvent voir leurs propres feedbacks
CREATE POLICY "Drivers can view their own feedback"
  ON public.driver_feedback
  FOR SELECT
  USING (
    driver_id IN (
      SELECT id FROM public.drivers WHERE user_id = auth.uid()
    )
  );

-- Les chauffeurs peuvent modifier leurs feedbacks non résolus
CREATE POLICY "Drivers can update their own pending feedback"
  ON public.driver_feedback
  FOR UPDATE
  USING (
    driver_id IN (
      SELECT id FROM public.drivers WHERE user_id = auth.uid()
    )
    AND status = 'pending'
  );

-- Les admins peuvent tout voir
CREATE POLICY "Admins can view all feedback"
  ON public.driver_feedback
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- Les admins peuvent tout modifier
CREATE POLICY "Admins can update all feedback"
  ON public.driver_feedback
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

-- Les admins peuvent supprimer
CREATE POLICY "Admins can delete feedback"
  ON public.driver_feedback
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'));