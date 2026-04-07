-- Fix 1: Remove the overly permissive INSERT policy that allows any role self-assignment
DROP POLICY IF EXISTS "Users can create own roles" ON public.user_roles;

-- Fix 2: Replace overly broad payment-documents storage policy with scoped one
DROP POLICY IF EXISTS "Partners can view payment documents" ON storage.objects;

-- Scoped policy: drivers can only view payment docs in their own folder
CREATE POLICY "Drivers can view own payment documents"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'payment-documents'
  AND auth.uid() IN (SELECT d.user_id FROM drivers d WHERE d.id::text = (storage.foldername(name))[1])
);

-- Scoped policy: companies can only view payment docs in their own folder
CREATE POLICY "Companies can view own payment documents"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'payment-documents'
  AND auth.uid() IN (SELECT c.user_id FROM companies c WHERE c.id::text = (storage.foldername(name))[1])
);

-- Fix 3: Also scope the company DELETE policy
DROP POLICY IF EXISTS "Companies can delete their payment documents" ON storage.objects;

CREATE POLICY "Companies can delete own payment documents"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'payment-documents'
  AND auth.uid() IN (SELECT c.user_id FROM companies c WHERE c.id::text = (storage.foldername(name))[1])
);