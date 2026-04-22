-- Add support for partial data deletion requests
ALTER TABLE public.account_deletion_requests
  ADD COLUMN IF NOT EXISTS request_type TEXT NOT NULL DEFAULT 'full',
  ADD COLUMN IF NOT EXISTS data_categories TEXT[] DEFAULT NULL;

-- Add a check constraint for request_type values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'account_deletion_requests_request_type_check'
  ) THEN
    ALTER TABLE public.account_deletion_requests
      ADD CONSTRAINT account_deletion_requests_request_type_check
      CHECK (request_type IN ('full', 'partial'));
  END IF;
END $$;

-- Index for filtering by request type
CREATE INDEX IF NOT EXISTS idx_account_deletion_requests_request_type
  ON public.account_deletion_requests(request_type);

COMMENT ON COLUMN public.account_deletion_requests.request_type IS 
  'Type de demande: full = suppression complète du compte, partial = suppression sélective de données';
COMMENT ON COLUMN public.account_deletion_requests.data_categories IS 
  'Catégories de données à supprimer pour les demandes partielles: courses, addresses, payments, messages, notifications, ratings, sessions';