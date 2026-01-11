import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  FileText,
  CheckCircle,
  XCircle,
  Search,
  Eye,
  Send,
  Clock,
  AlertTriangle,
  Car,
  Loader2,
  RefreshCw,
  Mail,
  Lock,
  Unlock,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  User,
  Copy
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { notificationService } from "@/lib/notificationService";

interface Driver {
  id: string;
  user_id: string;
  company_name: string | null;
  profile_photo_url: string | null;
  documents: Record<string, any> | null;
  documents_status: string;
  documents_submitted_at: string | null;
  documents_deadline: string | null;
  vehicle_brand: string | null;
  vehicle_model: string | null;
  created_at: string;
  profiles: {
    full_name: string;
    email: string;
    phone: string | null;
  } | null;
}

// Document types with recto/verso support and lock rules
const DOCUMENT_CONFIG: Record<string, {
  label: string;
  description: string;
  isRequired: boolean;
  hasVerso: boolean;
  canUpdateAfterValidation: boolean; // For insurance/carte grise
  alternativeKey?: string; // For passport as alternative to ID card verso
}> = {
  id_card_recto: {
    label: "Pièce d'identité (Recto)",
    description: "Face avant de votre CNI ou passeport",
    isRequired: true,
    hasVerso: false,
    canUpdateAfterValidation: false
  },
  id_card_verso: {
    label: "Pièce d'identité (Verso)",
    description: "Face arrière de votre CNI (optionnel si passeport)",
    isRequired: false, // Optionnel si passeport
    hasVerso: false,
    canUpdateAfterValidation: false
  },
  passport: {
    label: "Passeport (Alternative)",
    description: "Si vous n'avez pas de CNI - recto uniquement",
    isRequired: false, // Alternative à CNI
    hasVerso: false,
    canUpdateAfterValidation: false,
    alternativeKey: "id_card_verso" // Remplace le besoin du verso CNI
  },
  vtc_card_recto: {
    label: "Carte VTC (Recto)",
    description: "Face avant de votre carte professionnelle VTC",
    isRequired: true,
    hasVerso: false,
    canUpdateAfterValidation: false
  },
  vtc_card_verso: {
    label: "Carte VTC (Verso)",
    description: "Face arrière de votre carte professionnelle VTC",
    isRequired: true,
    hasVerso: false,
    canUpdateAfterValidation: false
  },
  driving_license_recto: {
    label: "Permis de conduire (Recto)",
    description: "Face avant du permis B",
    isRequired: true,
    hasVerso: false,
    canUpdateAfterValidation: false
  },
  driving_license_verso: {
    label: "Permis de conduire (Verso)",
    description: "Face arrière du permis B",
    isRequired: true,
    hasVerso: false,
    canUpdateAfterValidation: false
  },
  vehicle_registration: {
    label: "Carte grise",
    description: "Carte grise du véhicule - peut être mise à jour",
    isRequired: true,
    hasVerso: false,
    canUpdateAfterValidation: true // Can be updated (vehicle change)
  },
  insurance: {
    label: "Attestation d'assurance",
    description: "Assurance RC Pro VTC - peut être mise à jour",
    isRequired: true,
    hasVerso: false,
    canUpdateAfterValidation: true // Can be updated (renewal)
  },
  kbis: {
    label: "Extrait Kbis ou INSEE",
    description: "Document de moins de 3 mois",
    isRequired: true,
    hasVerso: false,
    canUpdateAfterValidation: false
  }
};

