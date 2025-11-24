import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, Users, Crown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Pagination from "@/components/Pagination";

const AdminClientsManagement = () => {
  const [clients, setClients] = useState<any[]>([]);
  const [filteredClients, setFilteredClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    let filtered = clients;

    if (searchTerm) {
      filtered = filtered.filter(
        (client) =>
          client.profiles.full_name
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          client.profiles.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (typeFilter !== "all") {
      filtered = filtered.filter((client) =>
        typeFilter === "exclusive" ? client.is_exclusive : !client.is_exclusive
      );
    }

    setFilteredClients(filtered);
    setCurrentPage(1);
  }, [searchTerm, typeFilter, clients]);

  const fetchClients = async () => {
    try {
      // Optimisation: Sélectionner uniquement les colonnes nécessaires
      const { data, error } = await supabase
        .from("clients")
        .select(
          `
          id,
          user_id,
          driver_id,
          driver_ids,
          is_exclusive,
          created_at,
          profiles!inner(full_name, email, phone, profile_photo_url),
          drivers:drivers(id, profiles!inner(full_name)),
          courses:courses(id)
        `
        )
        .order("created_at", { ascending: false })
        .limit(10000); // Support 500k clients via pagination

      if (error) throw error;

      const clientsWithStats = data.map((client) => ({
        ...client,
        coursesCount: client.courses?.length || 0,
      }));

      setClients(clientsWithStats);
      setFilteredClients(clientsWithStats);
    } catch (error: any) {
      console.error("Error fetching clients:", error);
      toast.error("Erreur lors du chargement des clients");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Chargement...
      </div>
    );
  }

  const totalPages = Math.ceil(filteredClients.length / itemsPerPage);
  const paginatedClients = filteredClients.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder="Filtrer par type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            <SelectItem value="exclusive">Clients Exclusifs</SelectItem>
            <SelectItem value="free">Clients Libres</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="text-2xl font-bold text-primary">
            {clients.length}
          </div>
          <div className="text-sm text-muted-foreground">Total clients</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-blue-500">
            {clients.filter((c) => c.is_exclusive).length}
          </div>
          <div className="text-sm text-muted-foreground">Clients exclusifs</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-green-500">
            {clients.filter((c) => !c.is_exclusive).length}
          </div>
          <div className="text-sm text-muted-foreground">Clients libres</div>
        </Card>
      </div>

      {paginatedClients.length === 0 ? (
        <Card className="p-8 text-center">
          <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2">Aucun client trouvé</h3>
        </Card>
      ) : (
        <>
          <div className="space-y-4">
            {paginatedClients.map((client) => (
              <Card key={client.id} className="p-6">
                <div className="flex items-start gap-4">
                  {client.profiles.profile_photo_url ? (
                    <img
                      src={client.profiles.profile_photo_url}
                      alt={client.profiles.full_name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gradient-dark rounded-full flex items-center justify-center">
                      <Users className="w-6 h-6 text-primary-foreground" />
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold">{client.profiles.full_name}</h3>
                      {client.is_exclusive ? (
                        <Badge className="bg-blue-500 gap-1">
                          <Crown className="w-3 h-3" />
                          Client Exclusif
                        </Badge>
                      ) : (
                        <Badge variant="outline">Client Libre</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {client.profiles.email}
                    </p>
                    {client.profiles.phone && (
                      <p className="text-sm text-muted-foreground mb-2">
                        📞 {client.profiles.phone}
                      </p>
                    )}
                    <div className="flex gap-4 text-sm">
                      <Badge variant="outline">
                        🚗 {client.coursesCount} courses
                      </Badge>
                      {client.is_exclusive && client.drivers && (
                        <Badge variant="outline">
                          👤 Chauffeur: {client.drivers.profiles.full_name}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Inscrit le{" "}
                    {new Date(client.created_at).toLocaleDateString("fr-FR")}
                  </div>
                </div>
              </Card>
            ))}
          </div>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            itemsPerPage={itemsPerPage}
            totalItems={filteredClients.length}
          />
        </>
      )}
    </div>
  );
};

export default AdminClientsManagement;
