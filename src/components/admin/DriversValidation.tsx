import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle, XCircle, Search, Car, FileText } from "lucide-react";
import Pagination from "@/components/Pagination";
import DocumentViewer from "./DocumentViewer";

const DriversValidation = () => {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [filteredDrivers, setFilteredDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedDriver, setSelectedDriver] = useState<any>(null);
  const [showDocuments, setShowDocuments] = useState(false);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchDrivers();
  }, []);

  useEffect(() => {
    const filtered = drivers.filter((driver) =>
      driver.profiles.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driver.license_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driver.vehicle_model.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredDrivers(filtered);
    setCurrentPage(1);
  }, [searchTerm, drivers]);

  const fetchDrivers = async () => {
    try {
      const { data, error } = await supabase
        .from("drivers")
        .select(`
          *,
          profiles:user_id(full_name, email, phone, profile_photo_url)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDrivers(data || []);
      setFilteredDrivers(data || []);
    } catch (error: any) {
      console.error("Error fetching drivers:", error);
      toast.error("Erreur lors du chargement des chauffeurs");
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = async (driverId: string) => {
    try {
      // IMPORTANT: Mettre à jour AUSSI documents_status en plus du status
      const { error } = await supabase
        .from("drivers")
        .update({ 
          status: "validated",
          documents_status: "validated",
          public_profile_enabled: true,
          validation_date: new Date().toISOString()
        })
        .eq("id", driverId);

      if (error) throw error;

      // Activer la période d'essai / accès gratuit différé
      try {
        console.log("🔄 Resetting trial period for validated driver...");
        const resetResponse = await supabase.functions.invoke("reset-trial-on-validation", {
          body: { driver_id: driverId }
        });
        if (resetResponse.error) {
          console.error("⚠️ Trial reset error:", resetResponse.error);
        } else {
          console.log("✅ Trial period reset:", resetResponse.data);
        }
      } catch (trialError) {
        console.error("⚠️ Trial reset failed:", trialError);
      }

      // Send validation email
      await supabase.functions.invoke("send-email", {
        body: { driver_id: driverId, type: "driver_validation", data: { validationStatus: "approved" } },
      });

      toast.success("Chauffeur et documents validés avec succès");
      fetchDrivers();
    } catch (error: any) {
      console.error("Error validating driver:", error);
      toast.error("Erreur lors de la validation");
    }
  };

  const handleReject = async (driverId: string) => {
    try {
      const { error } = await supabase
        .from("drivers")
        .update({ status: "rejected" })
        .eq("id", driverId);

      if (error) throw error;

      // Send rejection email
      await supabase.functions.invoke("send-email", {
        body: { driver_id: driverId, type: "driver_validation", data: { validationStatus: "rejected" } },
      });

      toast.success("Chauffeur rejeté");
      fetchDrivers();
    } catch (error: any) {
      console.error("Error rejecting driver:", error);
      toast.error("Erreur lors du rejet");
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Chargement...</div>;
  }

  const totalPages = Math.ceil(filteredDrivers.length / itemsPerPage);
  const paginatedDrivers = filteredDrivers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
      validated: "bg-green-500/10 text-green-500 border-green-500/20",
      rejected: "bg-destructive/10 text-destructive border-destructive/20",
    };

    const labels = {
      pending: "En attente",
      validated: "Validé",
      rejected: "Rejeté",
    };

    return (
      <Badge variant="outline" className={styles[status as keyof typeof styles]}>
        {labels[status as keyof typeof labels]}
      </Badge>
    );
  };

  return (
    <>
      <DocumentViewer
        open={showDocuments}
        onOpenChange={setShowDocuments}
        driver={selectedDriver}
      />
      <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom, licence, véhicule..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
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
                <div className="flex items-start justify-between">
                  <div className="flex gap-4 flex-1">
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
                        <h3 className="font-bold text-lg">{driver.profiles.full_name}</h3>
                        {getStatusBadge(driver.status)}
                      </div>
                      <div className="grid md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                        <p><strong>Email :</strong> {driver.profiles.email}</p>
                        <p><strong>Téléphone :</strong> {driver.profiles.phone || "Non renseigné"}</p>
                        <p><strong>Licence :</strong> {driver.license_number}</p>
                        <p><strong>Véhicule :</strong> {driver.vehicle_model}</p>
                        {driver.company_name && (
                          <p><strong>Société :</strong> {driver.company_name}</p>
                        )}
                        {driver.siret && (
                          <p><strong>SIRET :</strong> {driver.siret}</p>
                        )}
                        <p><strong>Base :</strong> {driver.base_fare} €</p>
                        <p><strong>Tarif/km :</strong> {driver.per_km_rate} €</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {driver.documents && Object.keys(driver.documents).length > 0 && (
                      <Button
                        onClick={() => {
                          setSelectedDriver(driver);
                          setShowDocuments(true);
                        }}
                        variant="outline"
                        size="sm"
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        Voir documents
                      </Button>
                    )}
                    {driver.status === "pending" && (
                      <>
                        <Button
                          onClick={() => handleValidate(driver.id)}
                          size="sm"
                          className="bg-gradient-premium"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Valider
                        </Button>
                        <Button
                          onClick={() => handleReject(driver.id)}
                          variant="outline"
                          size="sm"
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Rejeter
                        </Button>
                      </>
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
      </div>
    </>
  );
};

export default DriversValidation;
