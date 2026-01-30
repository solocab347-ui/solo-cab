import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Folder,
  FolderOpen,
  FileText,
  Search,
  Eye,
  Download,
  ChevronRight,
  User,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Car,
  ArrowLeft,
  RefreshCw,
  Image,
  FileImage
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface DriverFolder {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  profile_photo_url: string | null;
  company_name: string | null;
  documents_status: string;
  documents: Record<string, DocumentInfo>;
  created_at: string;
  vehicle_brand: string | null;
  vehicle_model: string | null;
}

interface DocumentInfo {
  url: string;
  name?: string;
  uploadedAt?: string;
  validated?: boolean;
  validatedAt?: string;
  rejected?: boolean;
  rejectedAt?: string;
  rejectionReason?: string;
}

// Document configuration
const DOCUMENT_CONFIG: Record<string, { label: string; icon: string }> = {
  id_card_recto: { label: "Pièce d'identité (Recto)", icon: "id" },
  id_card_verso: { label: "Pièce d'identité (Verso)", icon: "id" },
  passport: { label: "Passeport", icon: "passport" },
  vtc_card_recto: { label: "Carte VTC (Recto)", icon: "vtc" },
  vtc_card_verso: { label: "Carte VTC (Verso)", icon: "vtc" },
  driving_license_recto: { label: "Permis de conduire (Recto)", icon: "license" },
  driving_license_verso: { label: "Permis de conduire (Verso)", icon: "license" },
  vehicle_registration: { label: "Carte grise", icon: "car" },
  insurance: { label: "Attestation d'assurance", icon: "insurance" },
  kbis: { label: "Extrait Kbis", icon: "company" }
};

// Legacy key mappings
const LEGACY_KEY_MAPPING: Record<string, string> = {
  'identity_recto': 'id_card_recto',
  'identity_verso': 'id_card_verso',
  'vtc_recto': 'vtc_card_recto',
  'vtc_verso': 'vtc_card_verso',
  'vehicle_insurance': 'insurance',
  'registration': 'vehicle_registration',
};

const normalizeDocuments = (docs: Record<string, any> | null): Record<string, DocumentInfo> => {
  if (!docs) return {};
  
  const normalized: Record<string, DocumentInfo> = {};
  
  Object.entries(docs).forEach(([key, value]) => {
    const normalizedKey = LEGACY_KEY_MAPPING[key] || key;
    
    if (typeof value === 'string') {
      normalized[normalizedKey] = {
        url: value,
        name: normalizedKey,
        uploadedAt: undefined,
        validated: false
      };
    } else if (value && typeof value === 'object') {
      normalized[normalizedKey] = value as DocumentInfo;
    }
  });
  
  return normalized;
};

