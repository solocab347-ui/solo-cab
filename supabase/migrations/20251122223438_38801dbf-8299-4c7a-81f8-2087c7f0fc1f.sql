-- Create disputes/signalements table
CREATE TABLE public.disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  reported_by_user_id UUID NOT NULL,
  reported_against_user_id UUID NOT NULL,
  reporter_type TEXT NOT NULL CHECK (reporter_type IN ('driver', 'client')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved', 'potential_abuse')),
  reason TEXT NOT NULL,
  description TEXT NOT NULL,
  admin_notes TEXT,
  admin_id UUID REFERENCES public.profiles(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

-- Policies for disputes
CREATE POLICY "Users can create disputes for their own courses"
ON public.disputes
FOR INSERT
TO authenticated
WITH CHECK (
  reported_by_user_id = auth.uid()
);

CREATE POLICY "Users can view their own disputes"
ON public.disputes
FOR SELECT
TO authenticated
USING (
  reported_by_user_id = auth.uid() OR reported_against_user_id = auth.uid()
);

CREATE POLICY "Admins can manage all disputes"
ON public.disputes
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_disputes_updated_at
BEFORE UPDATE ON public.disputes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index for performance
CREATE INDEX idx_disputes_status ON public.disputes(status);
CREATE INDEX idx_disputes_course_id ON public.disputes(course_id);
CREATE INDEX idx_disputes_reported_by ON public.disputes(reported_by_user_id);