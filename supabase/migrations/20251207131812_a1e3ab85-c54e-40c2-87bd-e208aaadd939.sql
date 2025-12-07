-- 1. Fix drivers table public policy - remove sensitive data exposure
DROP POLICY IF EXISTS "Public can view limited driver profiles" ON public.drivers;

CREATE POLICY "Public can view limited driver profiles" 
ON public.drivers 
FOR SELECT 
USING (
  (public_profile_enabled = true) 
  AND (status = 'validated'::driver_status)
);

-- 2. Fix invitation_tokens policy - hide email addresses from public
DROP POLICY IF EXISTS "Anyone can view unused tokens" ON public.invitation_tokens;

CREATE POLICY "Anyone can view unused tokens for validation" 
ON public.invitation_tokens 
FOR SELECT 
USING (
  used = false 
  AND (
    -- Only allow viewing token existence, not email
    email IS NULL 
    OR auth.uid() IS NOT NULL
  )
);

-- 3. Create a secure function to validate tokens without exposing emails
CREATE OR REPLACE FUNCTION public.validate_invitation_token(token_value text)
RETURNS TABLE(
  id uuid,
  token text,
  skip_documents boolean,
  expires_at timestamp with time zone,
  used boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    it.id,
    it.token,
    it.skip_documents,
    it.expires_at,
    it.used
  FROM invitation_tokens it
  WHERE it.token = token_value
    AND it.used = false
    AND (it.expires_at IS NULL OR it.expires_at > now());
END;
$$;