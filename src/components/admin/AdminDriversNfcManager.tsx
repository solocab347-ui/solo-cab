import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { 
  Users, Tag, Loader2, Phone, Mail, Copy, ExternalLink, User, Search, 
  RefreshCw, CheckCircle, Clock, XCircle, Filter
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";

interface DriverWithProfile {
  id: string;
  user_id: string;
  driver_code: string | null;
  license_number: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  nfc_tag_number: string | null;
  public_profile_enabled: boolean | null;
  status: string | null;
  created_at: string;
  company_name: string | null;
  is_pioneer: boolean | null;
  profile?: {
    full_name: string | null;
    email: string | null;
    phone: string | null;
  } | null;
}

const AdminDriversNfcManager = () => {
  const [drivers, setDrivers] = useState<DriverWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [nfcFilter, setNfcFilter] = useState<string>("all");
  
  const [selectedDriver, setSelectedDriver] = useState<DriverWithProfile | null>(null);
  const [nfcTagNumber, setNfcTagNumber] = useState("");
  const [isUpdatingNfc, setIsUpdatingNfc] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Charger les chauffeurs
  const fetchDrivers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("drivers")
        .select(`
          id,
          user_id,
          driver_code,
          license_number,
          contact_phone,
          contact_email,
          nfc_tag_number,
          public_profile_enabled,
          status,
          created_at,
          company_name,
          is_pioneer
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Récupérer les profils associés
      const userIds = (data || []).map(d => d.user_id).filter(Boolean);
      let profilesMap: Record<string, any> = {};
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, email, phone")
          .in("id", userIds);
        
        if (profiles) {
          profilesMap = profiles.reduce((acc: Record<string, any>, p: any) => {
            acc[p.id] = p;
            return acc;
          }, {});
        }
      }

      // Associer les profils aux chauffeurs
      const driversWithProfiles = (data || []).map(driver => ({
        ...driver,
        profile: profilesMap[driver.user_id] || null
      }));

      setDrivers(driversWithProfiles);
    } catch (err) {
      console.error("Erreur chargement chauffeurs:", err);
      toast.error("Erreur lors du chargement des chauffeurs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrivers();
  }, []);

  // Filtrer les chauffeurs
  const filteredDrivers = useMemo(() => {
    let result = drivers;

    // Filtre par statut
    if (statusFilter !== "all") {
      result = result.filter(d => d.status === statusFilter);
    }

    // Filtre NFC
    if (nfcFilter === "with") {
      result = result.filter(d => d.nfc_tag_number);
    } else if (nfcFilter === "without") {
      result = result.filter(d => !d.nfc_tag_number);
    }

    // Recherche textuelle
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter((driver) => {
        const name = driver.profile?.full_name?.toLowerCase() || "";
        const email = (driver.contact_email || driver.profile?.email || "").toLowerCase();
        const driverCode = (driver.driver_code || `DRV-${driver.id.slice(0, 6).toUpperCase()}`).toLowerCase();
        const phone = (driver.contact_phone || driver.profile?.phone || "").toLowerCase();
        const nfcTag = (driver.nfc_tag_number || "").toLowerCase();
        const companyName = (driver.company_name || "").toLowerCase();
        
        return name.includes(query) || 
               email.includes(query) || 
               driverCode.includes(query) ||
               phone.includes(query) ||
               nfcTag.includes(query) ||
               companyName.includes(query);
      });
    }

    return result;
  }, [drivers, searchQuery, statusFilter, nfcFilter]);

  // Statistiques
  const stats = useMemo(() => {
    const total = drivers.length;
    const withNfc = drivers.filter(d => d.nfc_tag_number).length;
    const withoutNfc = drivers.filter(d => !d.nfc_tag_number).length;
    const validated = drivers.filter(d => d.status === "validated").length;
    const pending = drivers.filter(d => d.status === "pending").length;
    
    return { total, withNfc, withoutNfc, validated, pending };
  }, [drivers]);

  const getPublicProfileLink = (driverId: string) => {
    return `${window.location.origin}/chauffeur/${driverId}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copié dans le presse-papiers");
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "validated":
        return <Badge variant="outline" className="border-primary/50 text-primary"><CheckCircle className="h-3 w-3 mr-1" />Validé</Badge>;
      case "pending":
        return <Badge variant="outline" className="border-accent/50 text-accent-foreground"><Clock className="h-3 w-3 mr-1" />En attente</Badge>;
      case "rejected":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejeté</Badge>;
      default:
        return <Badge variant="outline">{status || "Inconnu"}</Badge>;
    }
  };

  const updateNfcTag = async () => {
    if (!selectedDriver) return;
    
    const tagNum = parseInt(nfcTagNumber);
    if (isNaN(tagNum) || tagNum < 1 || tagNum > 9999) {
      toast.error("Le numéro doit être entre 1 et 9999");
      return;
    }

    const formattedTag = `NFC-${String(tagNum).padStart(4, '0')}`;
    
    setIsUpdatingNfc(true);
    try {
      const { error } = await supabase
        .from("drivers")
        .update({ nfc_tag_number: formattedTag })
        .eq("id", selectedDriver.id);

      if (error) throw error;

      toast.success(`Tag ${formattedTag} enregistré avec succès`);
      setDialogOpen(false);
      setSelectedDriver(null);
      setNfcTagNumber("");
      fetchDrivers();
    } catch (err) {
      console.error("Erreur mise à jour NFC:", err);
      toast.error("Erreur lors de l'enregistrement du tag NFC");
    } finally {
      setIsUpdatingNfc(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Statistiques */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="p-4">
          <div className="text-2xl font-bold">{stats.total}</div>
          <div className="text-xs text-muted-foreground">Total chauffeurs</div>
        </Card>
        <Card className="p-4 border-primary/30">
          <div className="text-2xl font-bold text-primary">{stats.withNfc}</div>
          <div className="text-xs text-muted-foreground">Avec NFC</div>
        </Card>
        <Card className="p-4 border-accent/30">
          <div className="text-2xl font-bold text-accent-foreground">{stats.withoutNfc}</div>
          <div className="text-xs text-muted-foreground">Sans NFC</div>
        </Card>
        <Card className="p-4 border-secondary/50">
          <div className="text-2xl font-bold text-secondary-foreground">{stats.validated}</div>
          <div className="text-xs text-muted-foreground">Validés</div>
        </Card>
        <Card className="p-4 border-muted">
          <div className="text-2xl font-bold text-muted-foreground">{stats.pending}</div>
          <div className="text-xs text-muted-foreground">En attente</div>
        </Card>
      </div>

      {/* Card principale */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Gestion NFC Chauffeurs
              </CardTitle>
              <CardDescription>
                Recherchez un chauffeur et copiez son lien profil public pour configurer sa plaque NFC
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={fetchDrivers} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Actualiser
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filtres */}
          <div className="flex flex-col md:flex-row gap-3">
            {/* Recherche */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom, email, code chauffeur, téléphone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {/* Filtre statut */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[160px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous statuts</SelectItem>
                <SelectItem value="validated">Validés</SelectItem>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="rejected">Rejetés</SelectItem>
              </SelectContent>
            </Select>

            {/* Filtre NFC */}
            <Select value={nfcFilter} onValueChange={setNfcFilter}>
              <SelectTrigger className="w-full md:w-[160px]">
                <Tag className="h-4 w-4 mr-2" />
                <SelectValue placeholder="NFC" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="with">Avec NFC</SelectItem>
                <SelectItem value="without">Sans NFC</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filteredDrivers.length !== drivers.length && (
            <p className="text-sm text-muted-foreground">
              {filteredDrivers.length} résultat(s) sur {drivers.length}
            </p>
          )}

          {/* Table */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Chauffeur</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Lien Profil Public</TableHead>
                  <TableHead>Tag NFC</TableHead>
                  <TableHead>Inscription</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDrivers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Aucun chauffeur trouvé
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDrivers.map((driver) => {
                    const profileLink = getPublicProfileLink(driver.id);
                    return (
                      <TableRow key={driver.id}>
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-xs">
                            {driver.driver_code || `DRV-${driver.id.slice(0, 6).toUpperCase()}`}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div>
                              <div className="font-medium flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {driver.profile?.full_name || "Chauffeur"}
                              </div>
                              {driver.company_name && (
                                <div className="text-xs text-muted-foreground">
                                  {driver.company_name}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1 text-sm">
                            {(driver.contact_email || driver.profile?.email) && (
                              <div className="flex items-center gap-1">
                                <Mail className="h-3 w-3 text-muted-foreground" />
                                <span className="text-xs truncate max-w-[150px]">
                                  {driver.contact_email || driver.profile?.email}
                                </span>
                              </div>
                            )}
                            {(driver.contact_phone || driver.profile?.phone) && (
                              <div className="flex items-center gap-1">
                                <Phone className="h-3 w-3 text-muted-foreground" />
                                <span className="text-xs">{driver.contact_phone || driver.profile?.phone}</span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(driver.status)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <code className="text-xs bg-muted px-2 py-1 rounded max-w-[180px] truncate block">
                              {profileLink}
                            </code>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7"
                              onClick={() => copyToClipboard(profileLink)}
                              title="Copier le lien"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7"
                              onClick={() => window.open(profileLink, "_blank")}
                              title="Ouvrir le profil"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          {driver.nfc_tag_number ? (
                            <Badge className="gap-1 bg-primary">
                              <Tag className="h-3 w-3" />
                              {driver.nfc_tag_number}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">Non assigné</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {format(new Date(driver.created_at), "dd/MM/yy", { locale: fr })}
                        </TableCell>
                        <TableCell>
                          <Dialog 
                            open={dialogOpen && selectedDriver?.id === driver.id} 
                            onOpenChange={(open) => {
                              setDialogOpen(open);
                              if (!open) {
                                setSelectedDriver(null);
                                setNfcTagNumber("");
                              }
                            }}
                          >
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedDriver(driver);
                                  setNfcTagNumber(driver.nfc_tag_number?.replace("NFC-", "").replace(/^0+/, "") || "");
                                  setDialogOpen(true);
                                }}
                              >
                                <Tag className="h-4 w-4 mr-1" />
                                {driver.nfc_tag_number ? "Modifier" : "Assigner"}
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                  <Tag className="h-5 w-5" />
                                  Assigner un tag NFC
                                </DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                                  <p className="font-medium">{driver.profile?.full_name || "Chauffeur"}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {driver.driver_code || `DRV-${driver.id.slice(0, 6).toUpperCase()}`}
                                  </p>
                                  <div className="pt-2 border-t">
                                    <Label className="text-xs text-muted-foreground">Lien profil public (à programmer dans le NFC)</Label>
                                    <div className="flex items-center gap-2 mt-1">
                                      <code className="text-xs bg-background px-2 py-1 rounded flex-1 truncate">
                                        {getPublicProfileLink(driver.id)}
                                      </code>
                                      <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-7 w-7"
                                        onClick={() => copyToClipboard(getPublicProfileLink(driver.id))}
                                      >
                                        <Copy className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="space-y-2">
                                  <Label htmlFor="nfc-number">Numéro du tag NFC (1-9999)</Label>
                                  <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground font-mono">NFC-</span>
                                    <Input
                                      id="nfc-number"
                                      type="number"
                                      min={1}
                                      max={9999}
                                      placeholder="0001"
                                      value={nfcTagNumber}
                                      onChange={(e) => setNfcTagNumber(e.target.value)}
                                      className="font-mono"
                                    />
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    Ce numéro permet d'identifier physiquement la plaque NFC
                                  </p>
                                </div>

                                <div className="flex justify-end gap-2 pt-2">
                                  <Button
                                    variant="outline"
                                    onClick={() => {
                                      setDialogOpen(false);
                                      setSelectedDriver(null);
                                      setNfcTagNumber("");
                                    }}
                                  >
                                    Annuler
                                  </Button>
                                  <Button
                                    onClick={updateNfcTag}
                                    disabled={isUpdatingNfc || !nfcTagNumber}
                                  >
                                    {isUpdatingNfc ? (
                                      <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Enregistrement...
                                      </>
                                    ) : (
                                      <>
                                        <Tag className="h-4 w-4 mr-2" />
                                        Enregistrer
                                      </>
                                    )}
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDriversNfcManager;
