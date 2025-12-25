import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  FolderArchive, 
  Search, 
  Loader2, 
  Eye, 
  CheckCircle, 
  XCircle, 
  Clock,
  User,
  Car,
  FileText,
  Download,
  Calendar
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface FleetDriverDocumentsArchiveProps {
  fleetManagerId: string;
}

interface DocumentInfo {
  name: string;
  url: string;
  uploadedAt: string;
}

interface DriverFolder {
  driverId: string;
  driverName: string;
  profilePhoto: string | null;
  vehicleInfo: string;
  isActive: boolean;
  documentsStatus: string | null;
  documents: Record<string, DocumentInfo>;
  joinedAt: string;
  removedAt?: string | null;
}

export const FleetDriverDocumentsArchive = ({ fleetManagerId }: FleetDriverDocumentsArchiveProps) => {
  const [drivers, setDrivers] = useState<DriverFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "removed">("all");
  const [selectedDocument, setSelectedDocument] = useState<{url: string; name: string} | null>(null);

  useEffect(() => {
    fetchDriversWithDocuments();
  }, [fleetManagerId]);

  const fetchDriversWithDocuments = async () => {
    try {
      // Fetch all drivers (active and removed)
      const { data: driversData, error } = await supabase
        .from("fleet_manager_drivers")
        .select(`
          id,
          driver_id,
          status,
          joined_at,
          removed_at,
          removed_by_manager,
          driver:drivers(
            id,
            vehicle_model,
            vehicle_brand,
            documents,
            fleet_documents_status,
            user_id
          )
        `)
        .eq("fleet_manager_id", fleetManagerId)
        .order("joined_at", { ascending: false });

      if (error) throw error;

      if (driversData && driversData.length > 0) {
        const userIds = driversData
          .filter((d: any) => d.driver)
          .map((d: any) => d.driver.user_id);

        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, profile_photo_url")
          .in("id", userIds);

        const folders: DriverFolder[] = driversData
          .filter((d: any) => d.driver)
          .map((d: any) => {
            const profile = profiles?.find(p => p.id === d.driver.user_id);
            return {
              driverId: d.driver_id,
              driverName: profile?.full_name || "Sans nom",
              profilePhoto: profile?.profile_photo_url,
              vehicleInfo: `${d.driver.vehicle_brand || ""} ${d.driver.vehicle_model || ""}`.trim() || "Véhicule non spécifié",
              isActive: d.status === "active",
              documentsStatus: d.driver.fleet_documents_status,
              documents: (d.driver.documents as Record<string, DocumentInfo>) || {},
              joinedAt: d.joined_at,
              removedAt: d.removed_at,
            };
          });

        setDrivers(folders);
      }
    } catch (error) {
      console.error("Error fetching drivers:", error);
      toast.error("Erreur lors du chargement des dossiers");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string | null, isActive: boolean) => {
    if (!isActive) {
      return <Badge variant="outline" className="text-muted-foreground">Supprimé</Badge>;
    }
    switch (status) {
      case "validated":
        return <Badge className="bg-success"><CheckCircle className="w-3 h-3 mr-1" />Validés</Badge>;
      case "submitted":
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />En attente</Badge>;
      case "rejected":
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Rejetés</Badge>;
      default:
        return <Badge variant="outline"><FileText className="w-3 h-3 mr-1" />Incomplet</Badge>;
    }
  };

  const filteredDrivers = drivers.filter(d => {
    const matchesSearch = !search || 
      d.driverName.toLowerCase().includes(search.toLowerCase()) ||
      d.vehicleInfo.toLowerCase().includes(search.toLowerCase());
    
    const matchesFilter = filter === "all" || 
      (filter === "active" && d.isActive) ||
      (filter === "removed" && !d.isActive);
    
    return matchesSearch && matchesFilter;
  });

  const documentCount = (docs: Record<string, DocumentInfo>) => 
    Object.values(docs).filter(d => d?.url).length;

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FolderArchive className="w-5 h-5" />
          Archive des documents
        </CardTitle>
        <CardDescription>
          Accédez aux dossiers de tous vos chauffeurs (actifs et supprimés) pour contrôle
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un chauffeur..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            {[
              { value: "all", label: "Tous" },
              { value: "active", label: "Actifs" },
              { value: "removed", label: "Supprimés" },
            ].map((f) => (
              <Button
                key={f.value}
                variant={filter === f.value ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(f.value as any)}
              >
                {f.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 border rounded-lg text-center">
            <div className="text-2xl font-bold">{drivers.length}</div>
            <div className="text-sm text-muted-foreground">Total dossiers</div>
          </div>
          <div className="p-4 border rounded-lg text-center">
            <div className="text-2xl font-bold text-success">
              {drivers.filter(d => d.isActive).length}
            </div>
            <div className="text-sm text-muted-foreground">Actifs</div>
          </div>
          <div className="p-4 border rounded-lg text-center">
            <div className="text-2xl font-bold text-muted-foreground">
              {drivers.filter(d => !d.isActive).length}
            </div>
            <div className="text-sm text-muted-foreground">Supprimés</div>
          </div>
        </div>

        {/* Driver Folders */}
        {filteredDrivers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Aucun dossier trouvé
          </div>
        ) : (
          <Accordion type="single" collapsible className="space-y-2">
            {filteredDrivers.map((driver) => (
              <AccordionItem 
                key={driver.driverId} 
                value={driver.driverId}
                className={`border rounded-lg px-4 ${!driver.isActive ? 'opacity-70 bg-muted/30' : ''}`}
              >
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-4 w-full">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={driver.profilePhoto || ""} />
                      <AvatarFallback>
                        <User className="w-4 h-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{driver.driverName}</span>
                        {getStatusBadge(driver.documentsStatus, driver.isActive)}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Car className="w-3 h-3" />
                          {driver.vehicleInfo}
                        </span>
                        <span className="flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          {documentCount(driver.documents)} document(s)
                        </span>
                      </div>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="pt-4 space-y-4">
                    {/* Info */}
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Rejoint le {format(new Date(driver.joinedAt), "dd/MM/yyyy", { locale: fr })}
                      </span>
                      {driver.removedAt && (
                        <span className="flex items-center gap-1 text-destructive">
                          Supprimé le {format(new Date(driver.removedAt), "dd/MM/yyyy", { locale: fr })}
                        </span>
                      )}
                    </div>

                    {/* Documents */}
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Documents</h4>
                      {Object.entries(driver.documents).length === 0 ? (
                        <p className="text-sm text-muted-foreground">Aucun document téléchargé</p>
                      ) : (
                        <div className="grid gap-2">
                          {Object.entries(driver.documents).map(([key, doc]) => (
                            doc?.url && (
                              <div 
                                key={key}
                                className="flex items-center justify-between p-3 border rounded-lg bg-muted/30"
                              >
                                <div className="flex items-center gap-3">
                                  <FileText className="w-4 h-4 text-primary" />
                                  <div>
                                    <p className="font-medium text-sm">{doc.name || key}</p>
                                    <p className="text-xs text-muted-foreground">
                                      Téléchargé le {format(new Date(doc.uploadedAt), "dd/MM/yyyy", { locale: fr })}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setSelectedDocument({ url: doc.url, name: doc.name || key })}
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => window.open(doc.url, "_blank")}
                                  >
                                    <Download className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            )
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}

        {/* Document Preview Dialog */}
        <Dialog open={!!selectedDocument} onOpenChange={() => setSelectedDocument(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>{selectedDocument?.name}</DialogTitle>
              <DialogDescription>Aperçu du document</DialogDescription>
            </DialogHeader>
            {selectedDocument && (
              <div className="mt-4">
                {selectedDocument.url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                  <img 
                    src={selectedDocument.url} 
                    alt={selectedDocument.name}
                    className="max-w-full max-h-[70vh] object-contain mx-auto"
                  />
                ) : (
                  <iframe
                    src={selectedDocument.url}
                    className="w-full h-[70vh] border rounded"
                    title={selectedDocument.name}
                  />
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};
