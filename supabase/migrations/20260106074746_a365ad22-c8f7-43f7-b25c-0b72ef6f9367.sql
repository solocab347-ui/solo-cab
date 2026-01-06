-- Make payment-documents bucket public for document sharing
UPDATE storage.buckets 
SET public = true 
WHERE id = 'payment-documents';