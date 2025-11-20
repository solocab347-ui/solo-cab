import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Crown, Users, Search, MessageSquare, Trash2, AlertTriangle, Plus, Filter } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface DriverClientsListProps {
  driverId: string;
}

const DriverClientsList = ({ driverId }: DriverClientsListProps) => {
  const navigate = useNavigate();
  const [clients, setClients] = useState<any[]>([]);
  const [filteredClients, setFilteredClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [clientTypeFilter, setClientTypeFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState("");
  const [deleteClientId, setDeleteClientId] = useState<string | null>(null);
  const [deleteClientData, setDeleteClientData] = useState<any>(null);

  useEffect(() => {
    fetchClients();
  }, [driverId]);

  useEffect(() => {
    let filtered = clients.filter((client) =>
      client.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Filtre par type de client
    if (clientTypeFilter === "exclusive") {
      filtered = filtered.filter((client) => client.is_exclusive);
    } else if (clientTypeFilter === "free") {
      filtered = filtered.filter((client) => !client.is_exclusive);
    }

    // Filtre par date
    if (dateFilter) {
      const filterDate = new Date(dateFilter);
      filtered = filtered.filter((client) => {
        const clientDate = new Date(client.created_at);
        return clientDate.toDateString() === filterDate.toDateString();
      });
    }

    setFilteredClients(filtered);
  }, [searchTerm, clientTypeFilter, dateFilter, clients]);

  const fetchClients = async () => {
    try {
      // Dual association query
      const { data, error } = await supabase
        .from("clients")
        .select(`
          *,
          profiles:user_id(full_name, email, phone, profile_photo_url)
        `)
        .or(`driver_id.eq.${driverId},driver_ids.cs.{${driverId}}`)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Get courses count for each client
      const clientsWithCourses = await Promise.all(
        (data || []).map(async (client) => {
          const { count } = await supabase
            .from("courses")
            .select("*", { count: "exact", head: true })
            .eq("client_id", client.id)
            .or(`driver_id.eq.${driverId},driver_ids.cs.{${driverId}}`);

          return {
            ...client,
            courses_count: count || 0,
          };
        })
      );

      setClients(clientsWithCourses);
      setFilteredClients(clientsWithCourses);
    } catch (error: any) {
      console.error("Error fetching clients:", error);
      toast.error("Erreur lors du chargement des clients");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (client: any) => {
    setDeleteClientId(client.id);
    setDeleteClientData(client);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteClientId) return;

    try {
      const isExclusive = deleteClientData?.is_exclusive;

      if (isExclusive && deleteClientData?.driver_id === driverId) {
        // Client exclusif : devient libre
        const { error } = await supabase
          .from("clients")
          .update({
            is_exclusive: false,
            driver_id: null,
            driver_ids: [],
          })
          .eq("id", deleteClientId);

        if (error) throw error;
        toast.success("Client retiré - Il devient maintenant un client libre");
      } else {
        // Client libre : retirer de driver_ids
        const currentDriverIds = deleteClientData?.driver_ids || [];
        const updatedDriverIds = currentDriverIds.filter((id: string) => id !== driverId);

        const { error } = await supabase
          .from("clients")
          .update({
            driver_ids: updatedDriverIds,
          })
          .eq("id", deleteClientId);

        if (error) throw error;
        toast.success("Client retiré de votre liste");
      }

      setDeleteClientId(null);
      setDeleteClientData(null);
      fetchClients();
    } catch (error: any) {
      console.error("Error deleting client:", error);
      toast.error("Erreur lors de la suppression");
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Chargement des clients...</p>
      </div>
    );
  }

  const stats = {
    total: clients.length,
    exclusive: clients.filter((c) => c.is_exclusive).length,
    free: clients.filter((c) => !c.is_exclusive).length,
    totalCourses: clients.reduce((sum, c) => sum + c.courses_count, 0),
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-premium rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-premium-foreground" />
            </div>
            <div>
              <h3 className="text-2xl font-bold">{stats.total}</h3>
              <p className="text-sm text-muted-foreground">Clients totaux</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-dark rounded-lg flex items-center justify-center">
              <Crown className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h3 className="text-2xl font-bold">{stats.exclusive}</h3>
              <p className="text-sm text-muted-foreground">Clients exclusifs</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-secondary rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-2xl font-bold">{stats.totalCourses}</h3>
              <p className="text-sm text-muted-foreground">Courses ce mois</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filtres et recherche */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-muted-foreground" />
          <h3 className="font-semibold">Filtres</h3>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Nom ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={clientTypeFilter} onValueChange={setClientTypeFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Type de client" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les clients</SelectItem>
              <SelectItem value="exclusive">Clients exclusifs</SelectItem>
              <SelectItem value="free">Clients libres</SelectItem>
            </SelectContent>
          </Select>

          <Input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            placeholder="Filtrer par date"
          />
        </div>
        {(searchTerm || clientTypeFilter !== "all" || dateFilter) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchTerm("");
              setClientTypeFilter("all");
              setDateFilter("");
            }}
            className="mt-3"
          >
            Réinitialiser les filtres
          </Button>
        )}
      </Card>

      {/* Clients List */}
      {filteredClients.length === 0 ? (
        <Card className="p-8 text-center">
          <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2">Aucun client</h3>
          <p className="text-muted-foreground">
            {searchTerm
              ? "Aucun client ne correspond à votre recherche"
              : "Vos clients apparaîtront ici une fois inscrits"}
          </p>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {filteredClients.map((client) => (
            <Card key={client.id} className="p-6 hover:shadow-elegant transition-all">
              <div className="flex items-start gap-4">
                {client.profiles?.profile_photo_url ? (
                  <img
                    src={client.profiles.profile_photo_url}
                    alt={client.profiles?.full_name || "Client"}
                    className="w-14 h-14 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-14 h-14 bg-gradient-dark rounded-full flex items-center justify-center">
                    <Users className="w-7 h-7 text-primary-foreground" />
                  </div>
                )}

                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold">{client.profiles?.full_name || "Client sans nom"}</h3>
                    {client.is_exclusive && (
                      <Badge className="bg-gradient-premium text-premium-foreground border-0">
                        <Crown className="w-3 h-3 mr-1" />
                        Exclusif
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>📧 {client.profiles?.email || "Email non renseigné"}</p>
                    {client.profiles?.phone && <p>📞 {client.profiles.phone}</p>}
                    <p className="text-premium font-medium mt-2">
                      {client.courses_count} course{client.courses_count !== 1 ? "s" : ""} effectuée{client.courses_count !== 1 ? "s" : ""}
                    </p>
                  </div>

                  <div className="flex gap-2 mt-4">
                    <Button
                      size="sm"
                      className="flex-1 bg-gradient-premium text-premium-foreground"
                      onClick={() => navigate(`/driver-create-course?client_id=${client.id}`)}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Créer une course
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toast.info("Messagerie en cours de développement")}
                    >
                      <MessageSquare className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteClick(client)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteClientId} onOpenChange={(open) => !open && setDeleteClientId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              Retirer ce client ?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              {deleteClientData?.is_exclusive ? (
                <>
                  <p className="font-medium text-foreground">
                    ⚠️ Ce client est un client exclusif
                  </p>
                  <p>
                    En le retirant, il deviendra un <strong>client libre</strong> et pourra choisir
                    d'autres chauffeurs sur la plateforme.
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Vous ne pourrez plus le récupérer automatiquement.
                  </p>
                </>
              ) : (
                <>
                  <p>
                    Ce client sera retiré de votre liste. Il pourra toujours réserver avec
                    d'autres chauffeurs.
                  </p>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirmer le retrait
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DriverClientsList;
