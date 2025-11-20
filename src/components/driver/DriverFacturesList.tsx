import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FileText, Search, Download, Euro, CreditCard, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface DriverFacturesListProps {
  driverId: string;
}

const DriverFacturesList = ({ driverId }: DriverFacturesListProps) => {
  const [factures, setFactures] = useState<any[]>([]);
  const [filteredFactures, setFilteredFactures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetchFactures();
  }, [driverId]);

  useEffect(() => {
    let filtered = factures;

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter((facture) => facture.payment_status === statusFilter);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (facture) =>
          facture.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          facture.clients?.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredFactures(filtered);
  }, [searchTerm, statusFilter, factures]);

  const fetchFactures = async () => {
    try {
      const { data, error } = await supabase
        .from("factures")
        .select(`
          *,
          clients!inner(
            profiles:user_id(full_name, email, profile_photo_url)
          ),
          courses!inner(
            pickup_address,
            destination_address,
            scheduled_date
          )
        `)
        .eq("driver_id", driverId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setFactures(data || []);
      setFilteredFactures(data || []);
    } catch (error: any) {
      console.error("Error fetching factures:", error);
      toast.error("Erreur lors du chargement des factures");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = (factureId: string) => {
    toast.info("Génération PDF en cours de développement");
    // TODO: Implement PDF generation
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

  const getPaymentMethodIcon = (method: string | null) => {
    if (!method) return <CreditCard className="w-4 h-4" />;
    if (method.includes("card")) return <CreditCard className="w-4 h-4" />;
    return <CreditCard className="w-4 h-4" />;
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
    totalRevenue: factures
      .filter((f) => f.payment_status === "paid")
      .reduce((sum, f) => sum + parseFloat(f.amount), 0),
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
        <Card className="p-4 bg-gradient-premium">
          <div className="text-center">
            <h3 className="text-3xl font-bold text-premium-foreground">
              {stats.totalRevenue.toFixed(2)} €
            </h3>
            <p className="text-sm text-premium-foreground/80">Revenus encaissés</p>
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
          <SelectTrigger className="w-full md:w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="paid">Payées</SelectItem>
            <SelectItem value="pending">En attente</SelectItem>
            <SelectItem value="failed">Échec</SelectItem>
            <SelectItem value="refunded">Remboursées</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Factures List */}
      {filteredFactures.length === 0 ? (
        <Card className="p-8 text-center">
          <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2">Aucune facture</h3>
          <p className="text-muted-foreground">
            {searchTerm || statusFilter !== "all"
              ? "Aucune facture ne correspond à vos critères"
              : "Vos factures apparaîtront ici après paiement des devis"}
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
                    <h3 className="font-bold text-lg">{facture.invoice_number}</h3>
                    <p className="text-sm text-muted-foreground">
                      Client : {facture.clients?.profiles?.full_name}
                    </p>
                  </div>
                </div>
                {getStatusBadge(facture.payment_status)}
              </div>

              {/* Course Info */}
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
              </div>

              {/* Payment Info */}
              <div className="border border-border rounded-lg p-4 mb-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Montant TTC</span>
                    <span className="text-2xl font-bold text-premium">
                      {parseFloat(facture.amount).toFixed(2)} €
                    </span>
                  </div>
                  {facture.payment_method && (
                    <div className="flex justify-between items-center text-muted-foreground">
                      <span>Méthode de paiement</span>
                      <div className="flex items-center gap-2">
                        {getPaymentMethodIcon(facture.payment_method)}
                        <span className="capitalize">{facture.payment_method}</span>
                      </div>
                    </div>
                  )}
                  {facture.paid_at && (
                    <div className="flex justify-between items-center text-muted-foreground">
                      <span>Date de paiement</span>
                      <span>
                        {format(new Date(facture.paid_at), "d MMMM yyyy 'à' HH:mm", {
                          locale: fr,
                        })}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                  Créée le {format(new Date(facture.created_at), "d MMMM yyyy", { locale: fr })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownloadPDF(facture.id)}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Télécharger PDF
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default DriverFacturesList;
