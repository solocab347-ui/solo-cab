import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FileText, Search, Download, MapPin, Calendar, Euro } from "lucide-react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { fr } from "date-fns/locale";
import jsPDF from "jspdf";

interface DriverDevisListProps {
  driverId: string;
}

const DriverDevisList = ({ driverId }: DriverDevisListProps) => {
  const [devisList, setDevisList] = useState<any[]>([]);
  const [filteredDevis, setFilteredDevis] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [clients, setClients] = useState<any[]>([]);
  const [driverInfo, setDriverInfo] = useState<any>(null);

  useEffect(() => {
    fetchDevis();
    fetchDriverInfo();
  }, [driverId]);

  useEffect(() => {
    let filtered = devisList;

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter((devis) => devis.status === statusFilter);
    }

    // Filter by client
    if (clientFilter !== "all") {
      filtered = filtered.filter((devis) => devis.client_id === clientFilter);
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

      filtered = filtered.filter((devis) => {
        const devisDate = new Date(devis.created_at);
        return devisDate >= startDate && devisDate <= endDate;
      });
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (devis) =>
          devis.quote_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          devis.clients?.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredDevis(filtered);
  }, [searchTerm, statusFilter, clientFilter, dateFilter, devisList]);

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

  const fetchDevis = async () => {
    try {
      const { data, error } = await supabase
        .from("devis")
        .select(`
          *,
          courses!inner(
            pickup_address,
            destination_address,
            scheduled_date,
            distance_km,
            duration_minutes
          ),
          clients!inner(
            id,
            profiles:user_id(full_name, email, phone, profile_photo_url)
          )
        `)
        .eq("driver_id", driverId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setDevisList(data || []);
      setFilteredDevis(data || []);

      // Extract unique clients for filter
      const uniqueClients = Array.from(
        new Map(
          data?.map((d) => [d.clients.id, { id: d.clients.id, name: d.clients.profiles.full_name }])
        ).values()
      );
      setClients(uniqueClients);
    } catch (error: any) {
      console.error("Error fetching devis:", error);
      toast.error("Erreur lors du chargement des devis");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async (devis: any, forClient: boolean = false) => {
    if (!driverInfo) {
      toast.error("Informations chauffeur manquantes");
      return;
    }

    const jsPDF = (await import("jspdf")).default;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    // Header with blue background
    doc.setFillColor(41, 128, 185);
    doc.rect(0, 0, pageWidth, 50, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(28);
    doc.text("DEVIS", pageWidth / 2, 25, { align: "center" });
    
    doc.setFontSize(10);
    doc.text(`Référence: ${devis.quote_number}`, pageWidth / 2, 35, { align: "center" });
    doc.text(`Date: ${format(new Date(devis.created_at), "dd/MM/yyyy", { locale: fr })}`, pageWidth / 2, 42, { align: "center" });

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
    
    const clientName = devis.clients?.profiles?.full_name || "N/A";
    doc.text(clientName, pageWidth - 20, 71, { align: 'right' });
    
    if (devis.clients?.profiles?.email) {
      doc.text(devis.clients.profiles.email, pageWidth - 20, 76, { align: 'right' });
    }
    
    if (devis.clients?.profiles?.phone) {
      doc.text(`Tél: ${devis.clients.profiles.phone}`, pageWidth - 20, 81, { align: 'right' });
    }

    // Service details box
    doc.setDrawColor(200, 200, 200);
    doc.rect(20, 110, 170, 55);
    
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text("DÉTAILS DE LA PRESTATION", 25, 118);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    
    const pickupLines = doc.splitTextToSize(devis.courses.pickup_address, 140);
    const destLines = doc.splitTextToSize(devis.courses.destination_address, 140);
    
    doc.text("Départ:", 25, 126);
    doc.text(pickupLines, 50, 126);
    
    let currentY = 126 + (pickupLines.length * 5);
    doc.text("Arrivée:", 25, currentY);
    doc.text(destLines, 50, currentY);
    
    currentY += (destLines.length * 5);
    doc.text(`Date: ${format(new Date(devis.courses.scheduled_date), "dd/MM/yyyy 'à' HH:mm", { locale: fr })}`, 25, currentY);
    doc.text(`Passagers: ${devis.courses.passengers_count}`, 25, currentY + 5);
    doc.text(`Distance: ${devis.courses.distance_km} km`, 105, currentY + 5);

    // Pricing table
    let yPos = 180;
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text("TARIFICATION", 20, yPos);
    yPos += 8;

    const subtotal = (devis.base_price || 0) + (devis.distance_price || 0) + (devis.time_price || 0);
    const tvaRate = devis.time_price > 0 ? 20 : 10;
    const tvaAmount = subtotal * (tvaRate / 100);
    
    // Déterminer le type de course
    const isMiseADisposition = devis.time_price > 0 && devis.distance_price === 0;

    if (!forClient) {
      // Driver version - detailed breakdown
      doc.setFillColor(41, 128, 185);
      doc.rect(20, yPos, 170, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.text("Description", 25, yPos + 5.5);
      doc.text("Montant HT", 175, yPos + 5.5, { align: 'right' });
      
      yPos += 8;
      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined, 'normal');
      
      if (isMiseADisposition) {
        // Mise à disposition - afficher durée et tarif horaire
        const hours = devis.courses.duration_minutes / 60;
        const hourlyRate = devis.time_price / hours;
        
        doc.setFillColor(245, 245, 245);
        doc.rect(20, yPos, 170, 7, 'F');
        doc.text(`Mise à disposition (${hours}h à ${hourlyRate.toFixed(2)}€/h)`, 25, yPos + 5);
        doc.text(`${devis.time_price.toFixed(2)} €`, 175, yPos + 5, { align: 'right' });
        
        yPos += 9;
      } else {
        // Course classique - afficher base + distance
        doc.setFillColor(245, 245, 245);
        doc.rect(20, yPos, 170, 7, 'F');
        doc.text("Forfait de base", 25, yPos + 5);
        doc.text(`${devis.base_price.toFixed(2)} €`, 175, yPos + 5, { align: 'right' });
        
        yPos += 7;
        doc.text("Prix au kilomètre", 25, yPos + 5);
        doc.text(`${devis.distance_price.toFixed(2)} €`, 175, yPos + 5, { align: 'right' });
        
        yPos += 9;
      }
      
      doc.setFillColor(240, 240, 240);
      doc.rect(20, yPos, 170, 7, 'F');
      doc.setFont(undefined, 'bold');
      doc.text("Sous-total HT", 25, yPos + 5);
      doc.text(`${subtotal.toFixed(2)} €`, 175, yPos + 5, { align: 'right' });
      
      yPos += 7;
      doc.setFont(undefined, 'normal');
      doc.text(`TVA (${tvaRate}%)`, 25, yPos + 5);
      doc.text(`${tvaAmount.toFixed(2)} €`, 175, yPos + 5, { align: 'right' });
      
      yPos += 9;
      doc.setFillColor(41, 128, 185);
      doc.rect(20, yPos, 170, 9, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont(undefined, 'bold');
      doc.setFontSize(11);
      doc.text("TOTAL TTC", 25, yPos + 6);
      doc.text(`${devis.amount.toFixed(2)} €`, 175, yPos + 6, { align: 'right' });
      
      yPos += 15;
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(8);
      doc.setFont(undefined, 'italic');
      const noteLines = doc.splitTextToSize("Note: Le client reçoit une version simplifiée sans le détail des tarifs.", 170);
      doc.text(noteLines, 20, yPos);
    } else {
      // Client version - simplified
      doc.setFillColor(41, 128, 185);
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
      doc.text(`${subtotal.toFixed(2)} €`, 175, yPos + 5, { align: 'right' });
      
      yPos += 7;
      doc.text(`TVA (${tvaRate}%)`, 25, yPos + 5);
      doc.text(`${tvaAmount.toFixed(2)} €`, 175, yPos + 5, { align: 'right' });
      
      yPos += 9;
      doc.setFillColor(41, 128, 185);
      doc.rect(20, yPos, 170, 9, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont(undefined, 'bold');
      doc.setFontSize(11);
      doc.text("TOTAL TTC", 25, yPos + 6);
      doc.text(`${devis.amount.toFixed(2)} €`, 175, yPos + 6, { align: 'right' });
    }

    // Validity
    yPos += 15;
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(8);
    doc.setFont(undefined, 'italic');
    doc.text(`Devis valable jusqu'au ${format(new Date(devis.valid_until), "dd/MM/yyyy", { locale: fr })}`, 20, yPos);

    // Footer
    const pageHeight = doc.internal.pageSize.height;
    doc.setFillColor(240, 240, 240);
    doc.rect(0, pageHeight - 15, pageWidth, 15, 'F');
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.text("Merci de votre confiance", pageWidth / 2, pageHeight - 8, { align: "center" });

    doc.save(`devis-${devis.quote_number}${forClient ? '-client' : ''}.pdf`);
    toast.success("Devis téléchargé");
  };

  const getStatusBadge = (status: string, validUntil: string) => {
    const isExpired = new Date(validUntil) < new Date();

    if (isExpired && status === "pending") {
      return (
        <Badge className="bg-destructive/90 text-white border-0 shadow-md">
          Expiré
        </Badge>
      );
    }

    const styles = {
      pending: "bg-gradient-trust text-white border-0 shadow-md",
      accepted: "bg-gradient-success text-white border-0 shadow-md",
      rejected: "bg-destructive/90 text-white border-0 shadow-md",
      expired: "bg-muted/90 text-white border-0 shadow-md",
    };

    const labels = {
      pending: "En attente",
      accepted: "Accepté",
      rejected: "Refusé",
      expired: "Expiré",
    };

    return (
      <Badge className={styles[status as keyof typeof styles]}>
        {labels[status as keyof typeof labels]}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Chargement des devis...</p>
      </div>
    );
  }

  const stats = {
    total: devisList.length,
    pending: devisList.filter((d) => d.status === "pending").length,
    accepted: devisList.filter((d) => d.status === "accepted").length,
    rejected: devisList.filter((d) => d.status === "rejected").length,
  };

  return (
    <div className="space-y-6">
      {/* Stats - Horizontal on all screens */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
        <Card className="p-3 sm:p-4 bg-gradient-premium border-0 shadow-elegant">
          <div className="text-center">
            <h3 className="text-xl sm:text-3xl font-bold text-white">{stats.total}</h3>
            <p className="text-xs sm:text-sm text-white/80">Devis totaux</p>
          </div>
        </Card>
        <Card className="p-3 sm:p-4 bg-gradient-trust border-0 shadow-elegant">
          <div className="text-center">
            <h3 className="text-xl sm:text-3xl font-bold text-white">{stats.pending}</h3>
            <p className="text-xs sm:text-sm text-white/80">En attente</p>
          </div>
        </Card>
        <Card className="p-3 sm:p-4 bg-gradient-success border-0 shadow-elegant">
          <div className="text-center">
            <h3 className="text-xl sm:text-3xl font-bold text-white">{stats.accepted}</h3>
            <p className="text-xs sm:text-sm text-white/80">Acceptés</p>
          </div>
        </Card>
        <Card className="p-3 sm:p-4 bg-gradient-independence border-0 shadow-elegant">
          <div className="text-center">
            <h3 className="text-xl sm:text-3xl font-bold text-white">{stats.rejected}</h3>
            <p className="text-xs sm:text-sm text-white/80">Refusés</p>
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
            <SelectItem value="pending">En attente</SelectItem>
            <SelectItem value="accepted">Acceptés</SelectItem>
            <SelectItem value="rejected">Refusés</SelectItem>
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

      {/* Devis List */}
      {filteredDevis.length === 0 ? (
        <Card className="p-8 text-center bg-gradient-trust border-0">
          <FileText className="w-16 h-16 text-white mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2 text-white">Aucun devis</h3>
          <p className="text-white">
            {searchTerm || statusFilter !== "all" || clientFilter !== "all" || dateFilter !== "all"
              ? "Aucun devis ne correspond à vos critères"
              : "Vos devis apparaîtront ici"}
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredDevis.map((devis, index) => {
            const gradients = ['bg-gradient-trust', 'bg-gradient-freedom', 'bg-gradient-renewal'];
            const gradient = gradients[index % 3];
            return (
            <Card key={devis.id} className={`p-6 hover:shadow-elegant transition-all ${gradient} border-0`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  {devis.clients?.profiles?.profile_photo_url ? (
                    <img
                      src={devis.clients.profiles.profile_photo_url}
                      alt={devis.clients.profiles.full_name}
                      className="w-12 h-12 rounded-full object-cover border-2 border-white/30"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white font-semibold border-2 border-white/30">
                      {devis.clients?.profiles?.full_name?.[0] || "?"}
                    </div>
                  )}
                  <div>
                    <h3 className="font-bold text-lg text-white">{devis.quote_number}</h3>
                    <p className="text-sm text-white/80">
                      {devis.clients?.profiles?.full_name}
                    </p>
                  </div>
                </div>
                {getStatusBadge(devis.status, devis.valid_until)}
              </div>

              {/* Course Details */}
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 mb-4 space-y-2 border border-white/20">
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-white mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-white">Départ</p>
                    <p className="text-white/80">{devis.courses.pickup_address}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-white mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-white">Arrivée</p>
                    <p className="text-white/80">{devis.courses.destination_address}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-white/80">
                  <Calendar className="w-4 h-4 text-white" />
                  {format(new Date(devis.courses.scheduled_date), "d MMMM yyyy 'à' HH:mm", {
                    locale: fr,
                  })}
                </div>
              </div>

              {/* Price */}
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Euro className="w-5 h-5 text-white" />
                    <span className="font-semibold text-white">Montant TTC</span>
                  </div>
                  <span className="text-2xl font-bold text-white">
                    {parseFloat(devis.amount).toFixed(2)} €
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between">
                <div className="text-xs text-white">
                  Créé le {format(new Date(devis.created_at), "d MMMM yyyy", { locale: fr })}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadPDF(devis, false)}
                    className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    PDF Détaillé
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadPDF(devis, true)}
                    className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    PDF Client
                  </Button>
                </div>
              </div>
            </Card>
          )})}
        </div>
      )}
    </div>
  );
};

export default DriverDevisList;
