import { supabase } from "@/integrations/supabase/client";

/**
 * Extract clean storage file path from any URL format (signed, public, or raw path).
 * Strips query params, /storage/v1/object/(sign|public)/bucket-name/ prefixes.
 */
export const extractCleanPath = (rawUrl: string): string => {
  if (!rawUrl) return rawUrl;

  // Strip query parameters (e.g., ?token=...)
  let path = rawUrl.split('?')[0];

  // Handle full Supabase storage URLs
  if (path.includes('/storage/v1/object/')) {
    const parts = path.split('/storage/v1/object/');
    if (parts[1]) {
      // Remove sign/ or public/ prefix
      path = parts[1].replace(/^(sign|public)\//, '');
      // Remove bucket name (first path segment)
      path = path.replace(/^[^/]+\//, '');
    }
  }

  return path;
};

/**
 * Generate a fresh signed URL for a document stored in driver-documents bucket.
 * Accepts any format: clean path, signed URL, or public URL.
 */
export const generateFreshSignedUrl = async (
  rawUrl: string,
  bucket: string = 'driver-documents',
  expiresIn: number = 3600
): Promise<string | null> => {
  const filePath = extractCleanPath(rawUrl);
  if (!filePath) return null;

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(filePath, expiresIn);

  if (error) {
    console.error('Error generating signed URL:', error, 'path:', filePath);
    return null;
  }

  return data?.signedUrl || null;
};

/**
 * Extract the best available path from a document data object.
 * Prefers storagePath (clean), falls back to url.
 */
export const extractDocumentPath = (docData: any): string | null => {
  if (!docData) return null;

  if (typeof docData === 'object') {
    // Prefer storagePath (clean file path)
    if (docData.storagePath) return docData.storagePath;
    if (docData.url) return docData.url;
  }

  if (typeof docData === 'string') return docData;

  return null;
};
