-- Table principale pour les feedbacks (bugs et améliorations)
CREATE TABLE public.user_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_type TEXT NOT NULL CHECK (user_type IN ('driver', 'pioneer_driver', 'client', 'fleet_manager', 'company', 'company_employee', 'admin')),
  user_name TEXT,
  user_email TEXT,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('bug', 'improvement')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('urgent', 'medium', 'low')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved', 'rejected', 'archived')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  page_url TEXT,
  browser_info TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES auth.users(id)
);

-- Table pour les pièces jointes (captures d'écran)
CREATE TABLE public.user_feedback_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  feedback_id UUID NOT NULL REFERENCES public.user_feedback(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table pour les réponses admin
CREATE TABLE public.user_feedback_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  feedback_id UUID NOT NULL REFERENCES public.user_feedback(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL REFERENCES auth.users(id),
  admin_name TEXT,
  message TEXT NOT NULL,
  is_template BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table pour les messages pré-remplis
CREATE TABLE public.feedback_response_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('thanks', 'in_progress', 'resolved', 'need_info', 'rejected')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes pour performance
CREATE INDEX idx_user_feedback_user_id ON public.user_feedback(user_id);
CREATE INDEX idx_user_feedback_type ON public.user_feedback(feedback_type);
CREATE INDEX idx_user_feedback_priority ON public.user_feedback(priority);
CREATE INDEX idx_user_feedback_status ON public.user_feedback(status);
CREATE INDEX idx_user_feedback_created_at ON public.user_feedback(created_at DESC);
CREATE INDEX idx_user_feedback_attachments_feedback_id ON public.user_feedback_attachments(feedback_id);
CREATE INDEX idx_user_feedback_responses_feedback_id ON public.user_feedback_responses(feedback_id);

-- RLS
ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_feedback_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_feedback_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_response_templates ENABLE ROW LEVEL SECURITY;

-- Policies pour user_feedback
CREATE POLICY "Users can view their own feedback"
ON public.user_feedback FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create feedback"
ON public.user_feedback FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pending feedback"
ON public.user_feedback FOR UPDATE
USING (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Admins can view all feedback"
ON public.user_feedback FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND 'admin' = ANY(roles))
);

CREATE POLICY "Admins can update all feedback"
ON public.user_feedback FOR UPDATE
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND 'admin' = ANY(roles))
);

-- Policies pour attachments
CREATE POLICY "Users can view attachments of their feedback"
ON public.user_feedback_attachments FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.user_feedback WHERE id = feedback_id AND user_id = auth.uid())
);

CREATE POLICY "Users can add attachments to their feedback"
ON public.user_feedback_attachments FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_feedback WHERE id = feedback_id AND user_id = auth.uid())
);

CREATE POLICY "Admins can view all attachments"
ON public.user_feedback_attachments FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND 'admin' = ANY(roles))
);

-- Policies pour responses
CREATE POLICY "Users can view responses to their feedback"
ON public.user_feedback_responses FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.user_feedback WHERE id = feedback_id AND user_id = auth.uid())
);

CREATE POLICY "Admins can view all responses"
ON public.user_feedback_responses FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND 'admin' = ANY(roles))
);

CREATE POLICY "Admins can create responses"
ON public.user_feedback_responses FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND 'admin' = ANY(roles))
);

-- Policies pour templates
CREATE POLICY "Admins can manage templates"
ON public.feedback_response_templates FOR ALL
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND 'admin' = ANY(roles))
);

-- Trigger pour updated_at
CREATE TRIGGER update_user_feedback_updated_at
BEFORE UPDATE ON public.user_feedback
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket pour les captures d'écran
INSERT INTO storage.buckets (id, name, public)
VALUES ('feedback-attachments', 'feedback-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Authenticated users can upload feedback attachments"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'feedback-attachments' AND auth.role() = 'authenticated');

CREATE POLICY "Anyone can view feedback attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'feedback-attachments');

CREATE POLICY "Admins can delete feedback attachments"
ON storage.objects FOR DELETE
USING (bucket_id = 'feedback-attachments' AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND 'admin' = ANY(roles)));

-- Messages pré-remplis par défaut
INSERT INTO public.feedback_response_templates (title, message, category) VALUES
('Remerciement standard', 'Merci beaucoup pour votre retour ! Nous apprécions le temps que vous avez pris pour nous aider à améliorer SoloCab. Votre contribution est précieuse pour nous.', 'thanks'),
('Remerciement bug', 'Merci d''avoir signalé ce bug ! Nos équipes techniques vont analyser le problème et travailler à sa résolution. Nous vous tiendrons informé de l''avancement.', 'thanks'),
('Prise en charge', 'Votre demande a bien été prise en compte et est maintenant en cours de traitement par notre équipe. Nous reviendrons vers vous dès que possible.', 'in_progress'),
('Bug en cours de correction', 'Nous avons identifié le problème que vous avez signalé et nos développeurs travaillent activement à sa correction. Une mise à jour sera déployée prochainement.', 'in_progress'),
('Résolu', 'Bonne nouvelle ! Le problème que vous avez signalé a été résolu. N''hésitez pas à nous contacter si vous rencontrez d''autres difficultés.', 'resolved'),
('Amélioration déployée', 'L''amélioration que vous avez suggérée a été implémentée ! Merci pour cette excellente idée qui contribue à rendre SoloCab meilleur pour tous.', 'resolved'),
('Besoin d''informations', 'Merci pour votre retour. Pour mieux comprendre le problème, pourriez-vous nous fournir plus de détails ou des captures d''écran supplémentaires ?', 'need_info'),
('Non reproductible', 'Nous avons essayé de reproduire le problème signalé mais sans succès. Pourriez-vous nous fournir plus d''informations sur les circonstances exactes ?', 'need_info'),
('Rejeté - Duplicata', 'Ce problème a déjà été signalé par un autre utilisateur et est en cours de traitement. Merci tout de même pour votre vigilance !', 'rejected'),
('Rejeté - Comportement normal', 'Après analyse, le comportement que vous décrivez correspond au fonctionnement normal de la plateforme. N''hésitez pas à nous contacter si vous avez d''autres questions.', 'rejected');