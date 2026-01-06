-- Add permission for employees to invite drivers to company circle
ALTER TABLE public.company_employees 
ADD COLUMN IF NOT EXISTS can_invite_drivers boolean DEFAULT false;

-- Add same permission for employee invitations
ALTER TABLE public.company_employee_invitations 
ADD COLUMN IF NOT EXISTS can_invite_drivers boolean DEFAULT false;

-- Add logo_url to companies table if not exists
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS logo_url text;

COMMENT ON COLUMN public.company_employees.can_invite_drivers IS 'Permission to invite/propose drivers to join the company circle';
COMMENT ON COLUMN public.company_employee_invitations.can_invite_drivers IS 'Permission to invite/propose drivers - set during invitation creation';