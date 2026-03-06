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
import { generateFreshSignedUrl } from "@/lib/storageUtils";
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

interface DriverDocumentsProps {
  driverId: string;
  userId: string;
}

interface DocumentInfo {
  name: string;
  url: string;
  uploadedAt: string;
  validated?: boolean;
  validatedAt?: string;
  rejected?: boolean;
  rejectedAt?: string;
  rejectionReason?: string;
  isLocked?: boolean;
}

interface DocumentsData {
  [key: string]: DocumentInfo | null;
}

const REQUIRED_DOCUMENTS = [
  {
    key: "vtc_card_recto",
    label: "Carte professionnelle VTC (Recto)",
    description: "Face avant de votre carte VTC en cours de validité",
    group: "vtc_card",
    isRecto: true,
  },
  {
    key: "vtc_card_verso",
    label: "Carte professionnelle VTC (Verso)",
    description: "Face arrière de votre carte VTC",
    group: "vtc_card",
    isVerso: true,
    optional: true, // Optionnel car certaines cartes n'ont rien au verso
  },
  {
    key: "driving_license_recto",
    label: "Permis de conduire (Recto)",
    description: "Face avant du permis B en cours de validité",
    group: "driving_license",
    isRecto: true,
  },
  {
    key: "driving_license_verso",
    label: "Permis de conduire (Verso)",
    description: "Face arrière du permis B",
    group: "driving_license",
    isVerso: true,
    optional: true, // Optionnel
  },
  {
    key: "id_card_recto",
    label: "Pièce d'identité (Recto)",
    description: "Face avant de votre CNI ou passeport",
    group: "id_card",
    isRecto: true,
  },
  {
    key: "id_card_verso",
    label: "Pièce d'identité (Verso)",
    description: "Face arrière de votre CNI (optionnel pour passeport)",
    group: "id_card",
    isVerso: true,
    optional: true, // Optionnel car un passeport n'a pas de verso
  },
  {
    key: "vehicle_registration",
    label: "Carte grise du véhicule",
    description: "Carte grise au nom du titulaire ou location",
  },
  {
    key: "insurance",
    label: "Assurance RC Pro",
    description: "Assurance RC Pro VTC en cours de validité",
  },
  {
    key: "insurance_circulation",
    label: "Assurance RC Circulation",
    description: "Assurance responsabilité civile circulation en cours de validité",
  },
  {
    key: "kbis",
    label: "Extrait Kbis ou INSEE",
    description: "Document de moins de 3 mois",
  },
];