export const AdminDriverDocumentsManagement = () => {
  const { user } = useAuth();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "submitted" | "validated" | "rejected">("all");
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [showReminderDialog, setShowReminderDialog] = useState(false);
  const [reminderMessage, setReminderMessage] = useState("");
  const [reminderDocType, setReminderDocType] = useState("");
  const [sendingReminder, setSendingReminder] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectingDocType, setRejectingDocType] = useState("");
  const [expandedDrivers, setExpandedDrivers] = useState<Set<string>>(new Set());
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [emailContent, setEmailContent] = useState("");
  const [showDocumentPreview, setShowDocumentPreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewDocType, setPreviewDocType] = useState("");

  const fetchDrivers = useCallback(async () => {
    try {
      let query = supabase
        .from("drivers")
        .select(`
          id,
          user_id,
          company_name,
          documents,
          documents_status,
          documents_submitted_at,
          documents_deadline,
          vehicle_brand,
          vehicle_model,
          created_at,
          profiles:user_id(full_name, email, phone)
        `)
        .order("documents_submitted_at", { ascending: false, nullsFirst: false });

      if (statusFilter !== "all") {
        if (statusFilter === "pending") {
          query = query.or("documents_status.is.null,documents_status.eq.pending");
        } else {
          query = query.eq("documents_status", statusFilter);
        }
      }

      const { data, error } = await query;

      if (error) throw error;
      setDrivers((data || []).map(d => ({
        ...d,
        documents: (d.documents as Record<string, any>) || {}
      })));
    } catch (error) {
      console.error("Error fetching drivers:", error);
      toast.error("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchDrivers();
  }, [fetchDrivers]);

  const toggleDriverExpand = (driverId: string) => {
    setExpandedDrivers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(driverId)) {
        newSet.delete(driverId);
      } else {
        newSet.add(driverId);
      }
      return newSet;
    });
  };

  const getDocumentProgress = (docs: Record<string, any> | null) => {
    const requiredDocs = Object.entries(DOCUMENT_CONFIG).filter(([_, config]) => config.isRequired);
    const uploaded = requiredDocs.filter(([key]) => docs?.[key]?.url).length;
    const validated = requiredDocs.filter(([key]) => docs?.[key]?.validated).length;
    return { uploaded, validated, total: requiredDocs.length };
  };

  const handleValidateDocument = async (driver: Driver, docKey: string) => {
    try {
      const docs = { ...driver.documents };
      const config = DOCUMENT_CONFIG[docKey];
      
      docs[docKey] = { 
        ...docs[docKey], 
        validated: true, 
        validatedAt: new Date().toISOString(),
        validatedBy: user?.id,
        isLocked: !config.canUpdateAfterValidation // Lock if not insurance/carte grise
      };

      // Check if all required documents are now validated
      const requiredDocs = Object.entries(DOCUMENT_CONFIG).filter(([_, config]) => config.isRequired);
      const allValidated = requiredDocs.every(([key]) => docs[key]?.validated);

      const { error } = await supabase
        .from("drivers")
        .update({
          documents: docs,
          documents_status: allValidated ? "validated" : "submitted"
        })
        .eq("id", driver.id);

      if (error) throw error;

      if (allValidated) {
        await notificationService.notifySuccess(
          driver.user_id,
          "✅ Documents validés",
          "Tous vos documents ont été validés. Votre inscription est complète !",
          "/driver-dashboard"
        );
      }

      toast.success(`${DOCUMENT_CONFIG[docKey]?.label} validé${config.canUpdateAfterValidation ? "" : " et verrouillé"}`);
      fetchDrivers();
    } catch (error) {
      console.error("Error validating document:", error);
      toast.error("Erreur lors de la validation");
    }
  };

  const handleValidateAllDocuments = async (driver: Driver) => {
    try {
      const docs = { ...driver.documents };
      
      Object.entries(DOCUMENT_CONFIG).forEach(([key, config]) => {
        if (docs[key]?.url && !docs[key]?.validated) {
          docs[key] = {
            ...docs[key],
            validated: true,
            validatedAt: new Date().toISOString(),
            validatedBy: user?.id,
            isLocked: !config.canUpdateAfterValidation
          };
        }
      });

      const { error } = await supabase
        .from("drivers")
        .update({
          documents: docs,
          documents_status: "validated"
        })
        .eq("id", driver.id);

      if (error) throw error;

      await notificationService.notifySuccess(
        driver.user_id,
        "✅ Documents validés",
        "Tous vos documents ont été validés. Votre inscription est complète !",
        "/driver-dashboard"
      );

      toast.success("Tous les documents validés");
      fetchDrivers();
    } catch (error) {
      console.error("Error validating all:", error);
      toast.error("Erreur lors de la validation");
    }
  };

  const handleRejectDocument = async () => {
    if (!selectedDriver || !rejectingDocType || !rejectionReason.trim()) {
      toast.error("Veuillez indiquer la raison du rejet");
      return;
    }

    try {
      const docs = { ...selectedDriver.documents };
      docs[rejectingDocType] = { 
        ...docs[rejectingDocType], 
        validated: false,
        rejected: true, 
        rejectedAt: new Date().toISOString(),
        rejectedBy: user?.id,
        rejectionReason,
        isLocked: false // Unlock to allow re-upload
      };

      const { error } = await supabase
        .from("drivers")
        .update({
          documents: docs,
          documents_status: "rejected"
        })
        .eq("id", selectedDriver.id);

      if (error) throw error;

      await notificationService.notifyWarning(
        selectedDriver.user_id,
        "❌ Document rejeté",
        `Votre ${DOCUMENT_CONFIG[rejectingDocType]?.label} a été rejeté: ${rejectionReason}`,
        "/driver-dashboard"
      );

      toast.success("Document rejeté");
      setShowRejectDialog(false);
      setRejectionReason("");
      setRejectingDocType("");
      setSelectedDriver(null);
      fetchDrivers();
    } catch (error) {
      console.error("Error rejecting document:", error);
      toast.error("Erreur lors du rejet");
    }
  };

  const handleSendReminder = async () => {
    if (!selectedDriver || !reminderMessage) return;

    setSendingReminder(true);
    try {
      await notificationService.notifyWarning(
        selectedDriver.user_id,
        "📄 Rappel documents",
        reminderMessage,
        "/driver-dashboard"
      );

      toast.success("Relance envoyée avec succès");
      setShowReminderDialog(false);
      setReminderMessage("");
      setReminderDocType("");
      setSelectedDriver(null);
    } catch (error) {
      console.error("Error sending reminder:", error);
      toast.error("Erreur lors de l'envoi de la relance");
    } finally {
      setSendingReminder(false);
    }
  };

  const generateRecapEmail = (driver: Driver) => {
    const docs = driver.documents || {};
    const driverName = driver.profiles?.full_name || driver.company_name || "Chauffeur";
    
    const missing: string[] = [];
    const rejected: { label: string; reason: string }[] = [];
    const validated: string[] = [];

    Object.entries(DOCUMENT_CONFIG).forEach(([key, config]) => {
      const doc = docs[key];
      if (config.isRequired) {
        if (!doc?.url) {
          missing.push(config.label);
        } else if (doc.rejected && !doc.validated) {
          rejected.push({ label: config.label, reason: doc.rejectionReason || "Non conforme" });
        } else if (doc.validated) {
          validated.push(config.label);
        }
      }
    });

    let email = `Objet : État de votre dossier de documents - SoloCab\n\n`;
    email += `Bonjour ${driverName},\n\n`;
    email += `Nous avons examiné les documents que vous avez soumis pour votre inscription sur SoloCab.\n\n`;

    if (validated.length > 0) {
      email += `✅ Documents validés (${validated.length}) :\n`;
      validated.forEach(doc => {
        email += `   • ${doc}\n`;
      });
      email += `\n`;
    }

    if (rejected.length > 0) {
      email += `❌ Documents non conformes à corriger (${rejected.length}) :\n`;
      rejected.forEach(({ label, reason }) => {
        email += `   • ${label}\n     Raison : ${reason}\n`;
      });
      email += `\n`;
    }

    if (missing.length > 0) {
      email += `📋 Documents manquants à soumettre (${missing.length}) :\n`;
      missing.forEach(doc => {
        email += `   • ${doc}\n`;
      });
      email += `\n`;
    }

    if (rejected.length === 0 && missing.length === 0) {
      email += `🎉 Félicitations ! Tous vos documents sont en ordre.\n\n`;
    } else {
      email += `Veuillez soumettre les documents concernés dans les meilleurs délais via votre tableau de bord.\n\n`;
    }

    email += `Cordialement,\nL'équipe SoloCab\n\n---\nCet email a été généré automatiquement.`;

    setEmailContent(email);
    setSelectedDriver(driver);
    setShowEmailDialog(true);
  };

  const copyEmailToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(emailContent);
      toast.success("Email copié dans le presse-papiers");
    } catch (error) {
      toast.error("Erreur lors de la copie");
    }
  };

  const sendRecapEmail = async () => {
    if (!selectedDriver?.profiles?.email) {
      toast.error("Pas d'email pour ce chauffeur");
      return;
    }

    setSendingReminder(true);
    try {
      // Send notification
      await notificationService.notifyInfo(
        selectedDriver.user_id,
        "📄 Récapitulatif de vos documents",
        "Consultez l'état de votre dossier dans votre espace.",
        "/driver-dashboard"
      );

      toast.success(`Notification envoyée à ${selectedDriver.profiles.full_name}`);
      setShowEmailDialog(false);
      setEmailContent("");
    } catch (error) {
      console.error("Error sending email:", error);
      toast.error("Erreur lors de l'envoi");
    } finally {
      setSendingReminder(false);
    }
  };

  const openReminderDialog = (driver: Driver, docType?: string) => {
    setSelectedDriver(driver);
    setReminderDocType(docType || "");
    setReminderMessage(
      docType 
        ? `Bonjour, nous vous rappelons de soumettre votre ${DOCUMENT_CONFIG[docType]?.label} pour compléter votre dossier.`
        : "Bonjour, nous vous rappelons de compléter votre dossier avec les documents manquants."
    );
    setShowReminderDialog(true);
  };

  const openRejectDialog = (driver: Driver, docType: string) => {
    setSelectedDriver(driver);
    setRejectingDocType(docType);
    setShowRejectDialog(true);
  };

  const openDocumentPreview = (url: string, docType: string) => {
    setPreviewUrl(url);
    setPreviewDocType(docType);
    setShowDocumentPreview(true);
  };

  const getStatusBadge = (status: string | null) => {
    const config = {
      pending: { label: "Incomplet", className: "bg-gray-500/10 text-gray-500", icon: Clock },
      submitted: { label: "À valider", className: "bg-amber-500/10 text-amber-500", icon: Clock },
      validated: { label: "Validé", className: "bg-green-500/10 text-green-500", icon: CheckCircle },
      rejected: { label: "Rejeté", className: "bg-red-500/10 text-red-500", icon: XCircle }
    };
    const conf = config[(status || "pending") as keyof typeof config] || config.pending;
    const Icon = conf.icon;
    return <Badge className={conf.className}><Icon className="w-3 h-3 mr-1" />{conf.label}</Badge>;
  };

  const filteredDrivers = drivers.filter(d =>
    d.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.company_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Stats
  const stats = {
    total: drivers.length,
    pending: drivers.filter(d => !d.documents_status || d.documents_status === "pending").length,
    submitted: drivers.filter(d => d.documents_status === "submitted").length,
    validated: drivers.filter(d => d.documents_status === "validated").length,
    rejected: drivers.filter(d => d.documents_status === "rejected").length,
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <>
      {/* Reminder Dialog */}
      <Dialog open={showReminderDialog} onOpenChange={setShowReminderDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Envoyer une relance</DialogTitle>
            <DialogDescription>
              Envoyez un rappel à {selectedDriver?.profiles?.full_name} concernant ses documents.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={reminderMessage}
            onChange={(e) => setReminderMessage(e.target.value)}
            placeholder="Message de relance..."
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReminderDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleSendReminder} disabled={sendingReminder}>
              {sendingReminder ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              Envoyer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeter le document</DialogTitle>
            <DialogDescription>
              Indiquez la raison du rejet pour {DOCUMENT_CONFIG[rejectingDocType]?.label}.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Ex: Document illisible, date expirée, mauvais document..."
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleRejectDocument} disabled={!rejectionReason.trim()}>
              <XCircle className="w-4 h-4 mr-2" />
              Rejeter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email Recap Dialog */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Email récapitulatif des documents
            </DialogTitle>
            <DialogDescription>
              Pour : {selectedDriver?.profiles?.email}
            </DialogDescription>
          </DialogHeader>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Cet email récapitule l'état de tous les documents du chauffeur.
            </AlertDescription>
          </Alert>

          <Textarea
            value={emailContent}
            onChange={(e) => setEmailContent(e.target.value)}
            rows={15}
            className="font-mono text-sm"
          />

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={copyEmailToClipboard}>
              <Copy className="w-4 h-4 mr-2" />
              Copier
            </Button>
            <Button variant="outline" onClick={() => setShowEmailDialog(false)}>
              Fermer
            </Button>
            <Button onClick={sendRecapEmail} disabled={sendingReminder}>
              {sendingReminder ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              Envoyer notification
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document Preview Dialog */}
      <Dialog open={showDocumentPreview} onOpenChange={setShowDocumentPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{DOCUMENT_CONFIG[previewDocType]?.label}</DialogTitle>
          </DialogHeader>
          <div className="border rounded-lg overflow-hidden bg-muted/30">
            {previewUrl.toLowerCase().includes(".pdf") ? (
              <iframe
                src={previewUrl}
                className="w-full h-[500px]"
                title="Document preview"
              />
            ) : (
              <img
                src={previewUrl}
                alt="Document"
                className="w-full max-h-[500px] object-contain"
              />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => window.open(previewUrl, "_blank")}>
              <ExternalLink className="w-4 h-4 mr-2" />
              Ouvrir dans un nouvel onglet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className={`cursor-pointer transition-all ${statusFilter === "all" ? "ring-2 ring-primary" : "hover:border-primary/50"}`} onClick={() => setStatusFilter("all")}>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-sm text-muted-foreground">Total</div>
            </CardContent>
          </Card>
          <Card className={`cursor-pointer transition-all ${statusFilter === "pending" ? "ring-2 ring-gray-500" : "hover:border-gray-500/50"}`} onClick={() => setStatusFilter("pending")}>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-gray-500">{stats.pending}</div>
              <div className="text-sm text-muted-foreground">Incomplets</div>
            </CardContent>
          </Card>
          <Card className={`cursor-pointer transition-all ${statusFilter === "submitted" ? "ring-2 ring-amber-500" : "hover:border-amber-500/50"}`} onClick={() => setStatusFilter("submitted")}>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-amber-500">{stats.submitted}</div>
              <div className="text-sm text-muted-foreground">À valider</div>
            </CardContent>
          </Card>
          <Card className={`cursor-pointer transition-all ${statusFilter === "validated" ? "ring-2 ring-green-500" : "hover:border-green-500/50"}`} onClick={() => setStatusFilter("validated")}>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-500">{stats.validated}</div>
              <div className="text-sm text-muted-foreground">Validés</div>
            </CardContent>
          </Card>
          <Card className={`cursor-pointer transition-all ${statusFilter === "rejected" ? "ring-2 ring-red-500" : "hover:border-red-500/50"}`} onClick={() => setStatusFilter("rejected")}>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-500">{stats.rejected}</div>
              <div className="text-sm text-muted-foreground">Rejetés</div>
            </CardContent>
          </Card>
        </div>

        {/* Search & Actions */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un chauffeur..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" onClick={fetchDrivers}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualiser
          </Button>
        </div>

        {/* Drivers List */}
        {filteredDrivers.length === 0 ? (
          <Card className="p-8 text-center">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Aucun chauffeur trouvé</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredDrivers.map(driver => {
              const progress = getDocumentProgress(driver.documents);
              const isExpanded = expandedDrivers.has(driver.id);
              
              return (
                <Card key={driver.id} className="overflow-hidden">
                  {/* Driver Header */}
                  <div 
                    className="p-4 flex items-center gap-4 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => toggleDriverExpand(driver.id)}
                  >
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={driver.profile_photo_url || undefined} />
                      <AvatarFallback>
                        {(driver.profiles?.full_name || driver.company_name || "?").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium truncate">
                          {driver.profiles?.full_name || driver.company_name || "Sans nom"}
                        </span>
                        {getStatusBadge(driver.documents_status)}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {driver.profiles?.email}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <FileText className="w-3 h-3" />
                        {progress.validated}/{progress.total} validés • {progress.uploaded}/{progress.total} uploadés
                        {driver.documents_submitted_at && (
                          <span className="ml-2">
                            • Soumis le {format(new Date(driver.documents_submitted_at), "d MMM yyyy", { locale: fr })}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {driver.documents_status === "submitted" && (
                        <Button
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); handleValidateAllDocuments(driver); }}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Tout valider
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => { e.stopPropagation(); generateRecapEmail(driver); }}
                      >
                        <Mail className="w-4 h-4 mr-1" />
                        Email
                      </Button>
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  </div>

                  {/* Expanded Documents */}
                  {isExpanded && (
                    <div className="border-t bg-muted/30 p-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {Object.entries(DOCUMENT_CONFIG).map(([key, config]) => {
                          const doc = driver.documents?.[key];
                          const hasDoc = doc?.url;
                          const isValidated = doc?.validated;
                          const isRejected = doc?.rejected && !doc?.validated;
                          const isLocked = doc?.isLocked;

                          return (
                            <div 
                              key={key}
                              className={`p-3 rounded-lg border ${
                                isValidated ? 'bg-green-500/5 border-green-500/30' :
                                isRejected ? 'bg-red-500/5 border-red-500/30' :
                                hasDoc ? 'bg-amber-500/5 border-amber-500/30' :
                                'bg-muted/50 border-dashed'
                              }`}
                            >
                              <div className="flex items-start justify-between mb-2 gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1">
                                    <span className="text-sm font-medium truncate">{config.label}</span>
                                    {config.canUpdateAfterValidation && (
                                      <Unlock className="w-3 h-3 text-blue-500 flex-shrink-0" title="Peut être mis à jour" />
                                    )}
                                    {isLocked && !config.canUpdateAfterValidation && (
                                      <Lock className="w-3 h-3 text-gray-500 flex-shrink-0" title="Verrouillé" />
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground">{config.description}</p>
                                </div>
                                {isValidated && <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />}
                                {isRejected && <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />}
                                {!hasDoc && !isValidated && !isRejected && config.isRequired && (
                                  <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                                )}
                              </div>
                              
                              {hasDoc ? (
                                <div className="flex gap-1 flex-wrap">
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="flex-1"
                                    onClick={() => openDocumentPreview(doc.url, key)}
                                  >
                                    <Eye className="w-3 h-3 mr-1" />
                                    Voir
                                  </Button>
                                  {!isValidated && !isRejected && (
                                    <>
                                      <Button 
                                        size="sm"
                                        className="bg-green-600 hover:bg-green-700"
                                        onClick={() => handleValidateDocument(driver, key)}
                                      >
                                        <CheckCircle className="w-3 h-3" />
                                      </Button>
                                      <Button 
                                        size="sm"
                                        variant="destructive"
                                        onClick={() => openRejectDialog(driver, key)}
                                      >
                                        <XCircle className="w-3 h-3" />
                                      </Button>
                                    </>
                                  )}
                                </div>
                              ) : (
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  className="w-full"
                                  onClick={() => openReminderDialog(driver, key)}
                                >
                                  <Send className="w-3 h-3 mr-1" />
                                  Relancer
                                </Button>
                              )}
                              
                              {isRejected && doc.rejectionReason && (
                                <p className="text-xs text-red-500 mt-2 p-2 bg-red-500/10 rounded">
                                  Raison: {doc.rejectionReason}
                                </p>
                              )}

                              {doc?.validatedAt && (
                                <p className="text-xs text-green-600 mt-1">
                                  Validé le {format(new Date(doc.validatedAt), "d MMM yyyy", { locale: fr })}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
};
