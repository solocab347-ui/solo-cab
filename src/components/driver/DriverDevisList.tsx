import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FileText, Search, Download, Euro, MapPin, Calendar, MessageCircle, Mail, Share2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface DriverDevisListProps {
  driverId: string;
}

const DriverDevisList = ({ driverId }: DriverDevisListProps) => {
  const [devisList, setDevisList] = useState<any[]>([]);
  const [rejectedDevis, setRejectedDevis] = useState<any[]>([]);
  const [filteredDevis, setFilteredDevis] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetchDevis();
    setupRealtimeSubscription();
  }, [driverId]);

  useEffect(() => {
    let filtered = devisList;

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter((devis) => devis.status === statusFilter);
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
  }, [searchTerm, statusFilter, devisList]);

  const fetchDevis = async () => {
    try {
      // Fetch all devis except rejected ones
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
            profiles:user_id(full_name, email, profile_photo_url)
          )
        `)
        .eq("driver_id", driverId)
        .neq("status", "rejected")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDevisList(data || []);
      setFilteredDevis(data || []);

      // Fetch last 10 rejected devis separately
      const { data: rejectedData, error: rejectedError } = await supabase
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
            profiles:user_id(full_name, email, profile_photo_url)
          )
        `)
        .eq("driver_id", driverId)
        .eq("status", "rejected")
        .order("updated_at", { ascending: false })
        .limit(10);

      if (rejectedError) throw rejectedError;
      setRejectedDevis(rejectedData || []);

      // Delete rejected devis beyond the 10 most recent
      if (rejectedData && rejectedData.length >= 10) {
        const oldestKeptDate = rejectedData[9].updated_at;
        await supabase
          .from("devis")
          .delete()
          .eq("driver_id", driverId)
          .eq("status", "rejected")
          .lt("updated_at", oldestKeptDate);
      }
    } catch (error: any) {
      console.error("Error fetching devis:", error);
      toast.error("Erreur lors du chargement des devis");
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel("driver-devis-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "devis",
          filter: `driver_id=eq.${driverId}`,
        },
        () => fetchDevis()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleDownloadPDF = (devisId: string) => {
    toast.info("Génération PDF en cours de développement");
    // TODO: Implement PDF generation
  };

  const handleShareDevis = (devis: any, method: 'whatsapp' | 'sms' | 'email' | 'facebook') => {
    const message = `Devis ${devis.quote_number} - ${devis.clients?.profiles?.full_name}\n` +
                   `Trajet: ${devis.courses.pickup_address} → ${devis.courses.destination_address}\n` +
                   `Date: ${format(new Date(devis.courses.scheduled_date), "d MMMM yyyy 'à' HH:mm", { locale: fr })}\n` +
                   `Montant: ${parseFloat(devis.amount).toFixed(2)}€`;

    const encodedMessage = encodeURIComponent(message);

    switch (method) {
      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
        break;
      case 'sms':
        window.open(`sms:?body=${encodedMessage}`, '_blank');
        break;
      case 'email':
        window.open(`mailto:?subject=Devis ${devis.quote_number}&body=${encodedMessage}`, '_blank');
        break;
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.origin)}&quote=${encodedMessage}`, '_blank');
        break;
    }
    toast.success("Partage ouvert");
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
      pending: "En attente client",
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
    totalAmount: devisList
      .filter((d) => d.status === "accepted")
      .reduce((sum, d) => sum + parseFloat(d.amount), 0),
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

      {/* Rejected Devis Section (max 10) */}
      {rejectedDevis.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Courses refusées</h2>
            <Badge variant="outline" className="bg-destructive/10 text-destructive">
              {rejectedDevis.length} / 10
            </Badge>
          </div>
          <div className="space-y-4">
            {rejectedDevis.map((devis) => (
              <Card key={devis.id} className="p-6 border-destructive/20 bg-destructive/5">
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
                        Client : {devis.clients?.profiles?.full_name}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
                    Refusé
                  </Badge>
                </div>

                {/* Rejection reason */}
                {devis.notes && (
                  <div className="bg-background/50 border border-destructive/20 rounded-lg p-4 mb-4">
                    <p className="text-sm font-medium text-destructive mb-2">Raison du refus :</p>
                    <p className="text-sm text-foreground">{devis.notes}</p>
                  </div>
                )}

                {/* Course Details */}
                <div className="bg-secondary rounded-lg p-4 space-y-2">
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

                <div className="mt-4 text-xs text-muted-foreground">
                  Refusé le {format(new Date(devis.updated_at), "d MMMM yyyy", { locale: fr })}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Regular Devis List */}
        </Card>
        <Card className="p-4">
          <div className="text-center">
            <h3 className="text-3xl font-bold text-green-500">{stats.accepted}</h3>
            <p className="text-sm text-muted-foreground">Acceptés</p>
          </div>
        </Card>
        <Card className="p-4 bg-gradient-premium">
          <div className="text-center">
            <h3 className="text-3xl font-bold text-premium-foreground">
              {stats.totalAmount.toFixed(2)} €
            </h3>
            <p className="text-sm text-premium-foreground/80">CA Devis acceptés</p>
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
            <SelectItem value="pending">En attente</SelectItem>
            <SelectItem value="accepted">Acceptés</SelectItem>
            <SelectItem value="rejected">Refusés</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Devis List */}
      {filteredDevis.length === 0 ? (
        <Card className="p-8 text-center">
          <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2">Aucun devis</h3>
          <p className="text-muted-foreground">
            {searchTerm || statusFilter !== "all"
              ? "Aucun devis ne correspond à vos critères"
              : "Vos devis apparaîtront ici après acceptation de courses"}
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
                      Client : {devis.clients?.profiles?.full_name}
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

              {/* Price Breakdown */}
              <div className="border border-border rounded-lg p-4 mb-4">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Euro className="w-4 h-4" />
                  Détail du prix
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Forfait de base</span>
                    <span className="font-medium">{parseFloat(devis.base_price).toFixed(2)} €</span>
                  </div>
                  {parseFloat(devis.distance_price) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Prix au kilomètre</span>
                      <span className="font-medium">
                        {parseFloat(devis.distance_price).toFixed(2)} €
                      </span>
                    </div>
                  )}
                  {parseFloat(devis.time_price || 0) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Prix horaire</span>
                      <span className="font-medium">{parseFloat(devis.time_price).toFixed(2)} €</span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-border flex justify-between text-lg font-bold">
                    <span>Total TTC</span>
                    <span className="text-premium">{parseFloat(devis.amount).toFixed(2)} €</span>
                  </div>
                </div>
              </div>

              {/* Rejection reason */}
              {devis.status === "rejected" && devis.notes && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 mb-4">
                  <p className="text-sm font-medium text-destructive mb-1">Raison du refus :</p>
                  <p className="text-sm text-muted-foreground">{devis.notes}</p>
                </div>
              )}

              {/* Boutons de partage */}
              {(devis.status === "pending" || devis.status === "accepted") && (
                <div className="flex gap-2 mb-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleShareDevis(devis, 'whatsapp')}
                    className="flex-1"
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    WhatsApp
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleShareDevis(devis, 'email')}
                    className="flex-1"
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Email
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleShareDevis(devis, 'sms')}
                    className="flex-1"
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    SMS
                  </Button>
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  Créé le {format(new Date(devis.created_at), "d MMMM yyyy", { locale: fr })}
                  {" • "}
                  Valide jusqu'au {format(new Date(devis.valid_until), "d MMMM yyyy", { locale: fr })}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownloadPDF(devis.id)}
                >
                  <Download className="w-4 h-4 mr-2" />
                  PDF
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default DriverDevisList;