export const DriverDocuments = ({ driverId, userId }: DriverDocumentsProps) => {
  const [documents, setDocuments] = useState<DocumentsData>({});
  const [documentsStatus, setDocumentsStatus] = useState<string>("pending");
  const [documentsDeadline, setDocumentsDeadline] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDocuments();
  }, [driverId]);

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from("drivers")
        .select("documents, documents_status, documents_deadline")
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
      setDocumentsDeadline(data?.documents_deadline);
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

      // Check if all required (non-optional) documents are uploaded
      const allUploaded = REQUIRED_DOCUMENTS
        .filter(doc => !(doc as any).optional) // Only check required documents
        .every((doc) => newDocuments[doc.key]?.url);

      const { error: updateError } = await supabase
        .from("drivers")
        .update({
          documents: newDocuments as unknown as Json,
          documents_status: allUploaded ? "submitted" : "pending",
          documents_submitted_at: allUploaded ? new Date().toISOString() : null,
        })
        .eq("id", driverId);

      if (updateError) throw updateError;

      setDocuments(newDocuments);
      if (allUploaded) {
        setDocumentsStatus("submitted");
        
        // Notifier les admins par notification dans l'app + email
        try {
          // Envoyer l'email à l'admin
          await supabase.functions.invoke("send-admin-documents-submitted", {
            body: { driver_id: driverId, notification_type: "documents_submitted" }
          });
        } catch (emailError) {
          console.error("Erreur envoi email admin:", emailError);
        }
        
        // Les notifications in-app sont maintenant gérées par un trigger DB
        
        toast.success("Tous les documents ont été soumis pour validation par l'administration !");
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
          documents_status: "pending",
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
        message: "Délai expiré ! Votre accès aux fonctionnalités est bloqué jusqu'à validation de vos documents.",
        expired: true,
      };
    } else if (daysRemaining <= 3) {
      return {
        variant: "destructive" as const,
        icon: AlertTriangle,
        message: `Urgent ! Plus que ${daysRemaining} jour(s) pour soumettre vos documents avant blocage de votre compte.`,
        expired: false,
      };
    } else if (daysRemaining <= 7) {
      return {
        variant: "default" as const,
        icon: Clock,
        message: `${daysRemaining} jours restants pour soumettre vos documents (avant le ${format(deadline, "dd MMMM yyyy", { locale: fr })})`,
        expired: false,
      };
    } else {
      return {
        variant: "default" as const,
        icon: Clock,
        message: `${daysRemaining} jours restants pour soumettre vos documents (avant le ${format(deadline, "dd MMMM yyyy", { locale: fr })})`,
        expired: false,
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
  const requiredDocs = REQUIRED_DOCUMENTS.filter(doc => !(doc as any).optional);
  const uploadedRequiredCount = requiredDocs.filter((doc) => documents[doc.key]?.url).length;
  const uploadedTotalCount = REQUIRED_DOCUMENTS.filter((doc) => documents[doc.key]?.url).length;

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
              Téléchargez tous les documents requis pour valider votre inscription
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
            {documentsStatus === "pending" && `${uploadedRequiredCount}/${requiredDocs.length} requis`}
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
              Vos documents ont été soumis et sont en cours de vérification par l'administration SoloCab.
              Vous serez notifié une fois la validation effectuée.
            </AlertDescription>
          </Alert>
        )}

        {documentsStatus === "validated" && (
          <Alert className="bg-success/10 border-success/30">
            <CheckCircle className="w-4 h-4 text-success" />
            <AlertDescription>
              Tous vos documents ont été validés. Votre inscription est complète !
            </AlertDescription>
          </Alert>
        )}

        {documentsStatus === "rejected" && (
          <Alert variant="destructive">
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>
              Certains documents ont été rejetés. Veuillez les soumettre à nouveau avec des documents valides.
            </AlertDescription>
          </Alert>
        )}

        {/* Documents List */}
        <div className="space-y-3 sm:space-y-4">
          {REQUIRED_DOCUMENTS.map((doc) => {
            const uploadedDoc = documents[doc.key];
            const isUploading = uploading === doc.key;

            return (
              <div
                key={doc.key}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 border rounded-lg gap-3"
              >
                <div className="flex items-start sm:items-center gap-2 sm:gap-3 min-w-0">
                  {uploadedDoc?.validated ? (
                    <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-success flex-shrink-0 mt-0.5 sm:mt-0" />
                  ) : uploadedDoc?.rejected ? (
                    <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-destructive flex-shrink-0 mt-0.5 sm:mt-0" />
                  ) : uploadedDoc ? (
                    <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 flex-shrink-0 mt-0.5 sm:mt-0" />
                  ) : (
                    <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 border-muted-foreground/30 flex-shrink-0 mt-0.5 sm:mt-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm sm:text-base truncate">{doc.label}</p>
                      {uploadedDoc?.validated && (
                        <Badge className="text-[10px] sm:text-xs bg-success text-success-foreground flex-shrink-0">
                          Validé
                        </Badge>
                      )}
                      {uploadedDoc?.rejected && (
                        <Badge variant="destructive" className="text-[10px] sm:text-xs flex-shrink-0">
                          Rejeté
                        </Badge>
                      )}
                      {uploadedDoc && !uploadedDoc.validated && !uploadedDoc.rejected && (
                        <Badge className="text-[10px] sm:text-xs bg-amber-500 text-white flex-shrink-0">
                          En attente
                        </Badge>
                      )}
                      {(doc as any).optional && !uploadedDoc && (
                        <Badge variant="outline" className="text-[10px] sm:text-xs bg-muted/50 flex-shrink-0">
                          Optionnel
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 sm:line-clamp-1">{doc.description}</p>
                    {uploadedDoc?.rejected && uploadedDoc.rejectionReason && (
                      <p className="text-xs text-destructive mt-1">
                        ❌ {uploadedDoc.rejectionReason}
                      </p>
                    )}
                    {uploadedDoc && (
                      <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">
                        Téléchargé le {format(new Date(uploadedDoc.uploadedAt), "dd/MM/yyyy")}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-6 sm:ml-0 flex-shrink-0">
                  {uploadedDoc ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          const path = (uploadedDoc as any).storagePath || uploadedDoc.url;
                          const signedUrl = await generateFreshSignedUrl(path);
                          if (signedUrl) window.open(signedUrl, "_blank");
                          else toast.error("Impossible d'ouvrir le document");
                        }}
                        className="h-8 w-8 p-0"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      {documentsStatus !== "validated" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteDocument(doc.key)}
                          className="text-destructive hover:text-destructive h-8 w-8 p-0"
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
                      <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
                        {isUploading ? (
                          <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                        ) : (
                          <Upload className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        )}
                        <span className="text-xs sm:text-sm whitespace-nowrap">Télécharger</span>
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
