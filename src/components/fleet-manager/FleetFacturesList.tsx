import { useEffect, useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FileText, Download, MapPin, Calendar, Euro, User, Car, Loader2, CreditCard } from "lucide-react";
import { format, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import { AdvancedFilters } from "./AdvancedFilters";

interface FleetFacturesListProps {
  fleetManagerId: string;
}

const FACTURE_STATUSES = [
  { value: "pending", label: "En attente" },
  { value: "paid", label: "Payée" },
  { value: "overdue", label: "En retard" },
];

const FleetFacturesList = ({ fleetManagerId }: FleetFacturesListProps) => {
  const [facturesList, setFacturesList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [drivers, setDrivers] = useState<{ id: string; name: string }[]>([]);
  const [fleetInfo, setFleetInfo] = useState<any>(null);

  // Filtres avancés
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedDrivers, setSelectedDrivers] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<{ from: Date | null; to: Date | null }>({ from: null, to: null });

  useEffect(() => {
    fetchFactures();
    fetchFleetInfo();
  }, [fleetManagerId]);

  // Filtrage avec useMemo
  const filteredFactures = useMemo(() => {
    let filtered = facturesList;

    if (selectedStatuses.length > 0) {
      filtered = filtered.filter((facture) => selectedStatuses.includes(facture.payment_status));
    }

    if (selectedDrivers.length > 0) {
      filtered = filtered.filter((facture) => selectedDrivers.includes(facture.driver_id));
    }

    if (dateRange.from) {
      filtered = filtered.filter((facture) => {
        const factureDate = new Date(facture.created_at);
        if (dateRange.to) {
          return isWithinInterval(factureDate, { 
            start: startOfDay(dateRange.from!), 
            end: endOfDay(dateRange.to) 
          });
        }
        return factureDate >= startOfDay(dateRange.from!);
      });
    }

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (facture) =>
          facture.invoice_number?.toLowerCase().includes(searchLower) ||
          facture.invoice_number_generated?.toLowerCase().includes(searchLower) ||
          facture.clientProfile?.full_name?.toLowerCase().includes(searchLower) ||
          facture.driverProfile?.full_name?.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  }, [searchTerm, selectedStatuses, selectedDrivers, dateRange, facturesList]);

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

  const fetchFactures = async () => {
    try {
      // First get fleet drivers
      const { data: fleetDrivers } = await supabase
        .from("fleet_manager_drivers")
        .select("driver_id")
        .eq("fleet_manager_id", fleetManagerId)
        .eq("status", "active");

      if (!fleetDrivers || fleetDrivers.length === 0) {
        setFacturesList([]);
        setLoading(false);
        return;
      }

      const driverIds = fleetDrivers.map(d => d.driver_id);

      // Fetch factures for all fleet drivers
      const { data, error } = await supabase
        .from("factures")
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

      // Fetch profiles
      if (data && data.length > 0) {
        const clientUserIds = data.filter(f => f.clients).map(f => f.clients.user_id);
        const driverUserIds = data.filter(f => f.drivers).map(f => f.drivers.user_id);
        const allUserIds = [...new Set([...clientUserIds, ...driverUserIds])];

        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, email, phone, profile_photo_url")
          .in("id", allUserIds);

        const facturesWithProfiles = data.map(f => ({
          ...f,
          clientProfile: profiles?.find(p => p.id === f.clients?.user_id),
          driverProfile: profiles?.find(p => p.id === f.drivers?.user_id)
        }));

        setFacturesList(facturesWithProfiles);

        // Extract unique drivers
        const uniqueDrivers = Array.from(
          new Map(
            facturesWithProfiles.map((f) => [f.driver_id, { 
              id: f.driver_id, 
              name: f.driverProfile?.full_name || f.drivers?.company_name || "Chauffeur"
            }])
          ).values()
        );
        setDrivers(uniqueDrivers);
      } else {
        setFacturesList([]);
      }
    } catch (error: any) {
      console.error("Error fetching factures:", error);
      toast.error("Erreur lors du chargement des factures");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async (facture: any) => {
    const jsPDF = (await import("jspdf")).default;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    const headerColor: [number, number, number] = [46, 204, 113];

    doc.setFillColor(headerColor[0], headerColor[1], headerColor[2]);
    doc.rect(0, 0, pageWidth, 50, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(28);
    doc.text("FACTURE", pageWidth / 2, 25, { align: "center" });
    
    doc.setFontSize(10);
    doc.text(`N°: ${facture.invoice_number_generated || facture.invoice_number}`, pageWidth / 2, 35, { align: "center" });
    doc.text(`Date: ${format(new Date(facture.created_at), "dd/MM/yyyy", { locale: fr })}`, pageWidth / 2, 42, { align: "center" });

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
    doc.text(facture.driverProfile?.full_name || facture.drivers?.company_name || "N/A", 20, 91);
    doc.text(`${facture.drivers?.vehicle_brand || ""} ${facture.drivers?.vehicle_model || ""}`, 20, 96);

    // Client info
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text("CLIENT", pageWidth - 20, 65, { align: 'right' });
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    doc.text(facture.clientProfile?.full_name || "N/A", pageWidth - 20, 71, { align: 'right' });
    if (facture.clientProfile?.email) {
      doc.text(facture.clientProfile.email, pageWidth - 20, 76, { align: 'right' });
    }

    // Course details
    doc.setDrawColor(200, 200, 200);
    doc.rect(20, 110, 170, 50);
    
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text("DÉTAILS DE LA PRESTATION", 25, 118);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    
    const pickupLines = doc.splitTextToSize(facture.courses?.pickup_address || "N/A", 140);
    const destLines = doc.splitTextToSize(facture.courses?.destination_address || "N/A", 140);
    
    doc.text("Départ:", 25, 126);
    doc.text(pickupLines, 50, 126);
    
    let currentY = 126 + (pickupLines.length * 5);
    doc.text("Arrivée:", 25, currentY);
    doc.text(destLines, 50, currentY);
    
    currentY += (destLines.length * 5);
    if (facture.courses?.scheduled_date) {
      doc.text(`Date: ${format(new Date(facture.courses.scheduled_date), "dd/MM/yyyy 'à' HH:mm", { locale: fr })}`, 25, currentY);
    }

    // Payment info
    let yPos = 170;
    doc.text(`Mode de paiement: ${facture.payment_method || 'N/A'}`, 20, yPos);

    // Total
    yPos += 10;
    doc.setFillColor(headerColor[0], headerColor[1], headerColor[2]);
    doc.rect(20, yPos, 170, 12, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont(undefined, 'bold');
    doc.setFontSize(12);
    doc.text("TOTAL TTC", 25, yPos + 8);
    doc.text(`${facture.amount?.toFixed(2) || "0.00"} €`, 175, yPos + 8, { align: 'right' });

    doc.save(`facture-${facture.invoice_number_generated || facture.invoice_number}.pdf`);
    toast.success("Facture téléchargée");
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-warning/20 text-warning border-warning/30",
      paid: "bg-success/20 text-success border-success/30",
      overdue: "bg-destructive/20 text-destructive border-destructive/30",
    };

    const labels: Record<string, string> = {
      pending: "En attente",
      paid: "Payée",
      overdue: "En retard",
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
    total: facturesList.length,
    pending: facturesList.filter((f) => f.payment_status === "pending").length,
    paid: facturesList.filter((f) => f.payment_status === "paid").length,
    totalAmount: facturesList.reduce((sum, f) => sum + (f.amount || 0), 0),
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
            <h3 className="text-2xl font-bold">{stats.paid}</h3>
            <p className="text-xs text-muted-foreground">Payées</p>
          </div>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-accent/20 to-accent/5 border-accent/20">
          <div className="text-center">
            <h3 className="text-2xl font-bold">{stats.totalAmount.toFixed(2)}€</h3>
            <p className="text-xs text-muted-foreground">Montant total</p>
          </div>
        </Card>
      </div>

      {/* Filtres avancés */}
      <AdvancedFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        selectedStatuses={selectedStatuses}
        onStatusChange={setSelectedStatuses}
        availableStatuses={FACTURE_STATUSES}
        selectedDrivers={selectedDrivers}
        onDriversChange={setSelectedDrivers}
        drivers={drivers}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        onReset={resetFilters}
      />

      {/* Factures List */}
      {filteredFactures.length === 0 ? (
        <Card className="p-12 text-center">
          <CreditCard className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
          <p className="text-muted-foreground">Aucune facture trouvée</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredFactures.map((facture) => (
            <Card key={facture.id} className="p-4 hover:border-primary/30 transition-all">
              <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                {/* Info principale */}
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-mono text-sm font-semibold text-primary">
                      {facture.invoice_number_generated || facture.invoice_number}
                    </span>
                    {getStatusBadge(facture.payment_status)}
                    <span className="text-lg font-bold text-success">
                      {facture.amount?.toFixed(2)} €
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {facture.clientProfile?.full_name || "Client"}
                    </div>
                    <div className="flex items-center gap-1">
                      <Car className="h-3 w-3" />
                      {facture.driverProfile?.full_name || "Chauffeur"}
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(facture.created_at), "dd/MM/yyyy", { locale: fr })}
                    </div>
                    {facture.payment_method && (
                      <div className="flex items-center gap-1">
                        <CreditCard className="h-3 w-3" />
                        {facture.payment_method}
                      </div>
                    )}
                  </div>

                  {facture.courses && (
                    <div className="text-sm space-y-1">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3 w-3 text-success" />
                        <span className="truncate">{facture.courses.pickup_address}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3 w-3 text-destructive" />
                        <span className="truncate">{facture.courses.destination_address}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDownloadPDF(facture)}
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

export default FleetFacturesList;
