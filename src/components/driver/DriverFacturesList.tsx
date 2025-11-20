import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FileText, Search, Download, Euro, CheckCircle, CreditCard } from "lucide-react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { fr } from "date-fns/locale";
import jsPDF from "jspdf";

interface DriverFacturesListProps {
  driverId: string;
}

const DriverFacturesList = ({ driverId }: DriverFacturesListProps) => {
  const [factures, setFactures] = useState<any[]>([]);
  const [filteredFactures, setFilteredFactures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [clients, setClients] = useState<any[]>([]);
  const [driverInfo, setDriverInfo] = useState<any>(null);

  useEffect(() => {
    fetchFactures();
    fetchDriverInfo();
  }, [driverId]);

  useEffect(() => {
    let filtered = factures;

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter((facture) => facture.payment_status === statusFilter);
    }

    // Filter by client
    if (clientFilter !== "all") {
      filtered = filtered.filter((facture) => facture.client_id === clientFilter);
    }

    // Filter by date
    if (dateFilter !== "all") {
      const now = new Date();
      let startDate: Date;
      let endDate: Date = now;

      switch (dateFilter) {
        case "this_week":
          startDate = startOfWeek(now, { weekStartsOn: 1 });
          endDate = endOfWeek(now, { weekStartsOn: 1 });
          break;
        case "this_month":
          startDate = startOfMonth(now);
          endDate = endOfMonth(now);
          break;
        case "last_month":
          startDate = startOfMonth(subMonths(now, 1));
          endDate = endOfMonth(subMonths(now, 1));
          break;
        default:
          startDate = new Date(0);
      }

      filtered = filtered.filter((facture) => {
        const factureDate = new Date(facture.created_at);
        return factureDate >= startDate && factureDate <= endDate;
      });
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (facture) =>
          facture.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          facture.invoice_number_generated?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          facture.clients?.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredFactures(filtered);
  }, [searchTerm, statusFilter, clientFilter, dateFilter, factures]);

  const fetchDriverInfo = async () => {
    try {
      const { data: driverData } = await supabase
        .from("drivers")
        .select(`
          *,
          profiles:user_id(full_name, phone)
        `)
        .eq("id", driverId)
        .single();
      
      setDriverInfo(driverData);
    } catch (error) {
      console.error("Error fetching driver info:", error);
    }
  };

  const fetchFactures = async () => {
    try {
      const { data, error } = await supabase
        .from("factures")
        .select(`
          *,
          clients!inner(
            id,
            profiles:user_id(full_name, email, phone, profile_photo_url)
          ),
          courses!inner(
            pickup_address,
            destination_address,
            scheduled_date,
            distance_km,
            duration_minutes,
            passengers_count
          ),
          devis!inner(
            base_price,
            distance_price,
            time_price
          )
        `)
        .eq("driver_id", driverId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setFactures(data || []);
      setFilteredFactures(data || []);

      // Extract unique clients for filter
      const uniqueClients = Array.from(
        new Map(
          data?.map((f) => [f.clients.id, { id: f.clients.id, name: f.clients.profiles.full_name }])
        ).values()
      );
      setClients(uniqueClients);
    } catch (error: any) {
      console.error("Error fetching factures:", error);
      toast.error("Erreur lors du chargement des factures");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async (facture: any, forClient: boolean = false) => {
    if (!driverInfo) {
      toast.error("Informations chauffeur manquantes");
      return;
    }
    
    if (!driverInfo.company_name || !driverInfo.siret) {
      toast.error("Informations de l'entreprise incomplètes. Veuillez compléter vos paramètres (Nom d'entreprise, SIRET, Adresse)");
      return;
    }

    const jsPDF = (await import("jspdf")).default;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    // Green color for invoices
    const headerColor: [number, number, number] = [46, 204, 113]; // Green

    // Header
    doc.setFillColor(headerColor[0], headerColor[1], headerColor[2]);
    doc.rect(0, 0, pageWidth, 50, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(28);
    doc.text("FACTURE", pageWidth / 2, 25, { align: "center" });
    
    doc.setFontSize(10);
    doc.text(`N°: ${facture.invoice_number_generated || facture.invoice_number}`, pageWidth / 2, 35, { align: "center" });
    doc.text(`Date: ${format(new Date(facture.created_at), "dd/MM/yyyy", { locale: fr })}`, pageWidth / 2, 42, { align: "center" });

    // Driver info (left side)
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text("CHAUFFEUR VTC", 20, 65);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    const driverName = driverInfo.profiles?.full_name || driverInfo.company_name || "N/A";
    doc.text(driverName, 20, 71);
    if (driverInfo.company_name && driverInfo.company_name !== driverName) {
      doc.text(driverInfo.company_name, 20, 76);
    }
    doc.text(`SIRET: ${driverInfo.siret || 'N/A'}`, 20, 81);
    doc.text(`Tél: ${driverInfo.profiles?.phone || 'N/A'}`, 20, 86);
    
    if (driverInfo.company_address) {
      const addressLines = doc.splitTextToSize(driverInfo.company_address, 75);
      doc.text(addressLines, 20, 91);
    }

    // Client info (right side)
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text("CLIENT", 145, 65);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    doc.text(facture.clients?.profiles?.full_name || "N/A", 145, 71);

    // Service details box
    doc.setDrawColor(200, 200, 200);
    doc.rect(20, 110, 170, 55);
    
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text("DÉTAILS DE LA PRESTATION", 25, 118);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    
    const pickupLines = doc.splitTextToSize(facture.courses.pickup_address, 140);
    const destLines = doc.splitTextToSize(facture.courses.destination_address, 140);
    
    doc.text("Départ:", 25, 126);
    doc.text(pickupLines, 50, 126);
    
    let currentY = 126 + (pickupLines.length * 5);
    doc.text("Arrivée:", 25, currentY);
    doc.text(destLines, 50, currentY);
    
    currentY += (destLines.length * 5);
    doc.text(`Date: ${format(new Date(facture.courses.scheduled_date), "dd/MM/yyyy 'à' HH:mm", { locale: fr })}`, 25, currentY);
    doc.text(`Passagers: ${facture.courses.passengers_count}`, 25, currentY + 5);
    doc.text(`Distance: ${facture.courses.distance_km} km`, 105, currentY + 5);

    // Payment info
    let yPos = 175;
    doc.text(`Mode de paiement: ${facture.payment_method || 'N/A'}`, 20, yPos);

    // Pricing table
    yPos += 5;
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text("TARIFICATION", 20, yPos);
    yPos += 8;

    // Calculate TVA - use devis time_price if available, otherwise default to 10%
    const amount = facture.amount;
    const tvaRate = facture.devis?.time_price && facture.devis.time_price > 0 ? 20 : 10;
    const subtotalHT = amount / (1 + tvaRate / 100);
    const tvaAmount = amount - subtotalHT;

    if (!forClient) {
      // Driver version - with payment details
      doc.setFillColor(headerColor[0], headerColor[1], headerColor[2]);
      doc.rect(20, yPos, 170, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.text("Description", 25, yPos + 5.5);
      doc.text("Montant", 175, yPos + 5.5, { align: 'right' });
      
      yPos += 8;
      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined, 'normal');
      doc.setFillColor(245, 245, 245);
      doc.rect(20, yPos, 170, 7, 'F');
      doc.text("Sous-total HT", 25, yPos + 5);
      doc.text(`${subtotalHT.toFixed(2)} €`, 175, yPos + 5, { align: 'right' });
      
      yPos += 7;
      doc.text(`TVA (${tvaRate}%)`, 25, yPos + 5);
      doc.text(`${tvaAmount.toFixed(2)} €`, 175, yPos + 5, { align: 'right' });
      
      yPos += 9;
      doc.setFillColor(headerColor[0], headerColor[1], headerColor[2]);
      doc.rect(20, yPos, 170, 9, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont(undefined, 'bold');
      doc.setFontSize(11);
      doc.text("TOTAL TTC", 25, yPos + 6);
      doc.text(`${amount.toFixed(2)} €`, 175, yPos + 6, { align: 'right' });
      
      yPos += 15;
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(8);
      doc.setFont(undefined, 'italic');
      const noteLines = doc.splitTextToSize("Note: Le client reçoit une version simplifiée.", 170);
      doc.text(noteLines, 20, yPos);
    } else {
      // Client version - simplified
      doc.setFillColor(headerColor[0], headerColor[1], headerColor[2]);
      doc.rect(20, yPos, 170, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.text("Description", 25, yPos + 5.5);
      doc.text("Montant", 175, yPos + 5.5, { align: 'right' });
      
      yPos += 8;
      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined, 'normal');
      doc.setFillColor(245, 245, 245);
      doc.rect(20, yPos, 170, 7, 'F');
      doc.text("Sous-total HT", 25, yPos + 5);
      doc.text(`${subtotalHT.toFixed(2)} €`, 175, yPos + 5, { align: 'right' });
      
      yPos += 7;
      doc.text(`TVA (${tvaRate}%)`, 25, yPos + 5);
      doc.text(`${tvaAmount.toFixed(2)} €`, 175, yPos + 5, { align: 'right' });
      
      yPos += 9;
      doc.setFillColor(headerColor[0], headerColor[1], headerColor[2]);
      doc.rect(20, yPos, 170, 9, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont(undefined, 'bold');
      doc.setFontSize(11);
      doc.text("TOTAL TTC", 25, yPos + 6);
      doc.text(`${amount.toFixed(2)} €`, 175, yPos + 6, { align: 'right' });
    }

    // Footer
    const pageHeight = doc.internal.pageSize.height;
    doc.setFillColor(240, 240, 240);
    doc.rect(0, pageHeight - 15, pageWidth, 15, 'F');
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.text("Merci de votre confiance", pageWidth / 2, pageHeight - 8, { align: "center" });

    doc.save(`facture-${facture.invoice_number_generated || facture.invoice_number}${forClient ? '-client' : ''}.pdf`);
    toast.success("Facture téléchargée");
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      paid: "bg-green-500/10 text-green-500 border-green-500/20",
      pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
      failed: "bg-destructive/10 text-destructive border-destructive/20",
      refunded: "bg-muted text-muted-foreground border-border",
    };

    const labels = {
      paid: "Payée",
      pending: "En attente",
      failed: "Échec",
      refunded: "Remboursée",
    };

    return (
      <Badge variant="outline" className={styles[status as keyof typeof styles]}>
        <CheckCircle className="w-3 h-3 mr-1" />
        {labels[status as keyof typeof labels]}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Chargement des factures...</p>
      </div>
    );
  }

  const stats = {
    total: factures.length,
    paid: factures.filter((f) => f.payment_status === "paid").length,
    pending: factures.filter((f) => f.payment_status === "pending").length,
    failed: factures.filter((f) => f.payment_status === "failed").length,
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-center">
            <h3 className="text-3xl font-bold text-premium">{stats.total}</h3>
            <p className="text-sm text-muted-foreground">Factures totales</p>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-center">
            <h3 className="text-3xl font-bold text-green-500">{stats.paid}</h3>
            <p className="text-sm text-muted-foreground">Payées</p>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-center">
            <h3 className="text-3xl font-bold text-yellow-500">{stats.pending}</h3>
            <p className="text-sm text-muted-foreground">En attente</p>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-center">
            <h3 className="text-3xl font-bold text-destructive">{stats.failed}</h3>
            <p className="text-sm text-muted-foreground">Échecs</p>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par numéro ou client..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="paid">Payées</SelectItem>
            <SelectItem value="pending">En attente</SelectItem>
            <SelectItem value="failed">Échec</SelectItem>
            <SelectItem value="refunded">Remboursées</SelectItem>
          </SelectContent>
        </Select>
        <Select value={clientFilter} onValueChange={setClientFilter}>
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Client" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les clients</SelectItem>
            {clients.map((client) => (
              <SelectItem key={client.id} value={client.id}>
                {client.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Période" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les dates</SelectItem>
            <SelectItem value="this_week">Cette semaine</SelectItem>
            <SelectItem value="this_month">Ce mois</SelectItem>
            <SelectItem value="last_month">Mois dernier</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Factures List */}
      {filteredFactures.length === 0 ? (
        <Card className="p-8 text-center">
          <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2">Aucune facture</h3>
          <p className="text-muted-foreground">
            {searchTerm || statusFilter !== "all" || clientFilter !== "all" || dateFilter !== "all"
              ? "Aucune facture ne correspond à vos critères"
              : "Vos factures apparaîtront ici"}
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredFactures.map((facture) => (
            <Card key={facture.id} className="p-6 hover:shadow-elegant transition-all">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  {facture.clients?.profiles?.profile_photo_url ? (
                    <img
                      src={facture.clients.profiles.profile_photo_url}
                      alt={facture.clients.profiles.full_name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gradient-dark rounded-full flex items-center justify-center">
                      <FileText className="w-6 h-6 text-primary-foreground" />
                    </div>
                  )}
                  <div>
                    <h3 className="font-bold text-lg">
                      {facture.invoice_number_generated || facture.invoice_number}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {facture.clients?.profiles?.full_name}
                    </p>
                  </div>
                </div>
                {getStatusBadge(facture.payment_status)}
              </div>

              {/* Course info */}
              <div className="bg-secondary rounded-lg p-4 mb-4 space-y-2 text-sm">
                <div>
                  <span className="font-medium">Course :</span>
                  <span className="text-muted-foreground ml-2">
                    {facture.courses.pickup_address} → {facture.courses.destination_address}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Date course :</span>
                  <span className="text-muted-foreground ml-2">
                    {format(new Date(facture.courses.scheduled_date), "d MMMM yyyy", {
                      locale: fr,
                    })}
                  </span>
                </div>
                {facture.payment_method && (
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      Paiement : <span className="capitalize">{facture.payment_method}</span>
                    </span>
                  </div>
                )}
              </div>

              {/* Price */}
              <div className="border border-border rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Euro className="w-5 h-5 text-premium" />
                    <span className="font-semibold">Montant TTC</span>
                  </div>
                  <span className="text-2xl font-bold text-premium">
                    {parseFloat(facture.amount).toFixed(2)} €
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                  Créée le {format(new Date(facture.created_at), "d MMMM yyyy", { locale: fr })}
                  {facture.paid_at && (
                    <> • Payée le {format(new Date(facture.paid_at), "d MMMM yyyy", { locale: fr })}</>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadPDF(facture, false)}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    PDF Détaillé
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadPDF(facture, true)}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    PDF Client
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default DriverFacturesList;
