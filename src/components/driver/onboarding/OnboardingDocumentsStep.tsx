import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';
import { cn } from '@/lib/utils';
import { generateFreshSignedUrl } from '@/lib/storageUtils';
import { 
  Upload, 
  CheckCircle, 
  Loader2, 
  Eye, 
  Trash2,
} from 'lucide-react';

interface OnboardingDocumentsStepProps {
  driverId: string;
  userId: string;
  onStatusChange: (status: string) => void;
}

interface DocumentInfo {
  name: string;
  url: string;
  uploadedAt: string;
}

interface DocumentsData {
  [key: string]: DocumentInfo | null;
}

const REQUIRED_DOCUMENTS = [
  { key: "vtc_card_recto", label: "Carte VTC (Recto)", required: true },
  { key: "vtc_card_verso", label: "Carte VTC (Verso)", required: true },
  { key: "driving_license_recto", label: "Permis (Recto)", required: true },
  { key: "driving_license_verso", label: "Permis (Verso)", required: true },
  { key: "id_card_recto", label: "Pièce d'identité (Recto)", required: true },
  { key: "id_card_verso", label: "Pièce d'identité (Verso)", required: false, hint: "Facultatif si passeport" },
  { key: "vehicle_registration", label: "Carte grise", required: true },
  { key: "insurance", label: "Assurance RC Pro", required: true },
  { key: "insurance_circulation", label: "Assurance RC Circulation", required: true },
  { key: "kbis", label: "Kbis ou INSEE", required: true },
];

export function OnboardingDocumentsStep({ driverId, userId, onStatusChange }: OnboardingDocumentsStepProps) {
  const [documents, setDocuments] = useState<DocumentsData>({});
  const [documentsStatus, setDocumentsStatus] = useState<string>("pending");
  const [uploading, setUploading] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDocuments();
  }, [driverId]);

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from("drivers")
        .select("documents, documents_status")
        .eq("id", driverId)
        .single();

      if (error) throw error;

      const docsData = data?.documents as Record<string, unknown> || {};
      const parsedDocs: DocumentsData = {};
      for (const key of Object.keys(docsData)) {
        const doc = docsData[key] as { name?: string; url?: string; uploadedAt?: string } | null;
        if (doc && doc.name && doc.url && doc.uploadedAt) {
          parsedDocs[key] = { name: doc.name, url: doc.url, uploadedAt: doc.uploadedAt };
        }
      }
      setDocuments(parsedDocs);
      setDocumentsStatus(data?.documents_status || "pending");
      onStatusChange(data?.documents_status || "pending");
    } catch (error) {
      console.error("Error fetching documents:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (docKey: string, file: File) => {
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Format non supporté. Utilisez JPG, PNG, WebP ou PDF.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Fichier trop volumineux (max 5 Mo)");
      return;
    }

    setUploading(docKey);

    try {
      const fileExt = file.name.split(".").pop();
      // IMPORTANT: Le dossier doit être le userId pour respecter la politique RLS
      const fileName = `${userId}/${docKey}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("driver-documents")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Store clean file path (NOT signed URL) for on-demand URL generation
      const newDocuments = {
        ...documents,
        [docKey]: {
          name: file.name,
          url: fileName,
          storagePath: fileName,
          uploadedAt: new Date().toISOString(),
        },
      };

      const requiredDocs = REQUIRED_DOCUMENTS.filter(doc => doc.required);
      const allUploaded = requiredDocs.every((doc) => newDocuments[doc.key]?.url);
      const newStatus = allUploaded ? "submitted" : "pending";

      const { error: updateError } = await supabase
        .from("drivers")
        .update({
          documents: newDocuments as unknown as Json,
          documents_status: newStatus,
          documents_submitted_at: allUploaded ? new Date().toISOString() : null,
          onboarding_documents_completed: allUploaded,
        })
        .eq("id", driverId);

      if (updateError) throw updateError;

      setDocuments(newDocuments);
      setDocumentsStatus(newStatus);
      onStatusChange(newStatus);

      if (allUploaded) {
        toast.success("Tous les documents soumis !");
      } else {
        toast.success("Document ajouté");
      }
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error("Erreur lors du téléchargement");
    } finally {
      setUploading(null);
    }
  };

  const handleDeleteDocument = async (docKey: string) => {
    try {
      const newDocuments = { ...documents };
      delete newDocuments[docKey];

      const { error } = await supabase
        .from("drivers")
        .update({
          documents: newDocuments as unknown as Json,
          documents_status: "pending",
          onboarding_documents_completed: false,
        })
        .eq("id", driverId);

      if (error) throw error;

      setDocuments(newDocuments);
      setDocumentsStatus("pending");
      onStatusChange("pending");
      toast.success("Document supprimé");
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Erreur lors de la suppression");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  const requiredDocs = REQUIRED_DOCUMENTS.filter(doc => doc.required);
  const uploadedRequiredCount = requiredDocs.filter((doc) => documents[doc.key]?.url).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Documents requis</h3>
        <span className={cn(
          "text-xs font-medium px-2 py-0.5 rounded-full",
          uploadedRequiredCount === requiredDocs.length 
            ? "bg-emerald-500/10 text-emerald-500" 
            : "bg-muted text-muted-foreground"
        )}>
          {uploadedRequiredCount}/{requiredDocs.length}
        </span>
      </div>

      {documentsStatus === "submitted" && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-primary/5 border border-primary/15">
          <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
          <p className="text-xs text-foreground/80">
            Documents en attente de validation (24-48h).
          </p>
        </div>
      )}

      {/* Documents List - clean rows */}
      <div className="divide-y divide-border/50 rounded-xl border border-border overflow-hidden">
        {REQUIRED_DOCUMENTS.map((doc) => {
          const uploadedDoc = documents[doc.key];
          const isUploading = uploading === doc.key;

          return (
            <div key={doc.key} className={cn(
              "flex items-center justify-between gap-3 p-3 transition-colors",
              uploadedDoc ? "bg-primary/3" : "bg-transparent"
            )}>
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                {uploadedDoc ? (
                  <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                ) : (
                  <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/25 shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">
                    {doc.label}
                    {!doc.required && (
                      <span className="ml-1.5 text-[9px] text-muted-foreground font-normal">Opt.</span>
                    )}
                  </p>
                  {(doc as any).hint && (
                    <p className="text-[9px] text-muted-foreground">{(doc as any).hint}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {uploadedDoc ? (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        const path = (uploadedDoc as any).storagePath || uploadedDoc.url;
                        const signedUrl = await generateFreshSignedUrl(path);
                        if (signedUrl) window.open(signedUrl, "_blank");
                        else toast.error("Impossible d'ouvrir le document");
                      }}
                      className="h-7 w-7 p-0"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteDocument(doc.key)}
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </>
                ) : (
                  <Label htmlFor={`upload-${doc.key}`} className="cursor-pointer">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-xs font-medium">
                      {isUploading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Upload className="w-3.5 h-3.5" />
                      )}
                      Ajouter
                    </div>
                    <Input
                      id={`upload-${doc.key}`}
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp,.pdf"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(doc.key, file);
                      }}
                      disabled={isUploading}
                    />
                  </Label>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Info - minimal */}
      <p className="text-[10px] text-muted-foreground text-center">
        Formats : JPG, PNG, WebP, PDF (max 5 Mo)
      </p>
    </div>
  );
}
