import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Json } from "@/integrations/supabase/types";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  FileText, 
  Upload, 
  CheckCircle, 
  AlertTriangle, 
  Loader2, 
  Eye, 
  Trash2,
  Clock,
  XCircle
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";

interface FleetDriverDocumentsProps {
  driverId: string;
  userId: string;
  fleetManagerId?: string;
  rejectedDocuments?: Array<{ key: string; reason: string }>;
  documentsRejectionReason?: string | null;
}

interface DocumentInfo {
  name: string;
  url: string;
  uploadedAt: string;
}

interface DocumentsData {
  [key: string]: DocumentInfo | null;
}

interface RequiredDocument {
  key: string;
  label: string;
  description: string;
  is_required: boolean;
}

const DEFAULT_REQUIRED_DOCUMENTS = [
  {
    key: "vtc_card",
    label: "Carte professionnelle VTC",
    description: "Carte VTC recto/verso en cours de validité",
    is_required: true,
  },
  {
    key: "driving_license",
    label: "Permis de conduire",
    description: "Permis B recto/verso en cours de validité",
    is_required: true,
  },
  {
    key: "id_card",
    label: "Pièce d'identité",
    description: "CNI ou passeport en cours de validité",
    is_required: true,
  },
  {
    key: "vehicle_registration",
    label: "Carte grise du véhicule",
    description: "Carte grise au nom du titulaire ou location",
    is_required: true,
  },
  {
    key: "insurance",
    label: "Attestation d'assurance",
    description: "Assurance RC Pro VTC en cours de validité",
    is_required: true,
  },
  {
    key: "kbis",
    label: "Extrait Kbis ou INSEE",
    description: "Document de moins de 3 mois",
    is_required: true,
  },
];

