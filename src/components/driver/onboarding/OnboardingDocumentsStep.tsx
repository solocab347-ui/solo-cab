import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';
import { 
  FileText, 
  Upload, 
  CheckCircle, 
  Loader2, 
  Eye, 
  Trash2,
  Info
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

      const { data: urlData } = supabase.storage
        .from("driver-documents")
        .getPublicUrl(fileName);

      const newDocuments = {
        ...documents,
        [docKey]: {
          name: file.name,
          url: urlData.publicUrl,
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
    <div className="space-y-3">
      {/* Status */}
      <div className="flex items-center justify-between p-2.5 bg-muted/30 rounded-lg">
        <span className="text-xs font-medium">Documents requis</span>
        <Badge variant={documentsStatus === "submitted" ? "default" : "outline"} className="text-xs">
          {uploadedRequiredCount}/{requiredDocs.length}
        </Badge>
      </div>

      {documentsStatus === "submitted" && (
        <Alert className="bg-primary/5 border-primary/20 py-2">
          <CheckCircle className="w-3.5 h-3.5 text-primary" />
          <AlertDescription className="text-xs">
            Documents en attente de validation (24-48h).
          </AlertDescription>
        </Alert>
      )}

      {/* Documents List */}
      <div className="space-y-1.5">
        {REQUIRED_DOCUMENTS.map((doc) => {
          const uploadedDoc = documents[doc.key];
          const isUploading = uploading === doc.key;

          return (
            <Card key={doc.key} className={uploadedDoc ? 'border-primary/30 bg-primary/5' : ''}>
              <CardContent className="p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {uploadedDoc ? (
                      <CheckCircle className="w-3.5 h-3.5 text-primary shrink-0" />
                    ) : (
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-muted-foreground/30 shrink-0" />
                    )}
                    <div className="min-w-0 flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-medium truncate">{doc.label}</p>
                        {!doc.required && (
                          <Badge variant="outline" className="text-[9px] bg-muted/50 px-1 py-0">
                            Opt.
                          </Badge>
                        )}
                      </div>
                      {(doc as any).hint && (
                        <p className="text-[9px] text-muted-foreground">{(doc as any).hint}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-0.5 shrink-0">
                    {uploadedDoc ? (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(uploadedDoc.url, "_blank")}
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
                        <div className="flex items-center gap-1 px-2 py-1 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors">
                          {isUploading ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Upload className="w-3.5 h-3.5" />
                          )}
                          <span className="text-[10px]">Ajouter</span>
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
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Info */}
      <Alert className="py-2">
        <Info className="w-3.5 h-3.5" />
        <AlertDescription className="text-[10px]">
          Formats : JPG, PNG, WebP, PDF (max 5 Mo)
        </AlertDescription>
      </Alert>
    </div>
  );
}
