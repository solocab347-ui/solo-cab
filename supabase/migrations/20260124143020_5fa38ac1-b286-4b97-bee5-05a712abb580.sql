-- Table pour stocker les objectifs personnalisés des chauffeurs
CREATE TABLE public.driver_objectives (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  period_type TEXT NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly', 'yearly')),
  revenue_target NUMERIC(10,2) DEFAULT 0,
  courses_target INTEGER DEFAULT 0,
  new_clients_target INTEGER DEFAULT 0,
  hours_target NUMERIC(5,2) DEFAULT 0,
  km_target NUMERIC(10,2) DEFAULT 0,
  rating_target NUMERIC(2,1) DEFAULT 4.5,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(driver_id, period_type)
);

-- Table pour les plateformes personnalisées du chauffeur
CREATE TABLE public.driver_platforms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  platform_name TEXT NOT NULL,
  platform_icon TEXT DEFAULT 'car',
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(driver_id, platform_name)
);

-- Table pour les entrées quotidiennes (SoloCab auto + externes manuelles)
CREATE TABLE public.driver_daily_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  platform_id UUID REFERENCES public.driver_platforms(id) ON DELETE CASCADE,
  is_solocab BOOLEAN DEFAULT false,
  revenue NUMERIC(10,2) DEFAULT 0,
  courses_count INTEGER DEFAULT 0,
  new_clients_count INTEGER DEFAULT 0,
  hours_worked NUMERIC(5,2) DEFAULT 0,
  km_driven NUMERIC(10,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(driver_id, entry_date, platform_id, is_solocab)
);

-- Table pour les conseils et alertes de l'assistant
CREATE TABLE public.driver_coaching_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  message_type TEXT NOT NULL CHECK (message_type IN ('suggestion', 'alert', 'motivation', 'tip', 'milestone')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  related_kpi TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table pour le planning horaire optimal
CREATE TABLE public.driver_work_schedule (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME,
  end_time TIME,
  is_working_day BOOLEAN DEFAULT true,
  target_hours NUMERIC(4,2) DEFAULT 8,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(driver_id, day_of_week)
);

-- Enable RLS
ALTER TABLE public.driver_objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_daily_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_coaching_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_work_schedule ENABLE ROW LEVEL SECURITY;

-- RLS Policies for driver_objectives
CREATE POLICY "Drivers can view their own objectives" 
ON public.driver_objectives FOR SELECT 
USING (driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid()));

CREATE POLICY "Drivers can create their own objectives" 
ON public.driver_objectives FOR INSERT 
WITH CHECK (driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid()));

CREATE POLICY "Drivers can update their own objectives" 
ON public.driver_objectives FOR UPDATE 
USING (driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid()));

CREATE POLICY "Drivers can delete their own objectives" 
ON public.driver_objectives FOR DELETE 
USING (driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid()));

-- RLS Policies for driver_platforms
CREATE POLICY "Drivers can view their own platforms" 
ON public.driver_platforms FOR SELECT 
USING (driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid()));

CREATE POLICY "Drivers can create their own platforms" 
ON public.driver_platforms FOR INSERT 
WITH CHECK (driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid()));

CREATE POLICY "Drivers can update their own platforms" 
ON public.driver_platforms FOR UPDATE 
USING (driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid()));

CREATE POLICY "Drivers can delete their own platforms" 
ON public.driver_platforms FOR DELETE 
USING (driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid()));

-- RLS Policies for driver_daily_entries
CREATE POLICY "Drivers can view their own entries" 
ON public.driver_daily_entries FOR SELECT 
USING (driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid()));

CREATE POLICY "Drivers can create their own entries" 
ON public.driver_daily_entries FOR INSERT 
WITH CHECK (driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid()));

CREATE POLICY "Drivers can update their own entries" 
ON public.driver_daily_entries FOR UPDATE 
USING (driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid()));

CREATE POLICY "Drivers can delete their own entries" 
ON public.driver_daily_entries FOR DELETE 
USING (driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid()));

-- RLS Policies for driver_coaching_messages
CREATE POLICY "Drivers can view their own messages" 
ON public.driver_coaching_messages FOR SELECT 
USING (driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid()));

CREATE POLICY "Drivers can update their own messages" 
ON public.driver_coaching_messages FOR UPDATE 
USING (driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid()));

-- RLS Policies for driver_work_schedule
CREATE POLICY "Drivers can view their own schedule" 
ON public.driver_work_schedule FOR SELECT 
USING (driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid()));

CREATE POLICY "Drivers can create their own schedule" 
ON public.driver_work_schedule FOR INSERT 
WITH CHECK (driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid()));

CREATE POLICY "Drivers can update their own schedule" 
ON public.driver_work_schedule FOR UPDATE 
USING (driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid()));

CREATE POLICY "Drivers can delete their own schedule" 
ON public.driver_work_schedule FOR DELETE 
USING (driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_driver_objectives_updated_at
BEFORE UPDATE ON public.driver_objectives
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_driver_daily_entries_updated_at
BEFORE UPDATE ON public.driver_daily_entries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_driver_work_schedule_updated_at
BEFORE UPDATE ON public.driver_work_schedule
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes for performance
CREATE INDEX idx_driver_objectives_driver_id ON public.driver_objectives(driver_id);
CREATE INDEX idx_driver_platforms_driver_id ON public.driver_platforms(driver_id);
CREATE INDEX idx_driver_daily_entries_driver_date ON public.driver_daily_entries(driver_id, entry_date);
CREATE INDEX idx_driver_coaching_messages_driver_id ON public.driver_coaching_messages(driver_id, created_at DESC);
CREATE INDEX idx_driver_work_schedule_driver_id ON public.driver_work_schedule(driver_id);