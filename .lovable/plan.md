
# Fix: Document Viewing & Download (Expired Signed URLs)

## Problem

The screenshots show the exact error: `{"statusCode":"400","error":"InvalidJWT","message":"\"exp\" claim timestamp check failed"}`. When viewing or downloading documents, the signed URLs have expired.

**Root cause:** Documents are stored in the database with signed URLs (which expire after 1h) instead of just the storage file path. When the admin or driver later tries to view the document, the stored URL is already expired. The `DocumentViewer` tries to re-generate signed URLs but the path extraction from expired signed URLs is fragile and can fail.

Additionally, the `extractDocumentUrl` function returns the `url` field (expired signed URL) but ignores the `storagePath` field which contains the clean file path needed to generate a fresh signed URL.

## Solution

### 1. Fix `extractDocumentUrl` to prefer `storagePath` over `url`

In `src/components/admin/DocumentViewer.tsx`, update the helper to return the `storagePath` when available (clean file path like `driver-id/document.pdf`), falling back to `url` only if `storagePath` is missing.

### 2. Improve path extraction logic in `generateSignedUrls`

The current path extraction (lines 142-151) doesn't handle signed URL format properly. Signed URLs contain query params (`?token=...`) and a `/sign/` prefix. Fix to:
- Strip query parameters first
- Handle `/storage/v1/object/sign/bucket-name/` prefix
- Handle `/storage/v1/object/public/bucket-name/` prefix
- If the value is already a clean path (no URL prefix), use it directly

### 3. Store `storagePath` (clean path) instead of signed URL in upload flows

In `DriverDocuments.tsx` and `OnboardingDocumentsStep.tsx`, change the `url` field to store the file path (`fileName`) instead of the signed URL. The signed URL should only be generated on-demand when viewing.

### 4. Always generate fresh signed URLs on view/download

Ensure `DocumentViewer`, `DriverDocuments`, and `DriverVehicleDocuments` always call `createSignedUrl()` with the clean path at view time, never relying on stored URLs.

## Files to modify

- `src/components/admin/DocumentViewer.tsx` — Fix `extractDocumentUrl` to prefer `storagePath`; fix path extraction to handle signed URL format (strip `?token=...` and `/sign/` prefix)
- `src/components/driver/DriverDocuments.tsx` — Store `fileName` as `url` instead of signed URL
- `src/components/driver/onboarding/OnboardingDocumentsStep.tsx` — Same fix: store clean path
- `src/components/driver/vehicles/DriverVehicleDocuments.tsx` — Ensure view/download generates fresh signed URLs from clean paths
