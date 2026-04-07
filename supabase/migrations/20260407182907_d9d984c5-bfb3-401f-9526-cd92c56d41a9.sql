-- Fix 1: Remove public read access on company-documents bucket
DROP POLICY IF EXISTS "Public can view company documents" ON storage.objects;

-- Replace with scoped policy: company owners can view their own documents
CREATE POLICY "Company owners can view own documents"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'company-documents'
  AND auth.uid() IN (SELECT c.user_id FROM public.companies c WHERE c.id::text = (storage.foldername(name))[1])
);

-- Admins can view all company documents
CREATE POLICY "Admins can view all company documents"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'company-documents'
  AND public.has_role(auth.uid(), 'admin')
);

-- Fix 2: Remove public promotion code exposure
DROP POLICY IF EXISTS "Public can view active fleet promotions for validation" ON public.fleet_promotions;

-- Replace with authenticated-only policy
CREATE POLICY "Authenticated users can view active fleet promotions"
ON public.fleet_promotions FOR SELECT TO authenticated
USING (active = true);