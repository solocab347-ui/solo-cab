import { useEffect, useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FileText, Download, MapPin, Calendar, Euro, User, Car, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { format, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import { AdvancedFilters } from "./AdvancedFilters";

interface FleetDevisListProps {
  fleetManagerId: string;
}

const DEVIS_STATUSES = [
  { value: "pending", label: "En attente" },
  { value: "accepted", label: "Accepté" },
  { value: "rejected", label: "Refusé" },
];

const FleetDevisList = ({ fleetManagerId }: FleetDevisListProps) => {
  const [devisList, setDevisList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [drivers, setDrivers] = useState<{ id: string; name: string }[]>([]);
  const [fleetInfo, setFleetInfo] = useState<any>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Filtres avancés
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedDrivers, setSelectedDrivers] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<{ from: Date | null; to: Date | null }>({ from: null, to: null });

  useEffect(() => {
    fetchDevis();
    fetchFleetInfo();
  }, [fleetManagerId]);

  // Filtrage avec useMemo pour performance
  const filteredDevis = useMemo(() => {
    let filtered = devisList;

    // Filtre par statuts (multi-sélection)
    if (selectedStatuses.length > 0) {
      filtered = filtered.filter((devis) => selectedStatuses.includes(devis.status));
    }

    // Filtre par chauffeurs (multi-sélection)
    if (selectedDrivers.length > 0) {
      filtered = filtered.filter((devis) => selectedDrivers.includes(devis.driver_id));
    }

    // Filtre par période
    if (dateRange.from) {
      filtered = filtered.filter((devis) => {
        const devisDate = new Date(devis.created_at);
        if (dateRange.to) {
          return isWithinInterval(devisDate, { 
            start: startOfDay(dateRange.from!), 
            end: endOfDay(dateRange.to) 
          });
        }
        return devisDate >= startOfDay(dateRange.from!);
      });
    }

    // Recherche textuelle
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (devis) =>
          devis.quote_number?.toLowerCase().includes(searchLower) ||
          devis.clientProfile?.full_name?.toLowerCase().includes(searchLower) ||
          devis.driverProfile?.full_name?.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  }, [searchTerm, selectedStatuses, selectedDrivers, dateRange, devisList]);

  const resetFilters = () => {
    setSearchTerm("");
    setSelectedStatuses([]);
    setSelectedDrivers([]);
    setDateRange({ from: null, to: null });
  };

  const fetchFleetInfo = async () => {
    try {
      const { data } = await supabase
        .from("fleet_managers")
        .select("*")
        .eq("id", fleetManagerId)
        .single();
      
      setFleetInfo(data);
    } catch (error) {
      console.error("Error fetching fleet info:", error);
    }
  };

  const fetchDevis = async () => {
    try {
      // First get fleet drivers
      const { data: fleetDrivers } = await supabase
        .from("fleet_manager_drivers")
        .select("driver_id")
        .eq("fleet_manager_id", fleetManagerId)
        .eq("status", "active");

      if (!fleetDrivers || fleetDrivers.length === 0) {
        setDevisList([]);
        setLoading(false);
        return;
      }

      const driverIds = fleetDrivers.map(d => d.driver_id);

      // Fetch devis for all fleet drivers
      const { data, error } = await supabase
        .from("devis")
        .select(`
          *,
          courses(
            pickup_address,
            destination_address,
            scheduled_date,
            distance_km,
            duration_minutes,
            passengers_count
          ),
          clients(id, user_id),
          drivers(id, user_id, company_name, vehicle_brand, vehicle_model)
        `)
        .in("driver_id", driverIds)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch profiles for clients and drivers
      if (data && data.length > 0) {
        const clientUserIds = data.filter(d => d.clients).map(d => d.clients.user_id);
        const driverUserIds = data.filter(d => d.drivers).map(d => d.drivers.user_id);
        const allUserIds = [...new Set([...clientUserIds, ...driverUserIds])];

        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, email, phone, profile_photo_url")
          .in("id", allUserIds);

        const devisWithProfiles = data.map(d => ({
          ...d,
          clientProfile: profiles?.find(p => p.id === d.clients?.user_id),
          driverProfile: profiles?.find(p => p.id === d.drivers?.user_id)
        }));

        setDevisList(devisWithProfiles);

        // Extract unique drivers
        const uniqueDrivers = Array.from(
          new Map(
            devisWithProfiles.map((d) => [d.driver_id, { 
              id: d.driver_id, 
              name: d.driverProfile?.full_name || d.drivers?.company_name || "Chauffeur"
            }])
          ).values()
        );
        setDrivers(uniqueDrivers);
      } else {
        setDevisList([]);
      }
    } catch (error: any) {
      console.error("Error fetching devis:", error);
      toast.error("Erreur lors du chargement des devis");
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptDevis = async (devis: any) => {
    setProcessingId(devis.id);
    try {
      const { error } = await supabase
        .from("devis")
        .update({ 
          status: "accepted",
          accepted_at: new Date().toISOString()
        })
        .eq("id", devis.id);

      if (error) throw error;

      // Update course status
      await supabase
        .from("courses")
        .update({ status: "accepted" })
        .eq("id", devis.course_id);

      // Notify client
      if (devis.clients?.user_id) {
        await supabase.from("notifications").insert({
          user_id: devis.clients.user_id,
          title: "Devis accepté",
          message: `Votre devis ${devis.quote_number} a été accepté`,
          type: "success"
        });
      }

      toast.success("Devis accepté");
      fetchDevis();
    } catch (error) {
      console.error("Error accepting devis:", error);
      toast.error("Erreur lors de l'acceptation");
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectDevis = async (devis: any) => {
    setProcessingId(devis.id);
    try {
      const { error } = await supabase
        .from("devis")
        .update({ status: "rejected" })
        .eq("id", devis.id);

      if (error) throw error;

      // Update course status
      await supabase
        .from("courses")
        .update({ status: "cancelled" })
        .eq("id", devis.course_id);

      toast.success("Devis refusé");
      fetchDevis();
    } catch (error) {
      console.error("Error rejecting devis:", error);
      toast.error("Erreur lors du refus");
    } finally {
      setProcessingId(null);
    }
  };

  const handleDownloadPDF = async (devis: any) => {
    const jsPDF = (await import("jspdf")).default;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    doc.setFillColor(41, 128, 185);
    doc.rect(0, 0, pageWidth, 50, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(28);
    doc.text("DEVIS", pageWidth / 2, 25, { align: "center" });
    
    doc.setFontSize(10);
    doc.text(`Référence: ${devis.quote_number}`, pageWidth / 2, 35, { align: "center" });
    doc.text(`Date: ${format(new Date(devis.created_at), "dd/MM/yyyy", { locale: fr })}`, pageWidth / 2, 42, { align: "center" });

    // Fleet info
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text("GESTIONNAIRE DE FLOTTE", 20, 65);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    doc.text(fleetInfo?.company_name || "N/A", 20, 71);
    let fleetInfoY = 76;
    if (fleetInfo?.siret) {
      doc.text(`SIRET: ${fleetInfo.siret}`, 20, fleetInfoY);
      fleetInfoY += 5;
    } else if (fleetInfo?.siren) {
      doc.text(`SIREN: ${fleetInfo.siren}`, 20, fleetInfoY);
      fleetInfoY += 5;
    }
    if (fleetInfo?.tva_number) {
      doc.text(`TVA: ${fleetInfo.tva_number}`, 20, fleetInfoY);
    }

    // Driver info
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text("CHAUFFEUR", 20, 85);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    doc.text(devis.driverProfile?.full_name || devis.drivers?.company_name || "N/A", 20, 91);
    doc.text(`${devis.drivers?.vehicle_brand || ""} ${devis.drivers?.vehicle_model || ""}`, 20, 96);

    // Client info
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text("CLIENT", pageWidth - 20, 65, { align: 'right' });
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    doc.text(devis.clientProfile?.full_name || "N/A", pageWidth - 20, 71, { align: 'right' });
    if (devis.clientProfile?.email) {
      doc.text(devis.clientProfile.email, pageWidth - 20, 76, { align: 'right' });
    }

    // Course details
    doc.setDrawColor(200, 200, 200);
    doc.rect(20, 110, 170, 50);
    
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text("DÉTAILS DE LA PRESTATION", 25, 118);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    
    const pickupLines = doc.splitTextToSize(devis.courses?.pickup_address || "N/A", 140);
    const destLines = doc.splitTextToSize(devis.courses?.destination_address || "N/A", 140);
    
    doc.text("Départ:", 25, 126);
    doc.text(pickupLines, 50, 126);
    
    let currentY = 126 + (pickupLines.length * 5);
    doc.text("Arrivée:", 25, currentY);
    doc.text(destLines, 50, currentY);
    
    currentY += (destLines.length * 5);
    if (devis.courses?.scheduled_date) {
      doc.text(`Date: ${format(new Date(devis.courses.scheduled_date), "dd/MM/yyyy 'à' HH:mm", { locale: fr })}`, 25, currentY);
    }

    // Total
    let yPos = 175;
    doc.setFillColor(41, 128, 185);
    doc.rect(20, yPos, 170, 12, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont(undefined, 'bold');
    doc.setFontSize(12);
    doc.text("TOTAL TTC", 25, yPos + 8);
    doc.text(`${devis.amount?.toFixed(2) || "0.00"} €`, 175, yPos + 8, { align: 'right' });

    // Validity
    yPos += 20;
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(8);
    doc.setFont(undefined, 'italic');
    doc.text(`Devis valable jusqu'au ${format(new Date(devis.valid_until), "dd/MM/yyyy", { locale: fr })}`, 20, yPos);

    doc.save(`devis-${devis.quote_number}.pdf`);
    toast.success("Devis téléchargé");
  };

  const getStatusBadge = (status: string, validUntil: string) => {
    const isExpired = new Date(validUntil) < new Date();

    if (isExpired && status === "pending") {
      return <Badge variant="destructive">Expiré</Badge>;
    }

    const styles: Record<string, string> = {
      pending: "bg-warning/20 text-warning border-warning/30",
      accepted: "bg-success/20 text-success border-success/30",
      rejected: "bg-destructive/20 text-destructive border-destructive/30",
    };

    const labels: Record<string, string> = {
      pending: "En attente",
      accepted: "Accepté",
      rejected: "Refusé",
    };

    return (
      <Badge variant="outline" className={styles[status] || ""}>
        {labels[status] || status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4 bg-gradient-to-br from-primary/20 to-primary/5 border-primary/20">
          <div className="text-center">
            <h3 className="text-2xl font-bold">{stats.total}</h3>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-warning/20 to-warning/5 border-warning/20">
          <div className="text-center">
            <h3 className="text-2xl font-bold">{stats.pending}</h3>
            <p className="text-xs text-muted-foreground">En attente</p>
          </div>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-success/20 to-success/5 border-success/20">
          <div className="text-center">
            <h3 className="text-2xl font-bold">{stats.accepted}</h3>
            <p className="text-xs text-muted-foreground">Acceptés</p>
          </div>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-destructive/20 to-destructive/5 border-destructive/20">
          <div className="text-center">
            <h3 className="text-2xl font-bold">{stats.rejected}</h3>
            <p className="text-xs text-muted-foreground">Refusés</p>
          </div>
        </Card>
      </div>

      {/* Filtres avancés */}
      <AdvancedFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        selectedStatuses={selectedStatuses}
        onStatusChange={setSelectedStatuses}
        availableStatuses={DEVIS_STATUSES}
        selectedDrivers={selectedDrivers}
        onDriversChange={setSelectedDrivers}
        drivers={drivers}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        onReset={resetFilters}
      />

      {/* Devis List */}
      {filteredDevis.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
          <p className="text-muted-foreground">Aucun devis trouvé</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredDevis.map((devis) => (
            <Card key={devis.id} className="p-4 hover:border-primary/30 transition-all">
              <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                {/* Info principale */}
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-mono text-sm font-semibold text-primary">
                      {devis.quote_number}
                    </span>
                    {getStatusBadge(devis.status, devis.valid_until)}
                    <span className="text-lg font-bold text-success">
                      {devis.amount?.toFixed(2)} €
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {devis.clientProfile?.full_name || "Client"}
                    </div>
                    <div className="flex items-center gap-1">
                      <Car className="h-3 w-3" />
                      {devis.driverProfile?.full_name || "Chauffeur"}
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(devis.created_at), "dd/MM/yyyy", { locale: fr })}
                    </div>
                  </div>

                  {devis.courses && (
                    <div className="text-sm space-y-1">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3 w-3 text-success" />
                        <span className="truncate">{devis.courses.pickup_address}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3 w-3 text-destructive" />
                        <span className="truncate">{devis.courses.destination_address}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-wrap">
                  {devis.status === "pending" && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => handleAcceptDevis(devis)}
                        disabled={processingId === devis.id}
                        className="bg-success hover:bg-success/90"
                      >
                        {processingId === devis.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Accepter
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleRejectDevis(devis)}
                        disabled={processingId === devis.id}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Refuser
                      </Button>
                    </>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDownloadPDF(devis)}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    PDF
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

export default FleetDevisList;
