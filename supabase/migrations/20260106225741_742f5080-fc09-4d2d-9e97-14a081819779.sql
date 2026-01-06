-- Add reimbursement method and related fields to expense_reports
ALTER TABLE public.expense_reports
ADD COLUMN IF NOT EXISTS reimbursement_method TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS reimbursement_month TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS reimbursement_notes TEXT DEFAULT NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.expense_reports.reimbursement_method IS 'direct_payment or payroll';
COMMENT ON COLUMN public.expense_reports.reimbursement_month IS 'YYYY-MM format for payroll reimbursement';