import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  AlertTriangle, 
  Loader2, 
  Eye, 
  Trash2,
  Info
} from 'lucide-react';
import { format } from 'date-fns';

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
  {
    key: "vtc_card_recto",
    label: "Carte VTC (Recto)",
    description: "Face avant",
    required: true,
  },
  {
    key: "vtc_card_verso",
    label: "Carte VTC (Verso)",
    description: "Face arrière",
    required: false,
  },
  {
    key: "driving_license_recto",
    label: "Permis (Recto)",
    description: "Face avant",
    required: true,
  },
  {
    key: "driving_license_verso",
    label: "Permis (Verso)",
    description: "Face arrière",
    required: false,
  },
  {
    key: "id_card_recto",
    label: "Pièce d'identité (Recto)",
    description: "CNI ou passeport",
    required: true,
  },
  {
    key: "id_card_verso",
    label: "Pièce d'identité (Verso)",
    description: "Optionnel pour passeport",
    required: false,
  },
  {
    key: "vehicle_registration",
    label: "Carte grise",
    description: "Véhicule utilisé",
    required: true,
  },
  {
    key: "insurance",
    label: "Assurance RC Pro",
    description: "En cours de validité",
    required: true,
  },
  {
    key: "kbis",
    label: "Kbis ou INSEE",
    description: "Moins de 3 mois",
    required: true,
  },
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
      toast.error("Le fichier est trop volumineux (max 5 Mo)");
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
        toast.success("Tous les documents ont été soumis !");
      } else {
        toast.success("Document téléchargé");
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
  const totalUploaded = REQUIRED_DOCUMENTS.filter((doc) => documents[doc.key]?.url).length;

  return (
    <div className="space-y-4">
      {/* Status */}
      <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
        <span className="text-sm font-medium">Documents requis</span>
        <Badge variant={documentsStatus === "submitted" ? "default" : "outline"}>
          {uploadedRequiredCount}/{requiredDocs.length}
        </Badge>
      </div>

      {documentsStatus === "submitted" && (
        <Alert className="bg-primary/5 border-primary/20">
          <CheckCircle className="w-4 h-4 text-primary" />
          <AlertDescription className="text-sm">
            Vos documents sont en attente de validation par l'administration.
          </AlertDescription>
        </Alert>
      )}

      {/* Documents List */}
      <div className="space-y-2">
        {REQUIRED_DOCUMENTS.map((doc) => {
          const uploadedDoc = documents[doc.key];
          const isUploading = uploading === doc.key;

          return (
            <Card key={doc.key} className={uploadedDoc ? 'border-primary/30 bg-primary/5' : ''}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {uploadedDoc ? (
                      <CheckCircle className="w-4 h-4 text-primary shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium truncate">{doc.label}</p>
                        {!doc.required && (
                          <Badge variant="outline" className="text-[10px] bg-muted/50">
                            Optionnel
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{doc.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {uploadedDoc ? (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(uploadedDoc.url, "_blank")}
                          className="h-8 w-8 p-0"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteDocument(doc.key)}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    ) : (
                      <Label htmlFor={`upload-${doc.key}`} className="cursor-pointer">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
                          {isUploading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Upload className="w-4 h-4" />
                          )}
                          <span className="text-xs">Ajouter</span>
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
      <Alert>
        <Info className="w-4 h-4" />
        <AlertDescription className="text-xs">
          Formats acceptés : JPG, PNG, WebP, PDF (max 5 Mo).
          Vos documents seront vérifiés par l'administration avant activation de votre compte.
        </AlertDescription>
      </Alert>
    </div>
  );
}
