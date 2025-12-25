import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Building2,
  Shield,
  Car,
  FileWarning,
  Download,
  Calendar,
  CheckCircle2,
  XCircle,
  RefreshCw
} from "lucide-react";
import { format, differenceInDays, isPast } from "date-fns";
import { fr } from "date-fns/locale";

interface FleetManagerDocumentsProps {
  fleetManagerId: string;
  userId: string;
  onDocumentsSubmitted?: () => void;
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

const DOCUMENT_CATEGORIES = {
  identite: {
    label: "Pièce d'Identité",
    icon: Shield,
    description: "Document d'identité du gestionnaire",
    color: "from-red-500/20 to-red-600/10",
    borderColor: "border-red-500/30",
    documents: [
      { 
        key: "piece_identite", 
        label: "Pièce d'identité", 
        description: "Carte d'identité ou passeport en cours de validité",
        icon: Shield
      },
    ]
  },
  entreprise: {
    label: "Documents Entreprise",
    icon: Building2,
    description: "Documents légaux de votre entreprise",
    color: "from-blue-500/20 to-blue-600/10",
    borderColor: "border-blue-500/30",
    documents: [
      { 
        key: "kbis", 
        label: "Extrait Kbis", 
        description: "Extrait Kbis de moins de 3 mois",
        icon: FileText
      },
    ]
  },
  transport: {
    label: "Documents Transport",
    icon: Car,
    description: "Autorisations de transport de personnes",
    color: "from-purple-500/20 to-purple-600/10",
    borderColor: "border-purple-500/30",
    documents: [
      { 
        key: "capacite_transport", 
        label: "Capacité de transport", 
        description: "Attestation de capacité de transport de personnes",
        icon: Shield
      },
    ]
  },
  assurance: {
    label: "Documents Assurance",
    icon: Shield,
    description: "Couvertures et garanties",
    color: "from-green-500/20 to-green-600/10",
    borderColor: "border-green-500/30",
    documents: [
      { 
        key: "attestation_assurance", 
        label: "Attestation d'assurance", 
        description: "Responsabilité civile professionnelle",
        icon: FileCheck
      },
    ]
  }
};

const ALL_DOCUMENTS = Object.values(DOCUMENT_CATEGORIES).flatMap(cat => cat.documents);

export const FleetManagerDocuments = ({ fleetManagerId, userId, onDocumentsSubmitted }: FleetManagerDocumentsProps) => {
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

    const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Format non supporté. Utilisez PDF, JPG ou PNG.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Le fichier ne doit pas dépasser 10 Mo.");
      return;
    }

    setUploading(documentKey);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${userId}/${documentKey}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("fleet-manager-documents")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("fleet-manager-documents")
        .getPublicUrl(fileName);

      const newDocuments: DocumentsData = {
        ...documents,
        [documentKey]: {
          name: file.name,
          url: urlData.publicUrl,
          uploadedAt: new Date().toISOString(),
        },
      };

      const allUploaded = ALL_DOCUMENTS.every((doc) => newDocuments[doc.key]);

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
        
        // Notifier les admins
        const { data: admins } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("role", "admin");
        
        if (admins && admins.length > 0) {
          const notifications = admins.map(admin => ({
            user_id: admin.user_id,
            title: "📄 Nouveaux documents à vérifier",
            message: "Un gestionnaire de flotte a soumis ses documents pour validation",
            type: "info",
            link: "/admin-dashboard"
          }));
          
          await supabase.from("notifications").insert(notifications);
        }
        
        toast.success("Tous les documents ont été soumis pour validation !");
        onDocumentsSubmitted?.();
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

      const filePath = doc.url.split("/").slice(-2).join("/");
      await supabase.storage.from("fleet-manager-documents").remove([filePath]);

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