export const FleetDriverDocuments = ({ 
  driverId, 
  userId, 
  fleetManagerId,
  rejectedDocuments = [],
  documentsRejectionReason 
}: FleetDriverDocumentsProps) => {
  const [documents, setDocuments] = useState<DocumentsData>({});
  const [documentsStatus, setDocumentsStatus] = useState<string>("pending");
  const [documentsDeadline, setDocumentsDeadline] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [requiredDocuments, setRequiredDocuments] = useState<RequiredDocument[]>(DEFAULT_REQUIRED_DOCUMENTS);

  useEffect(() => {
    fetchDocuments();
    if (fleetManagerId) {
      fetchRequiredDocuments();
    }
  }, [driverId, fleetManagerId]);

  const fetchRequiredDocuments = async () => {
    if (!fleetManagerId) return;
    
    try {
      const { data, error } = await supabase
        .from("fleet_required_documents")
        .select("document_key, label, description, is_required")
        .eq("fleet_manager_id", fleetManagerId)
        .order("display_order", { ascending: true });

      if (error) throw error;
      
      if (data && data.length > 0) {
        setRequiredDocuments(data.map(d => ({
          key: d.document_key,
          label: d.label,
          description: d.description || "",
          is_required: d.is_required,
        })));
      }
    } catch (error) {
      console.error("Error fetching required documents:", error);
    }
  };

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from("drivers")
        .select("documents, fleet_documents_status, fleet_documents_deadline")
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
      setDocumentsStatus(data?.fleet_documents_status || "pending");
      setDocumentsDeadline(data?.fleet_documents_deadline);
    } catch (error) {
      console.error("Error fetching documents:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (docKey: string, file: File) => {
    if (!file) return;

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Format non supporté. Utilisez JPG, PNG, WebP ou PDF.");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Le fichier est trop volumineux (max 5 Mo)");
      return;
    }

    setUploading(docKey);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${driverId}/${docKey}_${Date.now()}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("driver-documents")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("driver-documents")
        .getPublicUrl(fileName);

      // Update documents in database
      const newDocuments = {
        ...documents,
        [docKey]: {
          name: file.name,
          url: urlData.publicUrl,
          uploadedAt: new Date().toISOString(),
        },
      };

      // Check if all required documents are uploaded
      const allUploaded = requiredDocuments
        .filter(doc => doc.is_required)
        .every((doc) => newDocuments[doc.key]?.url);

      const { error: updateError } = await supabase
        .from("drivers")
        .update({
          documents: newDocuments as unknown as Json,
          fleet_documents_status: allUploaded ? "submitted" : "pending",
          fleet_documents_submitted_at: allUploaded ? new Date().toISOString() : null,
        })
        .eq("id", driverId);

      if (updateError) throw updateError;

      setDocuments(newDocuments);
      if (allUploaded) {
        setDocumentsStatus("submitted");
        toast.success("Tous les documents ont été soumis pour validation !");
      } else {
        toast.success("Document téléchargé avec succès");
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
          fleet_documents_status: "pending",
        })
        .eq("id", driverId);

      if (error) throw error;

      setDocuments(newDocuments);
      setDocumentsStatus("pending");
      toast.success("Document supprimé");
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Erreur lors de la suppression");
    }
  };

  const getDeadlineInfo = () => {
    if (!documentsDeadline) return null;
    
    const deadline = new Date(documentsDeadline);
    const daysRemaining = differenceInDays(deadline, new Date());

    if (daysRemaining < 0) {
      return {
        variant: "destructive" as const,
        icon: XCircle,
        message: "Délai expiré ! Veuillez contacter votre gestionnaire.",
      };
    } else if (daysRemaining <= 2) {
      return {
        variant: "destructive" as const,
        icon: AlertTriangle,
        message: `Plus que ${daysRemaining} jour(s) pour soumettre vos documents !`,
      };
    } else {
      return {
        variant: "default" as const,
        icon: Clock,
        message: `${daysRemaining} jours restants pour soumettre vos documents (avant le ${format(deadline, "dd MMMM yyyy", { locale: fr })})`,
      };
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  const deadlineInfo = getDeadlineInfo();
  const uploadedCount = requiredDocuments.filter((doc) => documents[doc.key]?.url).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Mes documents
            </CardTitle>
            <CardDescription>
              Téléchargez tous les documents requis pour être validé
            </CardDescription>
          </div>
          <Badge
            variant={
              documentsStatus === "validated"
                ? "default"
                : documentsStatus === "submitted"
                ? "secondary"
                : documentsStatus === "rejected"
                ? "destructive"
                : "outline"
            }
            className={documentsStatus === "validated" ? "bg-success" : ""}
          >
            {documentsStatus === "validated" && "Validés"}
            {documentsStatus === "submitted" && "En attente de validation"}
            {documentsStatus === "rejected" && "Rejetés"}
            {documentsStatus === "pending" && `${uploadedCount}/${requiredDocuments.length} documents`}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Deadline Alert */}
        {deadlineInfo && documentsStatus === "pending" && (
          <Alert variant={deadlineInfo.variant}>
            <deadlineInfo.icon className="w-4 h-4" />
            <AlertDescription>{deadlineInfo.message}</AlertDescription>
          </Alert>
        )}

        {/* Status Alert */}
        {documentsStatus === "submitted" && (
          <Alert className="bg-primary/5 border-primary/20">
            <CheckCircle className="w-4 h-4 text-primary" />
            <AlertDescription>
              Vos documents ont été soumis et sont en cours de vérification par votre gestionnaire de flotte.
            </AlertDescription>
          </Alert>
        )}

        {documentsStatus === "validated" && (
          <Alert className="bg-success/10 border-success/30">
            <CheckCircle className="w-4 h-4 text-success" />
            <AlertDescription>
              Tous vos documents ont été validés. Vous pouvez maintenant effectuer des courses.
            </AlertDescription>
          </Alert>
        )}

        {documentsStatus === "rejected" && (
          <Alert variant="destructive">
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription className="space-y-2">
              <p>Certains documents ont été rejetés. Veuillez les soumettre à nouveau.</p>
              {documentsRejectionReason && (
                <p className="text-sm font-medium mt-2">
                  Raison: {documentsRejectionReason}
                </p>
              )}
              {rejectedDocuments.length > 0 && (
                <div className="mt-2 space-y-1">
                  <p className="text-sm font-medium">Documents concernés:</p>
                  <ul className="list-disc list-inside text-sm">
                    {rejectedDocuments.map((doc) => (
                      <li key={doc.key}>
                        {requiredDocuments.find(rd => rd.key === doc.key)?.label || doc.key}
                        {doc.reason && <span className="text-muted-foreground"> - {doc.reason}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Documents List */}
        <div className="space-y-4">
          {requiredDocuments.map((doc) => {
            const uploadedDoc = documents[doc.key];
            const isUploading = uploading === doc.key;

            return (
              <div
                key={doc.key}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {uploadedDoc ? (
                    <CheckCircle className="w-5 h-5 text-success" />
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30" />
                  )}
                  <div>
                    <p className="font-medium">{doc.label}</p>
                    <p className="text-sm text-muted-foreground">{doc.description}</p>
                    {uploadedDoc && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Téléchargé le {format(new Date(uploadedDoc.uploadedAt), "dd/MM/yyyy")}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {uploadedDoc ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(uploadedDoc.url, "_blank")}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      {documentsStatus !== "validated" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteDocument(doc.key)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </>
                  ) : (
                    <Label
                      htmlFor={`upload-${doc.key}`}
                      className="cursor-pointer"
                    >
                      <div className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
                        {isUploading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Upload className="w-4 h-4" />
                        )}
                        <span className="text-sm">Télécharger</span>
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
                        disabled={isUploading || documentsStatus === "validated"}
                      />
                    </Label>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* File Format Info */}
        <div className="text-sm text-muted-foreground bg-muted/50 p-4 rounded-lg">
          <p className="font-medium mb-2">Formats acceptés :</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Images : JPG, PNG, WebP</li>
            <li>Documents : PDF</li>
            <li>Taille maximale : 5 Mo par fichier</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
