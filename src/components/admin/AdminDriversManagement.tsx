import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Search,
  Car,
  Ban,
  CheckCircle,
  FileText,
  BarChart3,
  Filter,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import Pagination from "@/components/Pagination";

const AdminDriversManagement = () => {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [filteredDrivers, setFilteredDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    action: "suspend" | "activate" | null;
    driver: any;
  }>({ open: false, action: null, driver: null });
  const itemsPerPage = 10;

  useEffect(() => {
    fetchDrivers();
  }, []);

  useEffect(() => {
    let filtered = drivers;

    if (searchTerm) {
      filtered = filtered.filter(
        (driver) =>
          driver.profiles.full_name
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          driver.profiles.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((driver) => driver.status === statusFilter);
    }

    setFilteredDrivers(filtered);
    setCurrentPage(1);
  }, [searchTerm, statusFilter, drivers]);

  const fetchDrivers = async () => {
    try {
      const { data, error } = await supabase
        .from("drivers")
        .select(
          `
          *,
          profiles:profiles!inner(full_name, email, phone, profile_photo_url),
          clients:clients(id),
          courses:courses(id)
        `
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      const driversWithStats = data.map((driver) => ({
        ...driver,
        clientsCount: driver.clients?.length || 0,
        coursesCount: driver.courses?.length || 0,
      }));

      setDrivers(driversWithStats);
      setFilteredDrivers(driversWithStats);
    } catch (error: any) {
      console.error("Error fetching drivers:", error);
      toast.error("Erreur lors du chargement des chauffeurs");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (driverId: string, newStatus: "pending" | "validated" | "rejected") => {
    try {
      const { error } = await supabase
        .from("drivers")
        .update({ status: newStatus })
        .eq("id", driverId);

      if (error) throw error;

      toast.success("Statut mis à jour avec succès");
      fetchDrivers();
    } catch (error: any) {
      console.error("Error updating status:", error);
      toast.error("Erreur lors de la mise à jour du statut");
    }
  };

  const handleAction = async () => {
    if (!actionDialog.driver || !actionDialog.action) return;

    try {
      const newStatus =
        actionDialog.action === "suspend" ? "rejected" : "validated";

      await handleStatusChange(actionDialog.driver.id, newStatus);
      setActionDialog({ open: false, action: null, driver: null });
    } catch (error: any) {
      console.error("Error performing action:", error);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: "En attente", color: "bg-yellow-500" },
      validated: { label: "Validé", color: "bg-green-500" },
      rejected: { label: "Rejeté", color: "bg-red-500" },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || {
      label: status,
      color: "bg-gray-500",
    };

    return <Badge className={config.color}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Chargement...
      </div>
    );
  }

  const totalPages = Math.ceil(filteredDrivers.length / itemsPerPage);
  const paginatedDrivers = filteredDrivers.slice(
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
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder="Filtrer par statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="pending">En attente</SelectItem>
            <SelectItem value="validated">Validé</SelectItem>
            <SelectItem value="rejected">Rejeté</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {paginatedDrivers.length === 0 ? (
        <Card className="p-8 text-center">
          <Car className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2">Aucun chauffeur trouvé</h3>
        </Card>
      ) : (
        <>
          <div className="space-y-4">
            {paginatedDrivers.map((driver) => (
              <Card key={driver.id} className="p-6">
                <div className="flex items-start gap-4">
                  {driver.profiles.profile_photo_url ? (
                    <img
                      src={driver.profiles.profile_photo_url}
                      alt={driver.profiles.full_name}
                      className="w-16 h-16 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-gradient-dark rounded-full flex items-center justify-center">
                      <Car className="w-8 h-8 text-primary-foreground" />
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-bold text-lg">
                        {driver.profiles.full_name}
                      </h3>
                      {getStatusBadge(driver.status)}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {driver.profiles.email}
                    </p>
                    {driver.company_name && (
                      <p className="text-sm font-medium mb-2">
                        🏢 {driver.company_name}
                      </p>
                    )}
                    <div className="flex gap-4 text-sm">
                      <Badge variant="outline">
                        👥 {driver.clientsCount} clients
                      </Badge>
                      <Badge variant="outline">
                        🚗 {driver.coursesCount} courses
                      </Badge>
                      {driver.vehicle_model && (
                        <Badge variant="outline">
                          🚙 {driver.vehicle_model}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    {driver.status === "validated" && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() =>
                          setActionDialog({
                            open: true,
                            action: "suspend",
                            driver,
                          })
                        }
                      >
                        <Ban className="w-4 h-4 mr-2" />
                        Suspendre
                      </Button>
                    )}
                    {driver.status === "rejected" && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() =>
                          setActionDialog({
                            open: true,
                            action: "activate",
                            driver,
                          })
                        }
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Activer
                      </Button>
                    )}
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
            totalItems={filteredDrivers.length}
          />
        </>
      )}

      <AlertDialog
        open={actionDialog.open}
        onOpenChange={(open) =>
          !open && setActionDialog({ open: false, action: null, driver: null })
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionDialog.action === "suspend"
                ? "Suspendre le chauffeur"
                : "Activer le chauffeur"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionDialog.action === "suspend"
                ? "Êtes-vous sûr de vouloir suspendre ce chauffeur ? Il ne pourra plus accepter de courses."
                : "Êtes-vous sûr de vouloir activer ce chauffeur ? Il pourra de nouveau accepter des courses."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleAction}>
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminDriversManagement;