const AdminDocumentsHub = () => {
  const [drivers, setDrivers] = useState<DriverFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDriver, setSelectedDriver] = useState<DriverFolder | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewDocLabel, setPreviewDocLabel] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "validated" | "submitted" | "pending" | "rejected">("all");

  const fetchDrivers = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("drivers")
        .select(`
          id,
          user_id,
          company_name,
          documents,
          documents_status,
          created_at,
          vehicle_brand,
          vehicle_model,
          profiles:user_id(full_name, email, profile_photo_url)
        `)
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        if (statusFilter === "pending") {
          query = query.or("documents_status.is.null,documents_status.eq.pending");
        } else {
          query = query.eq("documents_status", statusFilter);
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      const formattedDrivers: DriverFolder[] = (data || []).map((d: any) => ({
        id: d.id,
        user_id: d.user_id,
        full_name: d.profiles?.full_name || "Inconnu",
        email: d.profiles?.email || "",
        profile_photo_url: d.profiles?.profile_photo_url,
        company_name: d.company_name,
        documents_status: d.documents_status || "pending",
        documents: normalizeDocuments(d.documents),
        created_at: d.created_at,
        vehicle_brand: d.vehicle_brand,
        vehicle_model: d.vehicle_model
      }));

      setDrivers(formattedDrivers);
    } catch (error) {
      console.error("Error fetching drivers:", error);
      toast.error("Erreur lors du chargement des dossiers");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchDrivers();
  }, [fetchDrivers]);

  const filteredDrivers = drivers.filter(driver => {
    const search = searchTerm.toLowerCase();
    return (
      driver.full_name.toLowerCase().includes(search) ||
      driver.email.toLowerCase().includes(search) ||
      (driver.company_name?.toLowerCase().includes(search) ?? false)
    );
  });

  const getDocumentCount = (docs: Record<string, DocumentInfo>) => {
    return Object.values(docs).filter(d => d?.url).length;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "validated":
        return <Badge className="bg-green-500/10 text-green-600 border-green-200"><CheckCircle className="w-3 h-3 mr-1" /> Validé</Badge>;
      case "submitted":
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-200"><Clock className="w-3 h-3 mr-1" /> En attente</Badge>;
      case "rejected":
        return <Badge className="bg-red-500/10 text-red-600 border-red-200"><XCircle className="w-3 h-3 mr-1" /> Rejeté</Badge>;
      default:
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" /> En cours</Badge>;
    }
  };

  const handleOpenDocument = (url: string, label: string) => {
    setPreviewUrl(url);
    setPreviewDocLabel(label);
  };

  const handleDownloadDocument = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);
      toast.success("Document téléchargé");
    } catch (error) {
      toast.error("Erreur lors du téléchargement");
    }
  };

  // Vue liste des dossiers chauffeurs
  if (!selectedDriver) {
    return (
      <div className="space-y-4">
        {/* Header avec recherche et filtres */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="relative flex-1 w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un chauffeur..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={statusFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("all")}
            >
              Tous
            </Button>
            <Button
              variant={statusFilter === "submitted" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("submitted")}
            >
              En attente
            </Button>
            <Button
              variant={statusFilter === "validated" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("validated")}
            >
              Validés
            </Button>
            <Button
              variant={statusFilter === "rejected" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("rejected")}
            >
              Rejetés
            </Button>
            <Button variant="ghost" size="icon" onClick={fetchDrivers}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="p-3">
            <div className="text-2xl font-bold">{drivers.length}</div>
            <div className="text-xs text-muted-foreground">Total dossiers</div>
          </Card>
          <Card className="p-3">
            <div className="text-2xl font-bold text-green-600">
              {drivers.filter(d => d.documents_status === "validated").length}
            </div>
            <div className="text-xs text-muted-foreground">Validés</div>
          </Card>
          <Card className="p-3">
            <div className="text-2xl font-bold text-blue-600">
              {drivers.filter(d => d.documents_status === "submitted").length}
            </div>
            <div className="text-xs text-muted-foreground">En attente</div>
          </Card>
          <Card className="p-3">
            <div className="text-2xl font-bold text-red-600">
              {drivers.filter(d => d.documents_status === "rejected").length}
            </div>
            <div className="text-xs text-muted-foreground">Rejetés</div>
          </Card>
        </div>

        {/* Liste des dossiers */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Folder className="w-5 h-5" />
              Dossiers Chauffeurs ({filteredDrivers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredDrivers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Aucun dossier trouvé
              </div>
            ) : (
              <ScrollArea className="h-[500px]">
                <div className="space-y-2">
                  {filteredDrivers.map((driver) => (
                    <div
                      key={driver.id}
                      onClick={() => setSelectedDriver(driver)}
                      className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 cursor-pointer transition-colors"
                    >
                      <div className="flex-shrink-0">
                        <FolderOpen className="w-10 h-10 text-amber-500" />
                      </div>
                      <Avatar className="h-10 w-10 flex-shrink-0">
                        <AvatarImage src={driver.profile_photo_url || undefined} />
                        <AvatarFallback>
                          {driver.full_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{driver.full_name}</div>
                        <div className="text-sm text-muted-foreground truncate">
                          {driver.company_name || driver.email}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <FileText className="w-3 h-3" />
                          {getDocumentCount(driver.documents)} document(s)
                          <span className="mx-1">•</span>
                          <Calendar className="w-3 h-3" />
                          {format(new Date(driver.created_at), "dd MMM yyyy", { locale: fr })}
                        </div>
                      </div>
                      <div className="flex-shrink-0 flex items-center gap-2">
                        {getStatusBadge(driver.documents_status)}
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Vue détail du dossier d'un chauffeur
  const documentEntries = Object.entries(selectedDriver.documents).filter(([_, doc]) => doc?.url);

  return (
    <div className="space-y-4">
      {/* Header retour */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setSelectedDriver(null)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <Avatar className="h-10 w-10">
          <AvatarImage src={selectedDriver.profile_photo_url || undefined} />
          <AvatarFallback>
            {selectedDriver.full_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h2 className="font-bold text-lg">{selectedDriver.full_name}</h2>
          <p className="text-sm text-muted-foreground">{selectedDriver.company_name || selectedDriver.email}</p>
        </div>
        {getStatusBadge(selectedDriver.documents_status)}
      </div>

      {/* Infos chauffeur */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Email</span>
              <p className="font-medium truncate">{selectedDriver.email}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Véhicule</span>
              <p className="font-medium">
                {selectedDriver.vehicle_brand && selectedDriver.vehicle_model
                  ? `${selectedDriver.vehicle_brand} ${selectedDriver.vehicle_model}`
                  : "Non renseigné"}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Inscription</span>
              <p className="font-medium">{format(new Date(selectedDriver.created_at), "dd/MM/yyyy", { locale: fr })}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Documents</span>
              <p className="font-medium">{documentEntries.length} fichier(s)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Liste des documents */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Documents du dossier
          </CardTitle>
        </CardHeader>
        <CardContent>
          {documentEntries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Aucun document dans ce dossier
            </div>
          ) : (
            <div className="grid gap-3">
              {documentEntries.map(([key, doc]) => {
                const config = DOCUMENT_CONFIG[key];
                const isImage = doc.url?.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                
                return (
                  <div
                    key={key}
                    className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/30 transition-colors"
                  >
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      {isImage ? (
                        <FileImage className="w-5 h-5 text-primary" />
                      ) : (
                        <FileText className="w-5 h-5 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{config?.label || key}</div>
                      <div className="text-xs text-muted-foreground">
                        {doc.uploadedAt
                          ? `Envoyé le ${format(new Date(doc.uploadedAt), "dd/MM/yyyy à HH:mm", { locale: fr })}`
                          : "Date inconnue"}
                      </div>
                      {doc.validated && (
                        <Badge variant="outline" className="mt-1 text-green-600 border-green-200">
                          <CheckCircle className="w-3 h-3 mr-1" /> Validé
                        </Badge>
                      )}
                      {doc.rejected && (
                        <div className="mt-1">
                          <Badge variant="outline" className="text-red-600 border-red-200">
                            <XCircle className="w-3 h-3 mr-1" /> Rejeté
                          </Badge>
                          {doc.rejectionReason && (
                            <p className="text-xs text-red-500 mt-1">{doc.rejectionReason}</p>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenDocument(doc.url, config?.label || key)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadDocument(doc.url, `${selectedDriver.full_name}_${key}.${doc.url.split('.').pop()}`)}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog preview document */}
      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{previewDocLabel}</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center overflow-auto max-h-[70vh]">
            {previewUrl?.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
              <img
                src={previewUrl}
                alt={previewDocLabel}
                className="max-w-full max-h-[65vh] object-contain rounded-lg"
              />
            ) : previewUrl?.match(/\.pdf$/i) ? (
              <iframe
                src={previewUrl}
                className="w-full h-[65vh] rounded-lg"
                title={previewDocLabel}
              />
            ) : (
              <div className="text-center py-8">
                <FileText className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Aperçu non disponible</p>
                <Button
                  className="mt-4"
                  onClick={() => window.open(previewUrl!, '_blank')}
                >
                  Ouvrir dans un nouvel onglet
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDocumentsHub;
