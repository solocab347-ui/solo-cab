import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  RefreshCw
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { notificationService } from "@/lib/notificationService";

interface Driver {
  id: string;
  user_id: string;
  documents: Record<string, any> | null;
  documents_status: string;
  documents_submitted_at: string | null;
  vehicle_brand: string | null;
  vehicle_model: string | null;
  profiles: {
    full_name: string;
    email: string;
    phone: string | null;
  } | null;
}

interface VehicleDocument {
  id: string;
  vehicle_id: string;
  driver_id: string;
  document_type: string;
  document_url: string | null;
  document_name: string | null;
  status: string;
  rejection_reason: string | null;
  uploaded_at: string | null;
}

const DOCUMENT_LABELS: Record<string, string> = {
  vtc_card: "Carte VTC",
  driving_license: "Permis de conduire",
  id_card: "Pièce d'identité",
  vehicle_registration: "Carte grise",
  insurance: "Attestation d'assurance",
  kbis: "Extrait Kbis/INSEE"
};

export const AdminDriverDocumentsManagement = () => {
  const { user } = useAuth();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [showReminderDialog, setShowReminderDialog] = useState(false);
  const [reminderMessage, setReminderMessage] = useState("");
  const [reminderDocType, setReminderDocType] = useState("");
  const [sendingReminder, setSendingReminder] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectingDocType, setRejectingDocType] = useState("");

  useEffect(() => {
    fetchDrivers();
  }, []);

  const fetchDrivers = async () => {
    try {
      const { data, error } = await supabase
        .from("drivers")
        .select(`
          id,
          user_id,
          documents,
          documents_status,
          documents_submitted_at,
          vehicle_brand,
          vehicle_model,
          profiles:user_id(full_name, email, phone)
        `)
        .in("documents_status", ["pending", "submitted", "rejected"])
        .order("documents_submitted_at", { ascending: false, nullsFirst: false });

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
  };

  const handleValidateDocument = async (driver: Driver, docKey: string) => {
    try {
      const docs = { ...driver.documents };
      docs[docKey] = { ...docs[docKey], validated: true, validatedAt: new Date().toISOString() };

      // Check if all documents are now validated
      const requiredDocs = Object.keys(DOCUMENT_LABELS);
      const allValidated = requiredDocs.every(key => docs[key]?.validated);

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

      toast.success("Document validé");
      fetchDrivers();
    } catch (error) {
      console.error("Error validating document:", error);
      toast.error("Erreur lors de la validation");
    }
  };

  const handleRejectDocument = async () => {
    if (!selectedDriver || !rejectingDocType) return;

    try {
      const docs = { ...selectedDriver.documents };
      docs[rejectingDocType] = { 
        ...docs[rejectingDocType], 
        rejected: true, 
        rejectedAt: new Date().toISOString(),
        rejectionReason 
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
        `Votre ${DOCUMENT_LABELS[rejectingDocType]} a été rejeté: ${rejectionReason}`,
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
      // Create reminder record
      const { error: reminderError } = await supabase
        .from("document_reminders")
        .insert({
          driver_id: selectedDriver.id,
          document_type: reminderDocType || "all",
          reminder_message: reminderMessage,
          sent_by: user?.id
        });

      if (reminderError) throw reminderError;

      // Send notification to driver
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

  const openReminderDialog = (driver: Driver, docType?: string) => {
    setSelectedDriver(driver);
    setReminderDocType(docType || "");
    setReminderMessage(
      docType 
        ? `Bonjour, nous vous rappelons de soumettre votre ${DOCUMENT_LABELS[docType]} pour compléter votre dossier.`
        : "Bonjour, nous vous rappelons de compléter votre dossier avec les documents manquants."
    );
    setShowReminderDialog(true);
  };

  const openRejectDialog = (driver: Driver, docType: string) => {
    setSelectedDriver(driver);
    setRejectingDocType(docType);
    setShowRejectDialog(true);
  };

  const getStatusBadge = (status: string) => {
    const config = {
      pending: { label: "En attente", className: "bg-yellow-500/10 text-yellow-500" },
      submitted: { label: "À valider", className: "bg-blue-500/10 text-blue-500" },
      validated: { label: "Validé", className: "bg-green-500/10 text-green-500" },
      rejected: { label: "Rejeté", className: "bg-red-500/10 text-red-500" }
    };
    const conf = config[status as keyof typeof config] || config.pending;
    return <Badge className={conf.className}>{conf.label}</Badge>;
  };

  const filteredDrivers = drivers.filter(d =>
    d.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
              Indiquez la raison du rejet pour {DOCUMENT_LABELS[rejectingDocType]}.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Raison du rejet..."
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleRejectDocument} disabled={!rejectionReason}>
              <XCircle className="w-4 h-4 mr-2" />
              Rejeter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
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

        {filteredDrivers.length === 0 ? (
          <Card className="p-8 text-center">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Aucun document en attente</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredDrivers.map(driver => (
              <Card key={driver.id} className="p-4">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{driver.profiles?.full_name}</h3>
                      {getStatusBadge(driver.documents_status)}
                    </div>
                    <p className="text-sm text-muted-foreground">{driver.profiles?.email}</p>
                    {driver.vehicle_brand && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                        <Car className="w-3 h-3" />
                        {driver.vehicle_brand} {driver.vehicle_model}
                      </p>
                    )}
                    {driver.documents_submitted_at && (
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Soumis le {format(new Date(driver.documents_submitted_at), "dd/MM/yyyy à HH:mm", { locale: fr })}
                      </p>
                    )}
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => openReminderDialog(driver)}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Relancer
                  </Button>
                </div>

                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {Object.entries(DOCUMENT_LABELS).map(([key, label]) => {
                    const doc = driver.documents?.[key];
                    const hasDoc = doc?.url;
                    const isValidated = doc?.validated;
                    const isRejected = doc?.rejected;

                    return (
                      <div 
                        key={key}
                        className={`p-3 rounded-lg border ${
                          isValidated ? 'bg-green-500/5 border-green-500/20' :
                          isRejected ? 'bg-red-500/5 border-red-500/20' :
                          hasDoc ? 'bg-blue-500/5 border-blue-500/20' :
                          'bg-muted/50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">{label}</span>
                          {isValidated && <CheckCircle className="w-4 h-4 text-green-500" />}
                          {isRejected && <XCircle className="w-4 h-4 text-red-500" />}
                          {!hasDoc && !isValidated && !isRejected && (
                            <AlertTriangle className="w-4 h-4 text-yellow-500" />
                          )}
                        </div>
                        
                        {hasDoc ? (
                          <div className="flex gap-1">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="flex-1"
                              onClick={() => window.open(doc.url, "_blank")}
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
                          <p className="text-xs text-red-500 mt-1">{doc.rejectionReason}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
};
