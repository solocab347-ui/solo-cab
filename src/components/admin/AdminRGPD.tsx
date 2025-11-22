import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Shield, Search, Download, FileText, User, Car, Table } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import jsPDF from "jspdf";

interface UserData {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  address: string | null;
  created_at: string;
  user_type: "driver" | "client";
  driver_data?: any;
  client_data?: any;
}

const AdminRGPD = () => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [detailedData, setDetailedData] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [exportingUser, setExportingUser] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchTerm, typeFilter, statusFilter, users]);

  const fetchUsers = async () => {
    try {
      setLoading(true);

      // Récupérer tous les profils avec leurs données associées
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // Pour chaque profil, déterminer s'il est client ou chauffeur
      const usersData: UserData[] = [];

      for (const profile of profiles || []) {
        // Vérifier si c'est un chauffeur
        const { data: driver } = await supabase
          .from("drivers")
          .select("*, user_roles!inner(*)")
          .eq("user_id", profile.id)
          .maybeSingle();

        if (driver) {
          usersData.push({
            id: profile.id,
            full_name: profile.full_name,
            email: profile.email,
            phone: profile.phone,
            address: profile.address,
            created_at: profile.created_at,
            user_type: "driver",
            driver_data: driver,
          });
          continue;
        }

        // Vérifier si c'est un client
        const { data: client } = await supabase
          .from("clients")
          .select("*")
          .eq("user_id", profile.id)
          .maybeSingle();

        if (client) {
          usersData.push({
            id: profile.id,
            full_name: profile.full_name,
            email: profile.email,
            phone: profile.phone,
            address: profile.address,
            created_at: profile.created_at,
            user_type: "client",
            client_data: client,
          });
        }
      }

      setUsers(usersData);
    } catch (error: any) {
      console.error("Error fetching users:", error);
      toast.error("Erreur lors du chargement des utilisateurs");
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...users];

    // Filtre par recherche (nom ou email)
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (user) =>
          user.full_name.toLowerCase().includes(term) ||
          user.email.toLowerCase().includes(term)
      );
    }

    // Filtre par type
    if (typeFilter !== "all") {
      filtered = filtered.filter((user) => user.user_type === typeFilter);
    }

    // Filtre par statut (pour les chauffeurs uniquement)
    if (statusFilter !== "all" && typeFilter === "driver") {
      filtered = filtered.filter((user) => {
        if (user.user_type === "driver" && user.driver_data) {
          return user.driver_data.status === statusFilter;
        }
        return false;
      });
    }

    setFilteredUsers(filtered);
  };

  const fetchDetailedUserData = async (user: UserData) => {
    try {
      setExportingUser(true);

      let detailedInfo: any = {
        profile: {
          full_name: user.full_name,
          email: user.email,
          phone: user.phone,
          address: user.address,
          created_at: user.created_at,
        },
      };

      if (user.user_type === "driver" && user.driver_data) {
        const driverId = user.driver_data.id;

        // Clients du chauffeur
        const { data: clients } = await supabase
          .from("clients")
          .select(`*, profiles:user_id(full_name, email, phone)`)
          .or(`driver_id.eq.${driverId},driver_ids.cs.{${driverId}}`);

        // Courses
        const { data: courses } = await supabase
          .from("courses")
          .select("*")
          .or(`driver_id.eq.${driverId},driver_ids.cs.{${driverId}}`);

        // Devis
        const { data: devis } = await supabase
          .from("devis")
          .select("*")
          .eq("driver_id", driverId);

        // Factures
        const { data: factures } = await supabase
          .from("factures")
          .select("*")
          .eq("driver_id", driverId);

        detailedInfo = {
          ...detailedInfo,
          driver: user.driver_data,
          clients,
          courses,
          devis,
          factures,
        };
      } else if (user.user_type === "client" && user.client_data) {
        const clientId = user.client_data.id;

        // Courses
        const { data: courses } = await supabase
          .from("courses")
          .select("*")
          .eq("client_id", clientId);

        // Devis
        const { data: devis } = await supabase
          .from("devis")
          .select("*")
          .eq("client_id", clientId);

        // Factures
        const { data: factures } = await supabase
          .from("factures")
          .select("*")
          .eq("client_id", clientId);

        detailedInfo = {
          ...detailedInfo,
          client: user.client_data,
          courses,
          devis,
          factures,
        };
      }

      // Messages
      const { data: conversations } = await supabase
        .from("conversations")
        .select("*, messages(*)")
        .or(`participant_1_id.eq.${user.id},participant_2_id.eq.${user.id}`);

      // Notifications
      const { data: notifications } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id);

      detailedInfo = {
        ...detailedInfo,
        conversations,
        notifications,
      };

      setDetailedData(detailedInfo);
      setSelectedUser(user);
      setDialogOpen(true);
    } catch (error: any) {
      console.error("Error fetching detailed data:", error);
      toast.error("Erreur lors du chargement des données détaillées");
    } finally {
      setExportingUser(false);
    }
  };

  const exportUserDataToCSV = () => {
    if (!detailedData || !selectedUser) return;

    let csvContent = "data:text/csv;charset=utf-8,";
    
    csvContent += "EXPORT RGPD ADMIN - SOLOCAB\n";
    csvContent += `Date d'export: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: fr })}\n\n`;

    // Profil
    csvContent += "PROFIL\n";
    csvContent += `Nom,${detailedData.profile?.full_name || ""}\n`;
    csvContent += `Email,${detailedData.profile?.email || ""}\n`;
    csvContent += `Téléphone,${detailedData.profile?.phone || ""}\n`;
    csvContent += `Adresse,${detailedData.profile?.address || ""}\n`;
    csvContent += `Type,${selectedUser.user_type === "driver" ? "Chauffeur" : "Client"}\n`;
    csvContent += `Date d'inscription,${format(new Date(detailedData.profile.created_at), "dd/MM/yyyy", { locale: fr })}\n\n`;

    if (selectedUser.user_type === "driver" && detailedData.driver) {
      csvContent += "INFORMATIONS CHAUFFEUR\n";
      csvContent += `Statut,${detailedData.driver.status}\n`;
      csvContent += `Véhicule,${detailedData.driver.vehicle_model || ""}\n`;
      csvContent += `Immatriculation,${detailedData.driver.vehicle_plate || ""}\n`;
      csvContent += `Entreprise,${detailedData.driver.company_name || ""}\n`;
      csvContent += `SIRET,${detailedData.driver.siret || ""}\n`;
      csvContent += `Note,${detailedData.driver.rating || "0"}\n\n`;
      
      if (detailedData.clients?.length > 0) {
        csvContent += "CLIENTS\n";
        csvContent += "Nom,Email,Téléphone,Type\n";
        detailedData.clients.forEach((c: any) => {
          csvContent += `${c.profiles?.full_name || ""},${c.profiles?.email || ""},${c.profiles?.phone || ""},${c.is_exclusive ? "Exclusif" : "Libre"}\n`;
        });
        csvContent += "\n";
      }
    }

    if (selectedUser.user_type === "client" && detailedData.client) {
      csvContent += "INFORMATIONS CLIENT\n";
      csvContent += `Type,${detailedData.client.is_exclusive ? "Exclusif" : "Libre"}\n`;
      csvContent += `Courses totales,${detailedData.client.total_rides || "0"}\n\n`;
    }

    // Courses
    if (detailedData.courses?.length > 0) {
      csvContent += "COURSES\n";
      csvContent += "Numéro,Départ,Arrivée,Date,Statut\n";
      detailedData.courses.forEach((c: any) => {
        csvContent += `${c.course_number || ""},${c.pickup_address},${c.destination_address},${format(new Date(c.scheduled_date), "dd/MM/yyyy", { locale: fr })},${c.status}\n`;
      });
      csvContent += "\n";
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `rgpd_${selectedUser.user_type}_${selectedUser.full_name.replace(/\s+/g, "_")}_${format(new Date(), "yyyyMMdd")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success("Export CSV téléchargé");
  };

  const exportUserDataToPDF = () => {
    if (!detailedData || !selectedUser) return;

    const doc = new jsPDF();
    let yPos = 20;

    doc.setFontSize(18);
    doc.setTextColor(59, 130, 246);
    doc.text("Export RGPD Admin - SoloCab", 20, yPos);
    
    yPos += 8;
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Export: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: fr })}`, 20, yPos);
    
    yPos += 10;
    doc.setDrawColor(59, 130, 246);
    doc.line(20, yPos, 190, yPos);
    
    yPos += 10;
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text("PROFIL", 20, yPos);
    
    yPos += 7;
    doc.setFontSize(10);
    doc.text(`Nom: ${detailedData.profile?.full_name || ""}`, 25, yPos);
    yPos += 5;
    doc.text(`Email: ${detailedData.profile?.email || ""}`, 25, yPos);
    yPos += 5;
    doc.text(`Type: ${selectedUser.user_type === "driver" ? "Chauffeur" : "Client"}`, 25, yPos);
    yPos += 5;
    doc.text(`Inscription: ${format(new Date(detailedData.profile.created_at), "dd/MM/yyyy", { locale: fr })}`, 25, yPos);

    if (selectedUser.user_type === "driver" && detailedData.driver) {
      yPos += 12;
      doc.setFontSize(14);
      doc.text("CHAUFFEUR", 20, yPos);
      
      yPos += 7;
      doc.setFontSize(10);
      doc.text(`Statut: ${detailedData.driver.status}`, 25, yPos);
      yPos += 5;
      doc.text(`Véhicule: ${detailedData.driver.vehicle_model || ""}`, 25, yPos);
      yPos += 5;
      doc.text(`Entreprise: ${detailedData.driver.company_name || ""}`, 25, yPos);
    }

    yPos += 12;
    doc.setFontSize(14);
    doc.text("STATISTIQUES", 20, yPos);
    
    yPos += 7;
    doc.setFontSize(10);
    doc.text(`Courses: ${detailedData.courses?.length || 0}`, 25, yPos);
    yPos += 5;
    doc.text(`Devis: ${detailedData.devis?.length || 0}`, 25, yPos);
    yPos += 5;
    doc.text(`Factures: ${detailedData.factures?.length || 0}`, 25, yPos);

    doc.save(`rgpd_${selectedUser.user_type}_${selectedUser.full_name.replace(/\s+/g, "_")}_${format(new Date(), "yyyyMMdd")}.pdf`);
    toast.success("Export PDF téléchargé");
  };

  const getTypeBadge = (type: "driver" | "client") => {
    if (type === "driver") {
      return <Badge className="bg-blue-500"><Car className="w-3 h-3 mr-1" />Chauffeur</Badge>;
    }
    return <Badge className="bg-green-500"><User className="w-3 h-3 mr-1" />Client</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      validated: { label: "Validé", className: "bg-green-500" },
      pending: { label: "En attente", className: "bg-yellow-500" },
      rejected: { label: "Rejeté", className: "bg-red-500" },
      on_hold: { label: "En pause", className: "bg-orange-500" },
    };
    const config = statusMap[status] || { label: status, className: "bg-gray-500" };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Chargement des données RGPD...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-slate-500 to-gray-500 flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">RGPD & Confidentialité</h2>
            <p className="text-muted-foreground">
              Accès aux données utilisateurs pour conformité RGPD et litiges
            </p>
          </div>
        </div>

        {/* Filtres */}
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Type d'utilisateur" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="driver">Chauffeurs</SelectItem>
              <SelectItem value="client">Clients</SelectItem>
            </SelectContent>
          </Select>
          {typeFilter === "driver" && (
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Statut chauffeur" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="validated">Validés</SelectItem>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="on_hold">En pause</SelectItem>
                <SelectItem value="rejected">Rejetés</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Liste des utilisateurs */}
        <div className="space-y-3">
          {filteredUsers.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Aucun utilisateur trouvé</p>
          ) : (
            filteredUsers.map((user) => (
              <Card key={user.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                      {user.user_type === "driver" ? (
                        <Car className="w-5 h-5 text-primary" />
                      ) : (
                        <User className="w-5 h-5 text-primary" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold">{user.full_name}</p>
                        {getTypeBadge(user.user_type)}
                        {user.user_type === "driver" && user.driver_data && (
                          getStatusBadge(user.driver_data.status)
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Inscrit le {format(new Date(user.created_at), "dd/MM/yyyy", { locale: fr })}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchDetailedUserData(user)}
                    disabled={exportingUser}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Données RGPD
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>

        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong>Note :</strong> Ces données sont confidentielles et doivent être utilisées uniquement dans le
            cadre de demandes légitimes (demandes RGPD, litiges, contrôles administratifs).
          </p>
        </div>
      </Card>

      {/* Dialog de détails */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Données RGPD - {selectedUser?.full_name}
            </DialogTitle>
          </DialogHeader>
          
          {detailedData && selectedUser && (
            <div className="space-y-6">
              {/* Informations générales */}
              <div className="grid md:grid-cols-2 gap-4">
                <Card className="p-4">
                  <h3 className="font-semibold mb-3">Informations personnelles</h3>
                  <div className="space-y-2 text-sm">
                    <p><strong>Nom :</strong> {detailedData.profile?.full_name}</p>
                    <p><strong>Email :</strong> {detailedData.profile?.email}</p>
                    <p><strong>Téléphone :</strong> {detailedData.profile?.phone || "Non renseigné"}</p>
                    <p><strong>Adresse :</strong> {detailedData.profile?.address || "Non renseigné"}</p>
                    <p><strong>Inscrit le :</strong> {format(new Date(detailedData.profile.created_at), "dd/MM/yyyy", { locale: fr })}</p>
                  </div>
                </Card>

                <Card className="p-4">
                  <h3 className="font-semibold mb-3">Statistiques</h3>
                  <div className="space-y-2 text-sm">
                    <p><strong>Courses :</strong> {detailedData.courses?.length || 0}</p>
                    <p><strong>Devis :</strong> {detailedData.devis?.length || 0}</p>
                    <p><strong>Factures :</strong> {detailedData.factures?.length || 0}</p>
                    <p><strong>Messages :</strong> {detailedData.conversations?.reduce((sum: number, conv: any) => sum + (conv.messages?.length || 0), 0) || 0}</p>
                    <p><strong>Notifications :</strong> {detailedData.notifications?.length || 0}</p>
                  </div>
                </Card>
              </div>

              {/* Informations spécifiques */}
              {selectedUser.user_type === "driver" && detailedData.driver && (
                <Card className="p-4">
                  <h3 className="font-semibold mb-3">Informations chauffeur</h3>
                  <div className="grid md:grid-cols-2 gap-3 text-sm">
                    <p><strong>Statut :</strong> {detailedData.driver.status}</p>
                    <p><strong>Véhicule :</strong> {detailedData.driver.vehicle_model}</p>
                    <p><strong>Immatriculation :</strong> {detailedData.driver.vehicle_plate || "Non renseigné"}</p>
                    <p><strong>Entreprise :</strong> {detailedData.driver.company_name || "Non renseigné"}</p>
                    <p><strong>SIRET :</strong> {detailedData.driver.siret || "Non renseigné"}</p>
                    <p><strong>Note moyenne :</strong> {detailedData.driver.rating || "0"}/5</p>
                    <p><strong>Clients :</strong> {detailedData.clients?.length || 0}</p>
                  </div>
                </Card>
              )}

              {selectedUser.user_type === "client" && detailedData.client && (
                <Card className="p-4">
                  <h3 className="font-semibold mb-3">Informations client</h3>
                  <div className="grid md:grid-cols-2 gap-3 text-sm">
                    <p><strong>Type :</strong> {detailedData.client.is_exclusive ? "Client exclusif" : "Client libre"}</p>
                    <p><strong>Courses totales :</strong> {detailedData.client.total_rides || 0}</p>
                    <p><strong>Total dépensé :</strong> {detailedData.client.total_spent || 0}€</p>
                  </div>
                </Card>
              )}

              {/* Boutons d'export */}
              <div className="flex gap-3">
                <Button onClick={exportUserDataToCSV} className="flex-1">
                  <Table className="w-4 h-4 mr-2" />
                  Exporter en CSV
                </Button>
                <Button onClick={exportUserDataToPDF} variant="outline" className="flex-1">
                  <Download className="w-4 h-4 mr-2" />
                  Exporter en PDF
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminRGPD;
