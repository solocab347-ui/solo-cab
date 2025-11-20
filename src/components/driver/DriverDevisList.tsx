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
        .order("created_at", { ascending: false });

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

  const handleDownloadPDF = (devis: any, forClient: boolean = false) => {
    if (!driverInfo) {
      toast.error("Informations chauffeur manquantes");
      return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header with blue background
    doc.setFillColor(59, 130, 246);
    doc.rect(0, 0, pageWidth, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('DEVIS', pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`N° ${devis.quote_number}`, pageWidth / 2, 30, { align: 'center' });
    
    // Driver info (left side)
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Émetteur:', 15, 55);
    doc.setFont('helvetica', 'normal');
    doc.text(driverInfo.profiles?.full_name || 'Chauffeur', 15, 62);
    if (driverInfo.company_name) doc.text(driverInfo.company_name, 15, 69);
    if (driverInfo.company_address) {
      const addressLines = doc.splitTextToSize(driverInfo.company_address, 80);
      doc.text(addressLines, 15, 76);
    }
    if (driverInfo.siret) doc.text(`SIRET: ${driverInfo.siret}`, 15, 90);
    if (driverInfo.profiles?.phone) doc.text(`Tél: ${driverInfo.profiles.phone}`, 15, 97);
    
    // Client info (right side)
    doc.setFont('helvetica', 'bold');
    doc.text('Client:', pageWidth - 95, 55);
    doc.setFont('helvetica', 'normal');
    doc.text(devis.clients.profiles.full_name, pageWidth - 95, 62);
    if (devis.clients.profiles.email) doc.text(devis.clients.profiles.email, pageWidth - 95, 69);
    if (devis.clients.profiles.phone) doc.text(devis.clients.profiles.phone, pageWidth - 95, 76);
    
    // Course details section
    let yPos = 115;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Détails de la course', 15, yPos);
    
    yPos += 10;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Départ: ${devis.courses.pickup_address}`, 15, yPos);
    yPos += 7;
    doc.text(`Arrivée: ${devis.courses.destination_address}`, 15, yPos);
    yPos += 7;
    doc.text(`Date: ${format(new Date(devis.courses.scheduled_date), "d MMMM yyyy 'à' HH:mm", { locale: fr })}`, 15, yPos);
    
    if (devis.courses.distance_km) {
      yPos += 7;
      doc.text(`Distance: ${parseFloat(devis.courses.distance_km).toFixed(2)} km`, 15, yPos);
    }
    
    if (devis.courses.duration_minutes) {
      yPos += 7;
      doc.text(`Durée estimée: ${devis.courses.duration_minutes} minutes`, 15, yPos);
    }
    
    // Price breakdown section
    yPos += 15;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Détail du prix', 15, yPos);
    
    yPos += 10;
    doc.setFontSize(10);

    if (!forClient) {
      // Driver version: show all pricing details
      doc.setFont('helvetica', 'normal');
      if (parseFloat(devis.base_price) > 0) {
        doc.text(`Forfait de base:`, 15, yPos);
        doc.text(`${parseFloat(devis.base_price).toFixed(2)} €`, pageWidth - 15, yPos, { align: 'right' });
        yPos += 7;
      }
      
      if (parseFloat(devis.distance_price) > 0) {
        doc.text(`Prix au kilomètre:`, 15, yPos);
        doc.text(`${parseFloat(devis.distance_price).toFixed(2)} €`, pageWidth - 15, yPos, { align: 'right' });
        yPos += 7;
      }
      
      if (parseFloat(devis.time_price || 0) > 0) {
        doc.text(`Prix horaire:`, 15, yPos);
        doc.text(`${parseFloat(devis.time_price).toFixed(2)} €`, pageWidth - 15, yPos, { align: 'right' });
        yPos += 7;
      }
    }
    
    // Subtotal, TVA, Total (for both versions)
    const subtotal = parseFloat(devis.base_price) + parseFloat(devis.distance_price) + parseFloat(devis.time_price || 0);
    const tvaAmount = parseFloat(devis.amount) - subtotal;
    
    doc.setFont('helvetica', 'normal');
    doc.text(`Sous-total HT:`, 15, yPos);
    doc.text(`${subtotal.toFixed(2)} €`, pageWidth - 15, yPos, { align: 'right' });
    yPos += 7;
    
    doc.text(`TVA:`, 15, yPos);
    doc.text(`${tvaAmount.toFixed(2)} €`, pageWidth - 15, yPos, { align: 'right' });
    yPos += 10;
    
    // Total line
    doc.setDrawColor(59, 130, 246);
    doc.setLineWidth(0.5);
    doc.line(15, yPos - 3, pageWidth - 15, yPos - 3);
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(`Total TTC:`, 15, yPos);
    doc.text(`${parseFloat(devis.amount).toFixed(2)} €`, pageWidth - 15, yPos, { align: 'right' });
    
    // Valid until
    yPos += 15;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 100, 100);
    doc.text(`Devis valable jusqu'au: ${format(new Date(devis.valid_until), "d MMMM yyyy", { locale: fr })}`, 15, yPos);
    
    // Footer
    doc.setFontSize(8);
    doc.text(`Généré le ${format(new Date(), "d MMMM yyyy 'à' HH:mm", { locale: fr })}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
    
    doc.save(`devis-${devis.quote_number}${forClient ? '-client' : ''}.pdf`);
    toast.success("Devis téléchargé");
  };

  const getStatusBadge = (status: string, validUntil: string) => {
    const isExpired = new Date(validUntil) < new Date();

    if (isExpired && status === "pending") {
      return (
        <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
          Expiré
        </Badge>
      );
    }

    const styles = {
      pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
      accepted: "bg-green-500/10 text-green-500 border-green-500/20",
      rejected: "bg-destructive/10 text-destructive border-destructive/20",
      expired: "bg-muted text-muted-foreground border-border",
    };

    const labels = {
      pending: "En attente",
      accepted: "Accepté",
      rejected: "Refusé",
      expired: "Expiré",
    };

    return (
      <Badge variant="outline" className={styles[status as keyof typeof styles]}>
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
      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-center">
            <h3 className="text-3xl font-bold text-premium">{stats.total}</h3>
            <p className="text-sm text-muted-foreground">Devis totaux</p>
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
            <h3 className="text-3xl font-bold text-green-500">{stats.accepted}</h3>
            <p className="text-sm text-muted-foreground">Acceptés</p>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-center">
            <h3 className="text-3xl font-bold text-destructive">{stats.rejected}</h3>
            <p className="text-sm text-muted-foreground">Refusés</p>
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

      {/* Devis List */}
      {filteredDevis.length === 0 ? (
        <Card className="p-8 text-center">
          <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2">Aucun devis</h3>
          <p className="text-muted-foreground">
            {searchTerm || statusFilter !== "all" || clientFilter !== "all" || dateFilter !== "all"
              ? "Aucun devis ne correspond à vos critères"
              : "Vos devis apparaîtront ici"}
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredDevis.map((devis) => (
            <Card key={devis.id} className="p-6 hover:shadow-elegant transition-all">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  {devis.clients?.profiles?.profile_photo_url ? (
                    <img
                      src={devis.clients.profiles.profile_photo_url}
                      alt={devis.clients.profiles.full_name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gradient-dark rounded-full flex items-center justify-center">
                      <FileText className="w-6 h-6 text-primary-foreground" />
                    </div>
                  )}
                  <div>
                    <h3 className="font-bold text-lg">{devis.quote_number}</h3>
                    <p className="text-sm text-muted-foreground">
                      {devis.clients?.profiles?.full_name}
                    </p>
                  </div>
                </div>
                {getStatusBadge(devis.status, devis.valid_until)}
              </div>

              {/* Course Details */}
              <div className="bg-secondary rounded-lg p-4 mb-4 space-y-2">
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-premium mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Départ</p>
                    <p className="text-muted-foreground">{devis.courses.pickup_address}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Arrivée</p>
                    <p className="text-muted-foreground">{devis.courses.destination_address}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  {format(new Date(devis.courses.scheduled_date), "d MMMM yyyy 'à' HH:mm", {
                    locale: fr,
                  })}
                </div>
              </div>

              {/* Price */}
              <div className="border border-border rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Euro className="w-5 h-5 text-premium" />
                    <span className="font-semibold">Montant TTC</span>
                  </div>
                  <span className="text-2xl font-bold text-premium">
                    {parseFloat(devis.amount).toFixed(2)} €
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                  Créé le {format(new Date(devis.created_at), "d MMMM yyyy", { locale: fr })}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadPDF(devis, false)}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    PDF Détaillé
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadPDF(devis, true)}
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

export default DriverDevisList;
