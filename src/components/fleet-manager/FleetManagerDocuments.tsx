import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  FileText, 
  Upload, 
  Check, 
  Clock, 
  AlertTriangle, 
  Loader2,
  Eye,
  Trash2,
  FileCheck,
  Building2
} from "lucide-react";
import { format, differenceInDays, isPast } from "date-fns";
import { fr } from "date-fns/locale";

interface FleetManagerDocumentsProps {
  fleetManagerId: string;
  userId: string;
}

interface DocumentInfo {
  name: string;
  url: string;
  uploadedAt: string;
}

interface DocumentsData {
  kbis?: DocumentInfo;
  capacite_transport?: DocumentInfo;
  attestation_assurance?: DocumentInfo;
  [key: string]: DocumentInfo | undefined;
}

const REQUIRED_DOCUMENTS = [
  { 
    key: "kbis", 
    label: "Extrait Kbis", 
    description: "Extrait Kbis de moins de 3 mois" 
  },
  { 
    key: "capacite_transport", 
    label: "Capacité de transport", 
    description: "Attestation de capacité de transport de personnes" 
  },
  { 
    key: "attestation_assurance", 
    label: "Attestation d'assurance", 
    description: "Attestation d'assurance responsabilité civile professionnelle" 
  },
];

export const FleetManagerDocuments = ({ fleetManagerId, userId }: FleetManagerDocumentsProps) => {
  const [documents, setDocuments] = useState<DocumentsData>({});
  const [documentsStatus, setDocumentsStatus] = useState<string>("pending");
  const [documentsDeadline, setDocumentsDeadline] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDocuments();
  }, [fleetManagerId]);

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from("fleet_managers")
        .select("documents, documents_status, documents_deadline")
        .eq("id", fleetManagerId)
        .single();

      if (error) throw error;

      setDocuments((data.documents as unknown as DocumentsData) || {});
      setDocumentsStatus(data.documents_status || "pending");
      setDocumentsDeadline(data.documents_deadline);
    } catch (error) {
      console.error("Error fetching documents:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (documentKey: string, file: File) => {
    if (!file) return;

    // Validate file type
    const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Format non supporté. Utilisez PDF, JPG ou PNG.");
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Le fichier ne doit pas dépasser 10 Mo.");
      return;
    }

    setUploading(documentKey);

    try {
      // Upload to storage
      const fileExt = file.name.split(".").pop();
      const fileName = `${userId}/${documentKey}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("fleet-manager-documents")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("fleet-manager-documents")
        .getPublicUrl(fileName);

      // Update documents in database
      const newDocuments: DocumentsData = {
        ...documents,
        [documentKey]: {
          name: file.name,
          url: urlData.publicUrl,
          uploadedAt: new Date().toISOString(),
        },
      };

      // Check if all documents are uploaded
      const allUploaded = REQUIRED_DOCUMENTS.every(
        (doc) => newDocuments[doc.key]
      );

      const { error: updateError } = await supabase
        .from("fleet_managers")
        .update({
          documents: JSON.parse(JSON.stringify(newDocuments)),
          documents_status: allUploaded ? "submitted" : "pending",
          documents_submitted_at: allUploaded ? new Date().toISOString() : null,
        })
        .eq("id", fleetManagerId);

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

  const handleDeleteDocument = async (documentKey: string) => {
    try {
      const doc = documents[documentKey];
      if (!doc) return;

      // Remove from storage
      const filePath = doc.url.split("/").slice(-2).join("/");
      await supabase.storage.from("fleet-manager-documents").remove([filePath]);

      // Update database
      const newDocuments = { ...documents };
      delete newDocuments[documentKey];

      const { error } = await supabase
        .from("fleet_managers")
        .update({
          documents: JSON.parse(JSON.stringify(newDocuments)),
          documents_status: "pending",
        })
        .eq("id", fleetManagerId);

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
    const isExpired = isPast(deadline);

    return { deadline, daysRemaining, isExpired };
  };

  const deadlineInfo = getDeadlineInfo();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Documents Obligatoires
            </CardTitle>
            <CardDescription>
              Téléchargez vos documents d'entreprise pour valider votre compte
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
          >
            {documentsStatus === "validated" && <Check className="w-3 h-3 mr-1" />}
            {documentsStatus === "submitted" && <Clock className="w-3 h-3 mr-1" />}
            {documentsStatus === "rejected" && <AlertTriangle className="w-3 h-3 mr-1" />}
            {documentsStatus === "validated"
              ? "Validé"
              : documentsStatus === "submitted"
              ? "En attente de validation"
              : documentsStatus === "rejected"
              ? "Rejeté"
              : "En attente"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Deadline Alert */}
        {deadlineInfo && documentsStatus === "pending" && (
          <Alert variant={deadlineInfo.isExpired ? "destructive" : deadlineInfo.daysRemaining <= 2 ? "destructive" : "default"}>
            <Clock className="w-4 h-4" />
            <AlertTitle>
              {deadlineInfo.isExpired
                ? "Délai expiré"
                : `${deadlineInfo.daysRemaining} jour${deadlineInfo.daysRemaining > 1 ? "s" : ""} restant${deadlineInfo.daysRemaining > 1 ? "s" : ""}`}
            </AlertTitle>
            <AlertDescription>
              {deadlineInfo.isExpired
                ? "Veuillez soumettre vos documents au plus vite pour éviter la suspension de votre compte."
                : `Vous avez jusqu'au ${format(deadlineInfo.deadline, "d MMMM yyyy", { locale: fr })} pour soumettre tous vos documents.`}
            </AlertDescription>
          </Alert>
        )}

        {documentsStatus === "submitted" && (
          <Alert>
            <FileCheck className="w-4 h-4" />
            <AlertTitle>Documents en cours de vérification</AlertTitle>
            <AlertDescription>
              Vos documents ont été soumis et sont en cours de vérification par notre équipe.
              Vous serez notifié dès que la validation sera terminée.
            </AlertDescription>
          </Alert>
        )}

        {documentsStatus === "validated" && (
          <Alert className="border-green-500 bg-green-500/10">
            <Check className="w-4 h-4 text-green-500" />
            <AlertTitle className="text-green-600">Documents validés</AlertTitle>
            <AlertDescription>
              Tous vos documents ont été vérifiés et validés. Votre compte est pleinement opérationnel.
            </AlertDescription>
          </Alert>
        )}

        {/* Documents List */}
        <div className="space-y-4">
          {REQUIRED_DOCUMENTS.map((doc) => {
            const uploadedDoc = documents[doc.key];
            const isUploading = uploading === doc.key;

            return (
              <div
                key={doc.key}
                className={`p-4 border rounded-lg ${
                  uploadedDoc ? "bg-green-500/5 border-green-500/30" : "bg-muted/50"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${uploadedDoc ? "bg-green-500/10" : "bg-muted"}`}>
                      {uploadedDoc ? (
                        <Check className="w-5 h-5 text-green-500" />
                      ) : (
                        <Building2 className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{doc.label}</p>
                      <p className="text-sm text-muted-foreground">{doc.description}</p>
                      {uploadedDoc && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Téléchargé le{" "}
                          {format(new Date(uploadedDoc.uploadedAt), "d MMMM yyyy à HH:mm", {
                            locale: fr,
                          })}
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
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        )}
                      </>
                    ) : (
                      <div>
                        <Input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          className="hidden"
                          id={`upload-${doc.key}`}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(doc.key, file);
                          }}
                          disabled={isUploading}
                        />
                        <Label htmlFor={`upload-${doc.key}`}>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isUploading}
                            asChild
                          >
                            <span>
                              {isUploading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <Upload className="w-4 h-4 mr-2" />
                                  Télécharger
                                </>
                              )}
                            </span>
                          </Button>
                        </Label>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Info */}
        <div className="text-sm text-muted-foreground bg-muted/50 p-4 rounded-lg">
          <p className="font-medium mb-2">Formats acceptés :</p>
          <ul className="list-disc list-inside space-y-1">
            <li>PDF, JPG, PNG (max 10 Mo par fichier)</li>
            <li>Les documents doivent être lisibles et non expirés</li>
            <li>L'extrait Kbis doit dater de moins de 3 mois</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default FleetManagerDocuments;