  const uploadedCount = ALL_DOCUMENTS.filter(doc => documents[doc.key]).length;
  const progress = (uploadedCount / ALL_DOCUMENTS.length) * 100;
  const deadlineInfo = getDeadlineInfo();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20 overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20">
                <FileText className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-1">Documents Obligatoires</h2>
                <p className="text-muted-foreground">
                  Téléchargez vos documents d'entreprise pour valider votre compte
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Status Badge */}
              <Badge
                className={`px-4 py-2 text-sm font-medium ${
                  documentsStatus === "validated"
                    ? "bg-green-500/20 text-green-600 border-green-500/30"
                    : documentsStatus === "submitted"
                    ? "bg-blue-500/20 text-blue-600 border-blue-500/30"
                    : documentsStatus === "rejected"
                    ? "bg-red-500/20 text-red-600 border-red-500/30"
                    : "bg-orange-500/20 text-orange-600 border-orange-500/30"
                }`}
              >
                {documentsStatus === "validated" && <CheckCircle2 className="w-4 h-4 mr-2" />}
                {documentsStatus === "submitted" && <Clock className="w-4 h-4 mr-2" />}
                {documentsStatus === "rejected" && <XCircle className="w-4 h-4 mr-2" />}
                {documentsStatus === "pending" && <FileWarning className="w-4 h-4 mr-2" />}
                {documentsStatus === "validated"
                  ? "Validé"
                  : documentsStatus === "submitted"
                  ? "En vérification"
                  : documentsStatus === "rejected"
                  ? "Rejeté"
                  : "En attente"}
              </Badge>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-6 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progression</span>
              <span className="font-medium">{uploadedCount}/{ALL_DOCUMENTS.length} documents</span>
            </div>
            <Progress value={progress} className="h-3" />
          </div>
        </CardContent>
      </Card>

      {/* Alerts Section */}
      {deadlineInfo && documentsStatus === "pending" && (
        <Alert variant={deadlineInfo.isExpired || deadlineInfo.daysRemaining <= 2 ? "destructive" : "default"}>
          <Calendar className="w-4 h-4" />
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
        <Alert className="border-blue-500/30 bg-blue-500/10">
          <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />
          <AlertTitle className="text-blue-600">Documents en cours de vérification</AlertTitle>
          <AlertDescription>
            Vos documents ont été soumis et sont en cours de vérification par notre équipe.
          </AlertDescription>
        </Alert>
      )}

      {documentsStatus === "validated" && (
        <Alert className="border-green-500/30 bg-green-500/10">
          <Check className="w-4 h-4 text-green-500" />
          <AlertTitle className="text-green-600">Documents validés</AlertTitle>
          <AlertDescription>
            Tous vos documents ont été vérifiés et validés. Votre compte est pleinement opérationnel.
          </AlertDescription>
        </Alert>
      )}

      {/* Documents Grid by Category */}
      <div className="grid gap-6 lg:grid-cols-3">
        {Object.entries(DOCUMENT_CATEGORIES).map(([categoryKey, category]) => {
          const CategoryIcon = category.icon;
          const categoryDocuments = category.documents;
          const categoryUploaded = categoryDocuments.filter(doc => documents[doc.key]).length;
          const isComplete = categoryUploaded === categoryDocuments.length;

          return (
            <Card 
              key={categoryKey} 
              className={`bg-gradient-to-br ${category.color} ${category.borderColor} overflow-hidden`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl bg-background/50`}>
                      <CategoryIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{category.label}</CardTitle>
                      <CardDescription className="text-xs">{category.description}</CardDescription>
                    </div>
                  </div>
                  {isComplete && (
                    <div className="p-1 rounded-full bg-green-500/20">
                      <Check className="w-4 h-4 text-green-500" />
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {categoryDocuments.map((doc) => {
                  const uploadedDoc = documents[doc.key];
                  const isUploading = uploading === doc.key;
                  const DocIcon = doc.icon;

                  return (
                    <div
                      key={doc.key}
                      className={`p-4 rounded-xl border transition-all ${
                        uploadedDoc 
                          ? "bg-green-500/10 border-green-500/30" 
                          : "bg-background/50 border-border/50 hover:border-primary/30"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${uploadedDoc ? "bg-green-500/20" : "bg-muted"}`}>
                          {uploadedDoc ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : (
                            <DocIcon className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{doc.label}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1">{doc.description}</p>
                          {uploadedDoc && (
                            <p className="text-xs text-green-600 mt-1">
                              ✓ {format(new Date(uploadedDoc.uploadedAt), "dd MMM yyyy", { locale: fr })}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2 mt-3">
                        {uploadedDoc ? (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              onClick={() => window.open(uploadedDoc.url, "_blank")}
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              Voir
                            </Button>
                            {documentsStatus !== "validated" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteDocument(doc.key)}
                              >
                                <Trash2 className="w-3 h-3 text-destructive" />
                              </Button>
                            )}
                          </>
                        ) : (
                          <div className="w-full">
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
                            <Label htmlFor={`upload-${doc.key}`} className="w-full">
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={isUploading}
                                className="w-full"
                                asChild
                              >
                                <span>
                                  {isUploading ? (
                                    <Loader2 className="w-3 h-3 animate-spin mr-1" />
                                  ) : (
                                    <Upload className="w-3 h-3 mr-1" />
                                  )}
                                  {isUploading ? "Envoi..." : "Télécharger"}
                                </span>
                              </Button>
                            </Label>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Info Card */}
      <Card className="bg-muted/30 border-border/50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <AlertTriangle className="w-4 h-4 text-primary" />
            </div>
            <div className="text-sm">
              <p className="font-medium mb-2">Informations importantes</p>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Formats acceptés : PDF, JPG, PNG (max 10 Mo)</li>
                <li>• Les documents doivent être lisibles et non expirés</li>
                <li>• L'extrait Kbis doit dater de moins de 3 mois</li>
                <li>• La validation peut prendre 24 à 48h ouvrées</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FleetManagerDocuments;