-- Add reminder tracking to expense_reports
ALTER TABLE public.expense_reports
ADD COLUMN IF NOT EXISTS last_reminder_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS reminder_count INTEGER DEFAULT 0;

-- Create table for expense report reminders
CREATE TABLE IF NOT EXISTS public.expense_report_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  expense_report_id UUID NOT NULL REFERENCES public.expense_reports(id) ON DELETE CASCADE,
  sent_by_user_id UUID NOT NULL,
  message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  read_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  read_by_user_id UUID DEFAULT NULL
);

-- Enable RLS
ALTER TABLE public.expense_report_reminders ENABLE ROW LEVEL SECURITY;

-- Employees can view reminders they sent
CREATE POLICY "Employees can view their sent reminders"
ON public.expense_report_reminders
FOR SELECT
TO authenticated
USING (
  sent_by_user_id = auth.uid()
  OR 
  expense_report_id IN (
    SELECT er.id FROM expense_reports er
    JOIN companies c ON c.id = er.company_id
    WHERE c.user_id = auth.uid()
  )
  OR
  expense_report_id IN (
    SELECT er.id FROM expense_reports er
    JOIN company_administrators ca ON ca.company_id = er.company_id
    WHERE ca.user_id = auth.uid() AND ca.is_active = true
  )
);

-- Employees can insert reminders for their own expense reports
CREATE POLICY "Employees can create reminders for their expenses"
ON public.expense_report_reminders
FOR INSERT
TO authenticated
WITH CHECK (
  sent_by_user_id = auth.uid()
  AND expense_report_id IN (
    SELECT er.id FROM expense_reports er
    JOIN company_employees ce ON ce.id = er.employee_id
    WHERE ce.user_id = auth.uid()
  )
);

-- Company admins can update reminders (mark as read)
CREATE POLICY "Company admins can update reminders"
ON public.expense_report_reminders
FOR UPDATE
TO authenticated
USING (
  expense_report_id IN (
    SELECT er.id FROM expense_reports er
    JOIN companies c ON c.id = er.company_id
    WHERE c.user_id = auth.uid()
  )
  OR
  expense_report_id IN (
    SELECT er.id FROM expense_reports er
    JOIN company_administrators ca ON ca.company_id = er.company_id
    WHERE ca.user_id = auth.uid() AND ca.is_active = true
  )
);