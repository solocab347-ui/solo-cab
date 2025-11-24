import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FileText, Search, Download, Euro, CheckCircle, CreditCard, Share2, MessageSquare, Mail, Send, Facebook } from "lucide-react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { fr } from "date-fns/locale";
import jsPDF from "jspdf";
import { generateFactureShareMessage } from "@/lib/courseMessageGenerator";

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
          devis(
            base_price,
            distance_price,
            time_price,
            discount_amount,
            promo_code,
            evening_surcharge_amount,
            weekend_surcharge_amount
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
    
    if (!driverInfo.company_name || (!driverInfo.siret && !driverInfo.siren)) {
      toast.error("Informations de l'entreprise incomplètes. Veuillez compléter vos paramètres (Nom d'entreprise, SIRET ou SIREN, Adresse)");
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
    if (driverInfo.siret) {
      doc.text(`SIRET: ${driverInfo.siret}`, 20, 81);
    } else if (driverInfo.siren) {
      doc.text(`SIREN: ${driverInfo.siren}`, 20, 81);
    }
    doc.text(`Tél: ${driverInfo.profiles?.phone || 'N/A'}`, 20, 86);
    
    if (driverInfo.company_address) {
      const addressLines = doc.splitTextToSize(driverInfo.company_address, 75);
      doc.text(addressLines, 20, 91);
    }

    // Client info (right side)
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text("CLIENT", pageWidth - 20, 65, { align: 'right' });
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    
    const clientName = facture.clients?.profiles?.full_name || "N/A";
    doc.text(clientName, pageWidth - 20, 71, { align: 'right' });
    
    if (facture.clients?.profiles?.email) {
      doc.text(facture.clients.profiles.email, pageWidth - 20, 76, { align: 'right' });
    }
    
    if (facture.clients?.profiles?.phone) {
      doc.text(`Tél: ${facture.clients.profiles.phone}`, pageWidth - 20, 81, { align: 'right' });
    }

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
      // Driver version - detailed breakdown
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
      
      // Afficher les composantes de prix depuis le devis
      const isMiseADisposition = facture.devis?.time_price && facture.devis.time_price > 0 && (!facture.devis?.distance_price || facture.devis.distance_price === 0);
      
      if (isMiseADisposition) {
        // Mise à disposition - afficher durée et tarif horaire
        const hours = facture.courses.duration_minutes / 60;
        const hourlyRate = facture.devis.time_price / hours;
        
        doc.setFillColor(245, 245, 245);
        doc.rect(20, yPos, 170, 7, 'F');
        doc.text(`Mise à disposition (${hours.toFixed(1)}h à ${hourlyRate.toFixed(2)}€/h)`, 25, yPos + 5);
        doc.text(`${facture.devis.time_price.toFixed(2)} €`, 175, yPos + 5, { align: 'right' });
        
        yPos += 9;
      } else if (facture.devis) {
        // Course classique - afficher base + distance
        doc.setFillColor(245, 245, 245);
        doc.rect(20, yPos, 170, 7, 'F');
        doc.text("Forfait de base", 25, yPos + 5);
        doc.text(`${(facture.devis.base_price || 0).toFixed(2)} €`, 175, yPos + 5, { align: 'right' });
        
        yPos += 7;
        doc.text("Prix au kilomètre", 25, yPos + 5);
        doc.text(`${(facture.devis.distance_price || 0).toFixed(2)} €`, 175, yPos + 5, { align: 'right' });
        
        yPos += 9;
      } else {
        // Fallback si pas de devis
        doc.setFillColor(245, 245, 245);
        doc.rect(20, yPos, 170, 7, 'F');
        doc.text("Sous-total HT", 25, yPos + 5);
        doc.text(`${subtotalHT.toFixed(2)} €`, 175, yPos + 5, { align: 'right' });
        yPos += 9;
      }
      
      // Afficher les augmentations soir/weekend si présentes (version chauffeur uniquement)
      if (facture.devis?.evening_surcharge_amount && facture.devis.evening_surcharge_amount > 0) {
        doc.setFillColor(255, 245, 220);
        doc.rect(20, yPos, 170, 7, 'F');
        doc.setTextColor(204, 102, 0);
        doc.text("Augmentation Soir", 25, yPos + 5);
        doc.text(`+${facture.devis.evening_surcharge_amount.toFixed(2)} €`, 175, yPos + 5, { align: 'right' });
        yPos += 7;
        doc.setTextColor(0, 0, 0);
      }
      
      if (facture.devis?.weekend_surcharge_amount && facture.devis.weekend_surcharge_amount > 0) {
        doc.setFillColor(255, 245, 220);
        doc.rect(20, yPos, 170, 7, 'F');
        doc.setTextColor(204, 102, 0);
        doc.text("Augmentation Weekend", 25, yPos + 5);
        doc.text(`+${facture.devis.weekend_surcharge_amount.toFixed(2)} €`, 175, yPos + 5, { align: 'right' });
        yPos += 7;
        doc.setTextColor(0, 0, 0);
      }
      
      doc.setFillColor(240, 240, 240);
      doc.rect(20, yPos, 170, 7, 'F');
      doc.setFont(undefined, 'bold');
      doc.text("Sous-total HT", 25, yPos + 5);
      doc.text(`${subtotalHT.toFixed(2)} €`, 175, yPos + 5, { align: 'right' });
      
      yPos += 7;
      
      // Afficher la réduction si code promo appliqué
      if ((facture.promo_code || facture.devis?.promo_code) && (facture.discount_amount > 0 || facture.devis?.discount_amount > 0)) {
        const discountAmount = facture.discount_amount || facture.devis?.discount_amount || 0;
        const promoCode = facture.promo_code || facture.devis?.promo_code || '';
        doc.setTextColor(46, 125, 50); // Vert pour la réduction
        doc.text(`Réduction (${promoCode})`, 25, yPos + 5);
        doc.text(`-${discountAmount.toFixed(2)} €`, 175, yPos + 5, { align: 'right' });
        yPos += 7;
        doc.setTextColor(0, 0, 0);
      }
      
      // Afficher les augmentations soir/weekend si présentes (version chauffeur uniquement)
      if (facture.devis?.evening_surcharge_amount && facture.devis.evening_surcharge_amount > 0) {
        doc.setFillColor(255, 245, 220);
        doc.rect(20, yPos, 170, 7, 'F');
        doc.setTextColor(204, 102, 0);
        doc.text("Augmentation Soir", 25, yPos + 5);
        doc.text(`+${facture.devis.evening_surcharge_amount.toFixed(2)} €`, 175, yPos + 5, { align: 'right' });
        yPos += 7;
        doc.setTextColor(0, 0, 0);
      }
      
      if (facture.devis?.weekend_surcharge_amount && facture.devis.weekend_surcharge_amount > 0) {
        doc.setFillColor(255, 245, 220);
        doc.rect(20, yPos, 170, 7, 'F');
        doc.setTextColor(204, 102, 0);
        doc.text("Augmentation Weekend", 25, yPos + 5);
        doc.text(`+${facture.devis.weekend_surcharge_amount.toFixed(2)} €`, 175, yPos + 5, { align: 'right' });
        yPos += 7;
        doc.setTextColor(0, 0, 0);
      }
      
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
      
      // Afficher la réduction si code promo appliqué (version client)
      if ((facture.promo_code || facture.devis?.promo_code) && (facture.discount_amount > 0 || facture.devis?.discount_amount > 0)) {
        const discountAmount = facture.discount_amount || facture.devis?.discount_amount || 0;
        const promoCode = facture.promo_code || facture.devis?.promo_code || '';
        doc.setTextColor(46, 125, 50); // Vert pour la réduction
        doc.text(`Réduction (${promoCode})`, 25, yPos + 5);
        doc.text(`-${discountAmount.toFixed(2)} €`, 175, yPos + 5, { align: 'right' });
        yPos += 7;
        doc.setTextColor(0, 0, 0);
      }
      
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
      paid: "bg-gradient-success text-white border-0 shadow-md",
      pending: "bg-gradient-trust text-white border-0 shadow-md",
      failed: "bg-destructive/90 text-white border-0 shadow-md",
      refunded: "bg-muted/90 text-white border-0 shadow-md",
    };

    const labels = {
      paid: "Payée",
      pending: "En attente",
      failed: "Échec",
      refunded: "Remboursée",
    };

    return (
      <Badge className={styles[status as keyof typeof styles]}>
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
      {/* Stats - Horizontal on all screens */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
        <Card className="p-3 sm:p-4 bg-gradient-to-br from-primary/40 via-primary/25 to-primary/10 border border-primary/30 shadow-elegant hover:shadow-primary/50 transition-all">
          <div className="text-center">
            <h3 className="text-xl sm:text-3xl font-bold text-white">{stats.total}</h3>
            <p className="text-xs sm:text-sm text-white/80">Factures totales</p>
          </div>
        </Card>
        <Card className="p-3 sm:p-4 bg-gradient-to-br from-success/40 via-success/25 to-success/10 border border-success/30 shadow-elegant hover:shadow-success/50 transition-all">
          <div className="text-center">
            <h3 className="text-xl sm:text-3xl font-bold text-white">{stats.paid}</h3>
            <p className="text-xs sm:text-sm text-white/80">Payées</p>
          </div>
        </Card>
        <Card className="p-3 sm:p-4 bg-gradient-to-br from-warning/40 via-warning/25 to-warning/10 border border-warning/30 shadow-elegant hover:shadow-warning/50 transition-all">
          <div className="text-center">
            <h3 className="text-xl sm:text-3xl font-bold text-white">{stats.pending}</h3>
            <p className="text-xs sm:text-sm text-white/80">En attente</p>
          </div>
        </Card>
        <Card className="p-3 sm:p-4 bg-gradient-to-br from-destructive/40 via-destructive/25 to-destructive/10 border border-destructive/30 shadow-elegant hover:shadow-destructive/50 transition-all">
          <div className="text-center">
            <h3 className="text-xl sm:text-3xl font-bold text-white">{stats.failed}</h3>
            <p className="text-xs sm:text-sm text-white/80">Échecs</p>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4 bg-card/80 backdrop-blur-sm border-primary/10">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-primary" />
            <Input
              placeholder="Rechercher par numéro ou client..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-background/50"
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
      </Card>

      {/* Factures List */}
      {filteredFactures.length === 0 ? (
        <Card className="p-8 text-center bg-gradient-success border-0">
          <FileText className="w-16 h-16 text-white mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2 text-white">Aucune facture</h3>
          <p className="text-white">
            {searchTerm || statusFilter !== "all" || clientFilter !== "all" || dateFilter !== "all"
              ? "Aucune facture ne correspond à vos critères"
              : "Vos factures apparaîtront ici"}
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredFactures.map((facture, index) => {
            const gradients = ['bg-gradient-success', 'bg-gradient-premium', 'bg-gradient-trust'];
            const gradient = gradients[index % 3];
            return (
            <Card key={facture.id} className={`p-6 hover:shadow-elegant transition-all ${gradient} border-0`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  {facture.clients?.profiles?.profile_photo_url ? (
                    <img
                      src={facture.clients.profiles.profile_photo_url}
                      alt={facture.clients.profiles.full_name}
                      className="w-12 h-12 rounded-full object-cover border-2 border-white/30"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white font-semibold border-2 border-white/30">
                      {facture.clients?.profiles?.full_name?.[0] || "?"}
                    </div>
                  )}
                  <div>
                    <h3 className="font-bold text-lg text-white">
                      {facture.invoice_number_generated || facture.invoice_number}
                    </h3>
                    <p className="text-sm text-white/80">
                      {facture.clients?.profiles?.full_name}
                    </p>
                  </div>
                </div>
                {getStatusBadge(facture.payment_status)}
              </div>

              {/* Course info */}
              <div className="bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-sm rounded-lg p-4 mb-4 space-y-2 text-sm border border-white/20">
                <div>
                  <span className="font-medium text-white">Course :</span>
                  <span className="text-white/80 ml-2">
                    {facture.courses.pickup_address} → {facture.courses.destination_address}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-white">Date course :</span>
                  <span className="text-white/80 ml-2">
                    {format(new Date(facture.courses.scheduled_date), "d MMMM yyyy", {
                      locale: fr,
                    })}
                  </span>
                </div>
                {facture.payment_method && (
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-purple-300" />
                    <span className="text-white/80">
                      Paiement : <span className="capitalize">{facture.payment_method}</span>
                    </span>
                  </div>
                )}
              </div>

              {/* Price */}
              <div className="bg-gradient-to-br from-emerald-500/40 to-green-500/20 backdrop-blur-sm border-2 border-emerald-400/50 rounded-lg p-4 mb-4 shadow-lg shadow-emerald-500/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-6 h-6 text-emerald-300 drop-shadow-glow" />
                    <span className="font-bold text-lg text-white drop-shadow-md">Montant TTC</span>
                  </div>
                  <span className="text-3xl font-black text-emerald-300 drop-shadow-glow">
                    {parseFloat(facture.amount).toFixed(2)} €
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="text-xs text-white">
                  Créée le {format(new Date(facture.created_at), "d MMMM yyyy", { locale: fr })}
                  {facture.paid_at && (
                    <> • Payée le {format(new Date(facture.paid_at), "d MMMM yyyy", { locale: fr })}</>
                  )}
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadPDF(facture, false)}
                    className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    PDF Détaillé
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadPDF(facture, true)}
                    className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    PDF Client
                  </Button>
                  
                  {/* Social Share Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                      >
                        <Share2 className="w-4 h-4 mr-2" />
                        Partager
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem
                        onClick={() => {
                          const message = generateFactureShareMessage(
                            facture,
                            facture.courses,
                            { company_name: driverInfo?.company_name, profiles: driverInfo?.profiles },
                            facture.clients,
                            true // isDriver
                          );
                          window.open(`sms:?body=${encodeURIComponent(message)}`, '_blank');
                        }}
                        className="gap-2 cursor-pointer"
                      >
                        <MessageSquare className="w-4 h-4" />
                        SMS
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          const message = generateFactureShareMessage(
                            facture,
                            facture.courses,
                            { company_name: driverInfo?.company_name, profiles: driverInfo?.profiles },
                            facture.clients,
                            true
                          );
                          window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
                        }}
                        className="gap-2 cursor-pointer"
                      >
                        <Send className="w-4 h-4" />
                        WhatsApp
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          const message = generateFactureShareMessage(
                            facture,
                            facture.courses,
                            { company_name: driverInfo?.company_name, profiles: driverInfo?.profiles },
                            facture.clients,
                            true
                          );
                          window.open(`mailto:?subject=Facture ${facture.invoice_number_generated || facture.invoice_number}&body=${encodeURIComponent(message)}`, '_blank');
                        }}
                        className="gap-2 cursor-pointer"
                      >
                        <Mail className="w-4 h-4" />
                        Email
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          const message = generateFactureShareMessage(
                            facture,
                            facture.courses,
                            { company_name: driverInfo?.company_name, profiles: driverInfo?.profiles },
                            facture.clients,
                            true
                          );
                          window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}&quote=${encodeURIComponent(message)}`, '_blank');
                        }}
                        className="gap-2 cursor-pointer"
                      >
                        <Facebook className="w-4 h-4" />
                        Facebook
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </Card>
          )})}
        </div>
      )}
    </div>
  );
};

export default DriverFacturesList;
