-- Ajouter un champ pour tracker les relances sur les invitations
ALTER TABLE public.company_employee_course_invitations 
ADD COLUMN IF NOT EXISTS last_reminder_sent_at TIMESTAMP WITH TIME ZONE;

-- Créer une table pour historiser les relances de confirmation de paiement
CREATE TABLE IF NOT EXISTS public.payment_confirmation_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES public.company_employees(id) ON DELETE SET NULL,
  guest_name TEXT,
  guest_email TEXT,
  invitation_token TEXT,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  sent_by TEXT NOT NULL CHECK (sent_by IN ('driver', 'company', 'system')),
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_confirmation_reminders ENABLE ROW LEVEL SECURITY;

-- Policy: Les chauffeurs peuvent créer des relances pour leurs courses
CREATE POLICY "Drivers can create reminders for their courses"
ON public.payment_confirmation_reminders
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.courses c
    JOIN public.drivers d ON d.id = c.driver_id
    WHERE c.id = course_id
    AND d.user_id = auth.uid()
  )
);

-- Policy: Les admins entreprise peuvent créer des relances
CREATE POLICY "Company admins can create reminders"
ON public.payment_confirmation_reminders
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.company_administrators ca
    WHERE ca.company_id = payment_confirmation_reminders.company_id
    AND ca.user_id = auth.uid()
    AND ca.is_active = true
  )
);

-- Policy: Les chauffeurs peuvent voir leurs relances
CREATE POLICY "Drivers can view their reminders"
ON public.payment_confirmation_reminders
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.courses c
    JOIN public.drivers d ON d.id = c.driver_id
    WHERE c.id = course_id
    AND d.user_id = auth.uid()
  )
);

-- Policy: Les admins entreprise peuvent voir les relances de leur entreprise
CREATE POLICY "Company admins can view their reminders"
ON public.payment_confirmation_reminders
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.company_administrators ca
    WHERE ca.company_id = payment_confirmation_reminders.company_id
    AND ca.user_id = auth.uid()
    AND ca.is_active = true
  )
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_payment_reminders_course_id 
ON public.payment_confirmation_reminders(course_id);

CREATE INDEX IF NOT EXISTS idx_payment_reminders_sent_at 
ON public.payment_confirmation_reminders(sent_at DESC);