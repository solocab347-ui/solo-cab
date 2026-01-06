-- Add payment declaration fields for company courses
-- company_payment_status: 'pending' (default), 'paid_on_spot', 'company_will_pay'
-- employee_declared_paid_at: when the employee/collaborator declared they paid
-- driver_declared_paid_at: when the driver declared payment received

ALTER TABLE public.courses 
ADD COLUMN IF NOT EXISTS company_payment_status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS employee_declared_paid_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS driver_declared_payment_received boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS driver_declared_payment_at timestamp with time zone;

-- Add company_payment_status to company_courses for tracking who pays
ALTER TABLE public.company_courses 
ADD COLUMN IF NOT EXISTS actual_payment_method text, -- 'company_deferred', 'employee_paid_spot', 'employee_expense'
ADD COLUMN IF NOT EXISTS payment_declared_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS payment_declared_by text; -- 'driver', 'employee', 'company'

-- Add a comment explaining the payment flow
COMMENT ON COLUMN public.courses.company_payment_status IS 'For company courses: pending, paid_on_spot, company_will_pay';
COMMENT ON COLUMN public.courses.driver_declared_payment_received IS 'True if driver declared payment was received on spot';
COMMENT ON COLUMN public.company_courses.actual_payment_method IS 'company_deferred, employee_paid_spot, employee_expense';