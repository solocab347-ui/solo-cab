-- Add skip_documents field to invitation_tokens table
ALTER TABLE public.invitation_tokens 
ADD COLUMN skip_documents boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.invitation_tokens.skip_documents IS 'Si true, le chauffeur peut s''inscrire sans fournir de documents';