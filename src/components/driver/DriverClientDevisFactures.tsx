import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  FileText,
  Receipt,
  Plus,
  Download,
  Euro,
  MapPin,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  User,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import jsPDF from "jspdf";

interface DriverClientDevisFacturesProps {
  clientId: string;
  driverId: string;
}

interface ClientProfile {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  address?: string;
}

interface DriverInfo {
  id: string;
  company_name: string | null;
  company_address: string | null;
  siret: string | null;
  siren: string | null;
  tva_rate: number;
  profiles: {
    full_name: string;
    phone: string;
    email: string;
  };
}

interface ManualDevis {
  description: string;
  amount: number;
  pickup_address: string;
  destination_address: string;
  scheduled_date: string;
  distance_km?: number;
  duration_minutes?: number;
}

const DriverClientDevisFactures = ({
  clientId,
  driverId,
}: DriverClientDevisFacturesProps) => {
  const [activeTab, setActiveTab] = useState<"devis" | "factures">("devis");
  const [devisList, setDevisList] = useState<any[]>([]);
  const [facturesList, setFacturesList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientProfile, setClientProfile] = useState<ClientProfile | null>(null);
  const [driverInfo, setDriverInfo] = useState<DriverInfo | null>(null);
  const [showCreateDevisDialog, setShowCreateDevisDialog] = useState(false);
  const [creating, setCreating] = useState(false);

  const [newDevis, setNewDevis] = useState<ManualDevis>({
    description: "",
    amount: 0,
    pickup_address: "",
    destination_address: "",
    scheduled_date: new Date().toISOString().slice(0, 16),
    distance_km: undefined,
    duration_minutes: undefined,
  });

  useEffect(() => {
    fetchData();
  }, [clientId, driverId]);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([
      fetchClientProfile(),
      fetchDriverInfo(),
      fetchDevis(),
      fetchFactures(),
    ]);
    setLoading(false);
  };

  const fetchClientProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("clients")
        .select(`
          id,
          profiles:user_id(
            full_name,
            email,
            phone,
            address
          )
        `)
        .eq("id", clientId)
        .single();

      if (error) throw error;
      if (data?.profiles) {
        setClientProfile({
          id: data.id,
          ...data.profiles,
        } as ClientProfile);
      }
    } catch (error) {
      console.error("Error fetching client profile:", error);
    }
  };

  const fetchDriverInfo = async () => {
    try {
      const { data, error } = await supabase
        .from("drivers")
        .select(`
          id,
          company_name,
          company_address,
          siret,
          siren,
          tva_rate,
          profiles:user_id(
            full_name,
            phone,
            email
          )
        `)
        .eq("id", driverId)
        .single();

      if (error) throw error;
      setDriverInfo(data as DriverInfo);
    } catch (error) {
      console.error("Error fetching driver info:", error);
    }
  };

  const fetchDevis = async () => {
    try {
      const { data, error } = await supabase
        .from("devis")
        .select(`
          *,
          courses(
            id,
            pickup_address,
            destination_address,
            scheduled_date,
            distance_km,
            duration_minutes,
            status
          )
        `)
        .eq("client_id", clientId)
        .eq("driver_id", driverId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDevisList(data || []);
    } catch (error) {
      console.error("Error fetching devis:", error);
    }
  };

  const fetchFactures = async () => {
    try {
      const { data, error } = await supabase
        .from("factures")
        .select(`
          *,
          courses(
            id,
            pickup_address,
            destination_address,
            scheduled_date,
            distance_km,
            duration_minutes
          )
        `)
        .eq("client_id", clientId)
        .eq("driver_id", driverId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setFacturesList(data || []);
    } catch (error) {
      console.error("Error fetching factures:", error);
    }
  };

  const generateQuoteNumber = async (): Promise<string> => {
    // Get current counter and increment
    const { data: driver, error } = await supabase
      .from("drivers")
      .select("quote_counter")
      .eq("id", driverId)
      .single();

    if (error) throw error;

    const currentCounter = driver?.quote_counter || 0;
    const newCounter = currentCounter + 1;

    // Update counter
    await supabase
      .from("drivers")
      .update({ quote_counter: newCounter })
      .eq("id", driverId);

    return `DEV-${String(newCounter).padStart(4, "0")}`;
  };

  const handleCreateDevis = async () => {
    if (!newDevis.amount || newDevis.amount <= 0) {
      toast.error("Veuillez entrer un montant valide");
      return;
    }

    if (!newDevis.pickup_address || !newDevis.destination_address) {
      toast.error("Veuillez renseigner les adresses de départ et d'arrivée");
      return;
    }

    setCreating(true);
    try {
      // First create a course for this devis
      const { data: courseData, error: courseError } = await supabase
        .from("courses")
        .insert({
          driver_id: driverId,
          client_id: clientId,
          pickup_address: newDevis.pickup_address,
          destination_address: newDevis.destination_address,
          scheduled_date: newDevis.scheduled_date,
          distance_km: newDevis.distance_km || 0,
          duration_minutes: newDevis.duration_minutes || 0,
          status: "pending",
          passengers_count: 1,
          estimated_price: newDevis.amount,
        })
        .select()
        .single();

      if (courseError) throw courseError;

      // Generate quote number
      const quoteNumber = await generateQuoteNumber();

      // Create the devis
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + 7);

      const { error: devisError } = await supabase.from("devis").insert({
        driver_id: driverId,
        client_id: clientId,
        course_id: courseData.id,
        quote_number: quoteNumber,
        amount: newDevis.amount,
        base_price: newDevis.amount,
        distance_price: 0,
        time_price: 0,
        status: "pending",
        valid_until: validUntil.toISOString(),
        notes: newDevis.description || null,
      });

      if (devisError) throw devisError;

      toast.success(`Devis ${quoteNumber} créé avec succès !`);
      setShowCreateDevisDialog(false);
      setNewDevis({
        description: "",
        amount: 0,
        pickup_address: "",
        destination_address: "",
        scheduled_date: new Date().toISOString().slice(0, 16),
        distance_km: undefined,
        duration_minutes: undefined,
      });
      fetchDevis();
    } catch (error: any) {
      console.error("Error creating devis:", error);
      toast.error("Erreur lors de la création du devis");
    } finally {
      setCreating(false);
    }
  };

  const handleDownloadDevisPDF = (devis: any) => {
    if (!driverInfo || !clientProfile) {
      toast.error("Informations manquantes pour générer le PDF");
      return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    // Header with blue gradient
    doc.setFillColor(0, 102, 204);
    doc.rect(0, 0, pageWidth, 35, "F");

    doc.setFontSize(28);
    doc.setFont(undefined, "bold");
    doc.setTextColor(255, 255, 255);
    doc.text("DEVIS", pageWidth / 2, 18, { align: "center" });

    doc.setFontSize(10);
    doc.setFont(undefined, "normal");
    doc.text(`Référence: ${devis.quote_number}`, pageWidth / 2, 26, {
      align: "center",
    });
    doc.text(
      `Date: ${format(new Date(devis.created_at), "dd/MM/yyyy", { locale: fr })}`,
      pageWidth / 2,
      32,
      { align: "center" }
    );
    doc.setTextColor(0, 0, 0);

    // Driver info (left)
    let yPos = 50;
    doc.setFontSize(10);
    doc.setFont(undefined, "bold");
    doc.text("CHAUFFEUR VTC", 20, yPos);
    doc.setFontSize(9);
    doc.setFont(undefined, "normal");
    yPos += 5;

    // Use driver's full name
    const driverName = driverInfo.profiles?.full_name || "N/A";
    doc.text(driverName, 20, yPos);
    yPos += 4;

    // Company name if different
    if (driverInfo.company_name && driverInfo.company_name !== driverName) {
      doc.text(driverInfo.company_name, 20, yPos);
      yPos += 4;
    }

    // Company address
    if (driverInfo.company_address) {
      const addressLines = doc.splitTextToSize(driverInfo.company_address, 70);
      addressLines.forEach((line: string) => {
        doc.text(line, 20, yPos);
        yPos += 4;
      });
    }

    yPos += 1;
    // SIRET or SIREN
    if (driverInfo.siret) {
      doc.text(`SIRET: ${driverInfo.siret}`, 20, yPos);
      yPos += 4;
    } else if (driverInfo.siren) {
      doc.text(`SIREN: ${driverInfo.siren}`, 20, yPos);
      yPos += 4;
    }

    if (driverInfo.profiles?.phone) {
      doc.text(`Tél: ${driverInfo.profiles.phone}`, 20, yPos);
    }

    // Client info (right)
    let clientYPos = 50;
    doc.setFontSize(10);
    doc.setFont(undefined, "bold");
    doc.text("CLIENT", pageWidth - 20, clientYPos, { align: "right" });
    doc.setFontSize(9);
    doc.setFont(undefined, "normal");
    clientYPos += 5;

    doc.text(clientProfile.full_name || "N/A", pageWidth - 20, clientYPos, {
      align: "right",
    });
    clientYPos += 4;

    if (clientProfile.email) {
      doc.text(clientProfile.email, pageWidth - 20, clientYPos, {
        align: "right",
      });
      clientYPos += 4;
    }

    if (clientProfile.phone) {
      doc.text(`Tél: ${clientProfile.phone}`, pageWidth - 20, clientYPos, {
        align: "right",
      });
    }

    // Service details box
    yPos = 95;
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.5);
    doc.rect(15, yPos, pageWidth - 30, 40);

    yPos += 7;
    doc.setFontSize(10);
    doc.setFont(undefined, "bold");
    doc.text("DÉTAILS DE LA PRESTATION", 20, yPos);

    doc.setFontSize(9);
    doc.setFont(undefined, "normal");
    yPos += 6;

    const pickupAddress = devis.courses?.pickup_address || "N/A";
    const destAddress = devis.courses?.destination_address || "N/A";
    const scheduledDate = devis.courses?.scheduled_date || devis.created_at;

    doc.text("Départ:", 20, yPos);
    const pickupLines = doc.splitTextToSize(pickupAddress, pageWidth - 55);
    doc.text(pickupLines, 45, yPos);
    yPos += 4 * pickupLines.length;

    doc.text("Arrivée:", 20, yPos);
    const destLines = doc.splitTextToSize(destAddress, pageWidth - 55);
    doc.text(destLines, 45, yPos);
    yPos += 4 * destLines.length + 1;

    doc.text("Date:", 20, yPos);
    doc.text(
      format(new Date(scheduledDate), "dd/MM/yyyy 'à' HH:mm", { locale: fr }),
      45,
      yPos
    );

    if (devis.courses?.distance_km) {
      yPos += 4;
      doc.text("Distance:", 20, yPos);
      doc.text(`${devis.courses.distance_km} km`, 45, yPos);
    }

    // Notes/Description
    if (devis.notes) {
      yPos = 145;
      doc.setFontSize(10);
      doc.setFont(undefined, "bold");
      doc.text("DESCRIPTION", 20, yPos);
      doc.setFont(undefined, "normal");
      doc.setFontSize(9);
      yPos += 6;
      const notesLines = doc.splitTextToSize(devis.notes, pageWidth - 40);
      notesLines.forEach((line: string) => {
        doc.text(line, 20, yPos);
        yPos += 4;
      });
    }

    // Total
    yPos = 175;
    doc.setFillColor(0, 102, 204);
    doc.rect(15, yPos - 3, pageWidth - 30, 12, "F");
    doc.setFontSize(12);
    doc.setFont(undefined, "bold");
    doc.setTextColor(255, 255, 255);
    doc.text("TOTAL TTC", 20, yPos + 4);
    doc.text(`${parseFloat(devis.amount).toFixed(2)} €`, pageWidth - 20, yPos + 4, {
      align: "right",
    });
    doc.setTextColor(0, 0, 0);

    // Validity
    yPos += 15;
    doc.setDrawColor(0, 102, 204);
    doc.setLineWidth(1);
    doc.rect(15, yPos - 3, pageWidth - 30, 10);
    doc.setFontSize(9);
    doc.setFont(undefined, "bold");
    doc.setTextColor(0, 102, 204);
    doc.text(
      `⏰ Devis valable 7 jours - jusqu'au ${format(new Date(devis.valid_until), "dd/MM/yyyy", { locale: fr })}`,
      pageWidth / 2,
      yPos + 2,
      { align: "center" }
    );
    doc.setTextColor(0, 0, 0);

    // Footer
    doc.setFillColor(245, 245, 245);
    doc.rect(0, pageHeight - 15, pageWidth, 15, "F");
    doc.setFontSize(8);
    doc.setFont(undefined, "normal");
    doc.setTextColor(100, 100, 100);
    doc.text("Merci de votre confiance", pageWidth / 2, pageHeight - 8, {
      align: "center",
    });

    doc.save(`devis-${devis.quote_number}.pdf`);
    toast.success("Devis téléchargé");
  };

  const handleDownloadFacturePDF = (facture: any) => {
    if (!driverInfo || !clientProfile) {
      toast.error("Informations manquantes pour générer le PDF");
      return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    // Green header
    const headerColor: [number, number, number] = [46, 204, 113];
    doc.setFillColor(headerColor[0], headerColor[1], headerColor[2]);
    doc.rect(0, 0, pageWidth, 50, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(28);
    doc.text("FACTURE", pageWidth / 2, 25, { align: "center" });

    doc.setFontSize(10);
    doc.text(
      `N°: ${facture.invoice_number_generated || facture.invoice_number}`,
      pageWidth / 2,
      35,
      { align: "center" }
    );
    doc.text(
      `Date: ${format(new Date(facture.created_at), "dd/MM/yyyy", { locale: fr })}`,
      pageWidth / 2,
      42,
      { align: "center" }
    );

    // Driver info
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.setFont(undefined, "bold");
    doc.text("CHAUFFEUR VTC", 20, 65);
    doc.setFont(undefined, "normal");
    doc.setFontSize(9);

    const driverName = driverInfo.profiles?.full_name || "N/A";
    doc.text(driverName, 20, 71);

    let infoY = 76;
    if (driverInfo.company_name && driverInfo.company_name !== driverName) {
      doc.text(driverInfo.company_name, 20, infoY);
      infoY += 5;
    }

    if (driverInfo.siret) {
      doc.text(`SIRET: ${driverInfo.siret}`, 20, infoY);
      infoY += 5;
    } else if (driverInfo.siren) {
      doc.text(`SIREN: ${driverInfo.siren}`, 20, infoY);
      infoY += 5;
    }

    doc.text(`Tél: ${driverInfo.profiles?.phone || "N/A"}`, 20, infoY);
    infoY += 5;

    if (driverInfo.company_address) {
      const addressLines = doc.splitTextToSize(driverInfo.company_address, 75);
      doc.text(addressLines, 20, infoY);
    }

    // Client info
    doc.setFontSize(11);
    doc.setFont(undefined, "bold");
    doc.text("CLIENT", pageWidth - 20, 65, { align: "right" });
    doc.setFont(undefined, "normal");
    doc.setFontSize(9);

    doc.text(clientProfile.full_name, pageWidth - 20, 71, { align: "right" });
    if (clientProfile.email) {
      doc.text(clientProfile.email, pageWidth - 20, 76, { align: "right" });
    }
    if (clientProfile.phone) {
      doc.text(`Tél: ${clientProfile.phone}`, pageWidth - 20, 81, {
        align: "right",
      });
    }

    // Service details
    doc.setDrawColor(200, 200, 200);
    doc.rect(20, 110, 170, 55);

    doc.setFontSize(11);
    doc.setFont(undefined, "bold");
    doc.text("DÉTAILS DE LA PRESTATION", 25, 118);
    doc.setFont(undefined, "normal");
    doc.setFontSize(9);

    const pickupLines = doc.splitTextToSize(
      facture.courses?.pickup_address || "N/A",
      140
    );
    const destLines = doc.splitTextToSize(
      facture.courses?.destination_address || "N/A",
      140
    );

    doc.text("Départ:", 25, 126);
    doc.text(pickupLines, 50, 126);

    let currentY = 126 + pickupLines.length * 5;
    doc.text("Arrivée:", 25, currentY);
    doc.text(destLines, 50, currentY);

    currentY += destLines.length * 5;
    const scheduledDate =
      facture.courses?.scheduled_date || facture.created_at;
    doc.text(
      `Date: ${format(new Date(scheduledDate), "dd/MM/yyyy 'à' HH:mm", { locale: fr })}`,
      25,
      currentY
    );
    doc.text(
      `Distance: ${facture.courses?.distance_km || 0} km`,
      105,
      currentY + 5
    );

    // Total
    let yPos = 180;
    doc.setFillColor(headerColor[0], headerColor[1], headerColor[2]);
    doc.rect(20, yPos, 170, 9, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont(undefined, "bold");
    doc.setFontSize(11);
    doc.text("TOTAL TTC", 25, yPos + 6);
    doc.text(`${parseFloat(facture.amount).toFixed(2)} €`, 175, yPos + 6, {
      align: "right",
    });

    // Footer
    doc.setFillColor(240, 240, 240);
    doc.rect(0, pageHeight - 15, pageWidth, 15, "F");
    doc.setFontSize(8);
    doc.setFont(undefined, "normal");
    doc.setTextColor(100, 100, 100);
    doc.text("Merci de votre confiance", pageWidth / 2, pageHeight - 8, {
      align: "center",
    });

    doc.save(
      `facture-${facture.invoice_number_generated || facture.invoice_number}.pdf`
    );
    toast.success("Facture téléchargée");
  };

  const getStatusBadge = (status: string, validUntil?: string) => {
    const isExpired =
      validUntil && status === "pending" && new Date(validUntil) < new Date();

    if (isExpired) {
      return (
        <Badge
          variant="outline"
          className="bg-destructive/10 text-destructive border-destructive/20"
        >
          Expiré
        </Badge>
      );
    }

    const styles: Record<string, string> = {
      pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
      accepted: "bg-green-500/10 text-green-500 border-green-500/20",
      rejected: "bg-destructive/10 text-destructive border-destructive/20",
      paid: "bg-green-500/10 text-green-500 border-green-500/20",
    };

    const labels: Record<string, string> = {
      pending: "En attente",
      accepted: "Accepté",
      rejected: "Refusé",
      paid: "Payée",
    };

    return (
      <Badge variant="outline" className={styles[status] || styles.pending}>
        {labels[status] || status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
        <p className="text-muted-foreground mt-2">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Devis & Factures</h2>
            <p className="text-muted-foreground">
              Documents pour {clientProfile?.full_name || "ce client"}
            </p>
          </div>
        </div>
        <Button
          onClick={() => setShowCreateDevisDialog(true)}
          className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Créer un devis
        </Button>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as "devis" | "factures")}
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger
            value="devis"
            className="data-[state=active]:bg-orange-500/20 data-[state=active]:text-orange-500"
          >
            <FileText className="w-4 h-4 mr-2" />
            Devis ({devisList.length})
          </TabsTrigger>
          <TabsTrigger
            value="factures"
            className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-500"
          >
            <Receipt className="w-4 h-4 mr-2" />
            Factures ({facturesList.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="devis" className="mt-6 space-y-4">
          {devisList.length === 0 ? (
            <Card className="p-8 text-center">
              <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">Aucun devis</h3>
              <p className="text-muted-foreground mb-4">
                Créez un devis pour ce client
              </p>
              <Button onClick={() => setShowCreateDevisDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Créer un devis
              </Button>
            </Card>
          ) : (
            devisList.map((devis) => (
              <Card key={devis.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{devis.quote_number}</span>
                      {getStatusBadge(devis.status, devis.valid_until)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(devis.created_at), "dd/MM/yyyy", {
                        locale: fr,
                      })}
                    </p>
                    {devis.courses && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {devis.courses.pickup_address?.slice(0, 30)}...
                      </p>
                    )}
                    {devis.notes && (
                      <p className="text-sm text-muted-foreground italic">
                        {devis.notes}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xl font-bold text-primary">
                      {parseFloat(devis.amount).toFixed(2)} €
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownloadDevisPDF(devis)}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="factures" className="mt-6 space-y-4">
          {facturesList.length === 0 ? (
            <Card className="p-8 text-center bg-gradient-to-br from-green-500/10 to-emerald-500/10">
              <Receipt className="w-16 h-16 text-green-500/50 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">Aucune facture</h3>
              <p className="text-muted-foreground">
                Les factures apparaîtront après paiement des courses
              </p>
            </Card>
          ) : (
            facturesList.map((facture) => (
              <Card
                key={facture.id}
                className="p-4 bg-gradient-to-br from-green-500/5 to-emerald-500/5"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold">
                        {facture.invoice_number_generated ||
                          facture.invoice_number}
                      </span>
                      {getStatusBadge(facture.payment_status)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(facture.created_at), "dd/MM/yyyy", {
                        locale: fr,
                      })}
                    </p>
                    {facture.courses && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {facture.courses.pickup_address?.slice(0, 30)}...
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xl font-bold text-green-600">
                      {parseFloat(facture.amount).toFixed(2)} €
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownloadFacturePDF(facture)}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Create Devis Dialog */}
      <Dialog open={showCreateDevisDialog} onOpenChange={setShowCreateDevisDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Créer un devis</DialogTitle>
            <DialogDescription>
              Créez un devis pour {clientProfile?.full_name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Driver info preview */}
            <Card className="p-3 bg-muted/50">
              <p className="text-xs text-muted-foreground mb-1">Émetteur</p>
              <p className="font-medium">{driverInfo?.profiles?.full_name}</p>
              {driverInfo?.company_name && (
                <p className="text-sm text-muted-foreground">
                  {driverInfo.company_name}
                </p>
              )}
              {driverInfo?.siret && (
                <p className="text-xs text-muted-foreground">
                  SIRET: {driverInfo.siret}
                </p>
              )}
              {driverInfo?.siren && !driverInfo?.siret && (
                <p className="text-xs text-muted-foreground">
                  SIREN: {driverInfo.siren}
                </p>
              )}
            </Card>

            <div className="space-y-2">
              <Label>Adresse de départ *</Label>
              <Input
                placeholder="Ex: 15 Rue de la Paix, 75002 Paris"
                value={newDevis.pickup_address}
                onChange={(e) =>
                  setNewDevis({ ...newDevis, pickup_address: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Adresse d'arrivée *</Label>
              <Input
                placeholder="Ex: Aéroport CDG Terminal 2E"
                value={newDevis.destination_address}
                onChange={(e) =>
                  setNewDevis({ ...newDevis, destination_address: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date et heure</Label>
                <Input
                  type="datetime-local"
                  value={newDevis.scheduled_date}
                  onChange={(e) =>
                    setNewDevis({ ...newDevis, scheduled_date: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Montant TTC (€) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={newDevis.amount || ""}
                  onChange={(e) =>
                    setNewDevis({
                      ...newDevis,
                      amount: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Distance (km)</Label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="Optionnel"
                  value={newDevis.distance_km || ""}
                  onChange={(e) =>
                    setNewDevis({
                      ...newDevis,
                      distance_km: parseFloat(e.target.value) || undefined,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Durée (min)</Label>
                <Input
                  type="number"
                  placeholder="Optionnel"
                  value={newDevis.duration_minutes || ""}
                  onChange={(e) =>
                    setNewDevis({
                      ...newDevis,
                      duration_minutes: parseInt(e.target.value) || undefined,
                    })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description / Notes</Label>
              <Input
                placeholder="Description de la prestation (optionnel)"
                value={newDevis.description}
                onChange={(e) =>
                  setNewDevis({ ...newDevis, description: e.target.value })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDevisDialog(false)}
            >
              Annuler
            </Button>
            <Button
              onClick={handleCreateDevis}
              disabled={creating}
              className="bg-gradient-to-r from-orange-500 to-orange-600"
            >
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Création...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 mr-2" />
                  Créer le devis
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DriverClientDevisFactures;
