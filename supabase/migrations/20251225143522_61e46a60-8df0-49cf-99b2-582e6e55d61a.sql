-- Create fleet client invitations table
CREATE TABLE public.fleet_client_invitations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fleet_manager_id uuid NOT NULL REFERENCES public.fleet_managers(id) ON DELETE CASCADE,
  client_name text NOT NULL,
  email text,
  phone text,
  token text NOT NULL DEFAULT encode(extensions.gen_random_bytes(32), 'hex'),
  status text NOT NULL DEFAULT 'pending',
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone DEFAULT (now() + interval '30 days'),
  used_at timestamp with time zone,
  used_by_user_id uuid REFERENCES auth.users(id),
  client_id uuid REFERENCES public.clients(id),
  CONSTRAINT unique_fleet_client_token UNIQUE (token)
);

-- Enable RLS
ALTER TABLE public.fleet_client_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Fleet managers can manage their client invitations"
ON public.fleet_client_invitations
FOR ALL
USING (
  fleet_manager_id IN (
    SELECT id FROM fleet_managers WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  fleet_manager_id IN (
    SELECT id FROM fleet_managers WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all fleet client invitations"
ON public.fleet_client_invitations
FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Public can view valid invitations by token"
ON public.fleet_client_invitations
FOR SELECT
USING (status = 'pending' AND expires_at > now());

-- Create index for faster token lookups
CREATE INDEX idx_fleet_client_invitations_token ON public.fleet_client_invitations(token);
CREATE INDEX idx_fleet_client_invitations_fleet_manager ON public.fleet_client_invitations(fleet_manager_id);