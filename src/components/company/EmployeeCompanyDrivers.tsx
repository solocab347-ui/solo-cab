import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { 
  Car, 
  Phone, 
  Mail,
  Star, 
  MapPin, 
  Loader2, 
  Search, 
  UserPlus,
  CheckCircle2,
  Users,
  Building2,
  Sparkles,
  X,
  Eye,
  ArrowRight,
  Clock,
  AlertCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DriverProfileDialog } from "@/components/DriverProfileDialog";
import { DriverSearchFilters, DriverSearchFiltersState, defaultFilters } from "./DriverSearchFilters";

interface Driver {
  id: string;
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  card_photo_url: string | null;
  working_sectors: string[] | null;
  vehicle_model: string | null;
  rating: number | null;
  total_rides: number | null;
  contact_phone: string | null;
  contact_email: string | null;
  show_phone: boolean;
  show_email: boolean;
  show_rating_partners: boolean;
  display_driver_name: boolean;
  display_company_name: boolean;
  services_offered: string[] | null;
  company_name: string | null;
  city?: string | null;
  department?: string | null;
}

interface EmployeeCompanyDriversProps {
  companyId: string;
  canInviteDrivers: boolean;
  canCreateCourses: boolean;
}

export function EmployeeCompanyDrivers({ companyId, canInviteDrivers, canCreateCourses }: EmployeeCompanyDriversProps) {
  const navigate = useNavigate();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchFilters, setSearchFilters] = useState<DriverSearchFiltersState>(defaultFilters);
  const [searchResults, setSearchResults] = useState<Driver[]>([]);
  const [pendingDriversInSearch, setPendingDriversInSearch] = useState<Driver[]>([]);
  const [searching, setSearching] = useState(false);
  const [proposingDriver, setProposingDriver] = useState<string | null>(null);
  const [pendingProposals, setPendingProposals] = useState<string[]>([]);
  const [activeView, setActiveView] = useState<"partners" | "search">("partners");
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [profileDialogDriverId, setProfileDialogDriverId] = useState<string | null>(null);
  
  // Filtres pour les partenaires
  const [partnerSearchQuery, setPartnerSearchQuery] = useState("");

  useEffect(() => {
    fetchCompanyDrivers();
    fetchPendingProposals();
  }, [companyId]);

  const fetchCompanyDrivers = async () => {
    try {
      setLoading(true);
      
      // Récupérer les accords acceptés
      const { data: agreements, error: agreementsError } = await supabase
        .from("company_driver_agreements")
        .select("driver_id")
        .eq("company_id", companyId)
        .eq("status", "accepted");

      if (agreementsError) {
        console.error("Agreements error:", agreementsError);
        throw agreementsError;
      }

      if (!agreements || agreements.length === 0) {
        setDrivers([]);
        setLoading(false);
        return;
      }

      const driverIds = agreements.map(a => a.driver_id);

      // Récupérer les chauffeurs
      const { data: driversData, error: driversError } = await supabase
        .from("drivers")
        .select("id, user_id, working_sectors, vehicle_model, rating, total_rides, contact_phone, contact_email, show_phone, show_email, show_rating_partners, display_driver_name, display_company_name, card_photo_url, services_offered, company_name")
        .in("id", driverIds);

      if (driversError) {
        console.error("Drivers error:", driversError);
        throw driversError;
      }

      // Enrichir avec les profils
      const enrichedDrivers: Driver[] = [];
      for (const driver of driversData || []) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, avatar_url")
          .eq("id", driver.user_id)
          .maybeSingle();

        enrichedDrivers.push({
          id: driver.id,
          user_id: driver.user_id,
          full_name: profile?.full_name || "Chauffeur",
          avatar_url: profile?.avatar_url || null,
          card_photo_url: driver.card_photo_url || null,
          working_sectors: driver.working_sectors,
          vehicle_model: driver.vehicle_model,
          rating: driver.rating,
          total_rides: driver.total_rides,
          contact_phone: driver.contact_phone,
          contact_email: driver.contact_email,
          show_phone: driver.show_phone ?? false,
          show_email: driver.show_email ?? false,
          show_rating_partners: driver.show_rating_partners ?? false,
          display_driver_name: driver.display_driver_name ?? true,
          display_company_name: driver.display_company_name ?? true,
          services_offered: driver.services_offered,
          company_name: driver.company_name,
        });
      }

      setDrivers(enrichedDrivers);
    } catch (error) {
      console.error("Erreur chargement chauffeurs:", error);
      toast.error("Erreur lors du chargement des chauffeurs");
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingProposals = async () => {
    try {
      const { data, error } = await supabase
        .from("company_driver_agreements")
        .select("driver_id")
        .eq("company_id", companyId)
        .eq("status", "pending");

      if (!error && data) {
        setPendingProposals(data.map(d => d.driver_id));
      }
    } catch (error) {
      console.error("Erreur récupération propositions:", error);
    }
  };

  const searchPublicDrivers = async () => {
    setSearching(true);
    try {
      let driversData: any[] = [];
      const { searchQuery, region, department, city, vehicleType } = searchFilters;

      // Construire la requête de base
      let query = supabase
        .from("drivers")
        .select("id, user_id, vehicle_model, rating, total_rides, contact_phone, contact_email, show_phone, show_email, show_rating_partners, display_driver_name, display_company_name, card_photo_url, services_offered, working_sectors, company_name, city, department")
        .eq("status", "validated")
        .eq("visible_to_companies", true);

      // Filtres géographiques
      if (city) {
        query = query.ilike("city", `%${city}%`);
      }
      if (department) {
        // Extraire le numéro de département si présent (ex: "Essonne (91)" -> "91")
        const deptMatch = department.match(/\((\d+[AB]?)\)/);
        const deptCode = deptMatch ? deptMatch[1] : department;
        query = query.or(`department.ilike.%${deptCode}%,working_sectors.cs.{"${department}"}`);
      }
      if (region) {
        query = query.or(`working_sectors.cs.{"${region}"}`);
      }
      
      // Filtre type de véhicule
      if (vehicleType) {
        query = query.ilike("vehicle_model", `%${vehicleType}%`);
      }

      if (!searchQuery.trim()) {
        // Afficher tous les chauffeurs visibles aux entreprises
        const { data, error } = await query.limit(50);
        if (error) throw error;
        driversData = data || [];
      } else {
        // Rechercher par nom (via les profils) ou par company_name
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .ilike("full_name", `%${searchQuery}%`)
          .limit(50);

        const profileUserIds = (profiles || []).map(p => p.id);
        
        // Chauffeurs trouvés par nom d'entreprise
        const { data: byCompany, error } = await query
          .ilike("company_name", `%${searchQuery}%`)
          .limit(50);

        if (error) throw error;

        // Chauffeurs trouvés par nom
        let byName: any[] = [];
        if (profileUserIds.length > 0) {
          const { data: nameData } = await supabase
            .from("drivers")
            .select("id, user_id, vehicle_model, rating, total_rides, contact_phone, contact_email, show_phone, show_email, show_rating_partners, display_driver_name, display_company_name, card_photo_url, services_offered, working_sectors, company_name, city, department")
            .eq("status", "validated")
            .eq("visible_to_companies", true)
            .in("user_id", profileUserIds);
          byName = nameData || [];
        }

        // Fusionner et dédupliquer
        const allDrivers = [...(byCompany || []), ...byName];
        driversData = allDrivers.filter((driver, index, self) => 
          index === self.findIndex(d => d.id === driver.id)
        );
      }

      // Séparer les chauffeurs déjà partenaires et ceux en attente
      const partnerIds = drivers.map(d => d.id);
      const availableDrivers = driversData.filter(d => !partnerIds.includes(d.id) && !pendingProposals.includes(d.id));
      const pendingDrivers = driversData.filter(d => pendingProposals.includes(d.id));

      // Enrichir les chauffeurs disponibles
      const enriched: Driver[] = [];
      for (const driver of availableDrivers) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, avatar_url")
          .eq("id", driver.user_id)
          .maybeSingle();

        enriched.push({
          id: driver.id,
          user_id: driver.user_id,
          full_name: profile?.full_name || "Chauffeur",
          avatar_url: profile?.avatar_url || null,
          card_photo_url: driver.card_photo_url || null,
          working_sectors: driver.working_sectors,
          vehicle_model: driver.vehicle_model,
          rating: driver.rating,
          total_rides: driver.total_rides,
          contact_phone: driver.contact_phone,
          contact_email: driver.contact_email,
          show_phone: driver.show_phone ?? false,
          show_email: driver.show_email ?? false,
          show_rating_partners: driver.show_rating_partners ?? false,
          display_driver_name: driver.display_driver_name ?? true,
          display_company_name: driver.display_company_name ?? true,
          services_offered: driver.services_offered,
          company_name: driver.company_name,
          city: driver.city,
          department: driver.department,
        });
      }

      // Enrichir les chauffeurs en attente
      const enrichedPending: Driver[] = [];
      for (const driver of pendingDrivers) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, avatar_url")
          .eq("id", driver.user_id)
          .maybeSingle();

        enrichedPending.push({
          id: driver.id,
          user_id: driver.user_id,
          full_name: profile?.full_name || "Chauffeur",
          avatar_url: profile?.avatar_url || null,
          card_photo_url: driver.card_photo_url || null,
          working_sectors: driver.working_sectors,
          vehicle_model: driver.vehicle_model,
          rating: driver.rating,
          total_rides: driver.total_rides,
          contact_phone: driver.contact_phone,
          contact_email: driver.contact_email,
          show_phone: driver.show_phone ?? false,
          show_email: driver.show_email ?? false,
          show_rating_partners: driver.show_rating_partners ?? false,
          display_driver_name: driver.display_driver_name ?? true,
          display_company_name: driver.display_company_name ?? true,
          services_offered: driver.services_offered,
          company_name: driver.company_name,
          city: driver.city,
          department: driver.department,
        });
      }

      setSearchResults(enriched);
      setPendingDriversInSearch(enrichedPending);
    } catch (error) {
      console.error("Erreur recherche:", error);
      toast.error("Erreur lors de la recherche");
    } finally {
      setSearching(false);
    }
  };

  const proposeDriver = async (driverId: string) => {
    setProposingDriver(driverId);
    try {
      const { error } = await supabase
        .from("company_driver_agreements")
        .insert({
          company_id: companyId,
          driver_id: driverId,
          status: "pending",
          proposed_by: "company",
          payment_methods: ["transfer", "card"],
        });

      if (error) {
        if (error.code === "23505") {
          toast.error("Ce chauffeur a déjà été proposé à votre entreprise");
        } else {
          throw error;
        }
        return;
      }

      toast.success("Proposition envoyée au chauffeur !", {
        description: "Le chauffeur recevra une notification et pourra accepter votre invitation."
      });
      
      // Mettre à jour les états
      setPendingProposals(prev => [...prev, driverId]);
      setSearchResults(prev => prev.filter(d => d.id !== driverId));
    } catch (error) {
      console.error("Erreur proposition:", error);
      toast.error("Erreur lors de l'envoi de la proposition");
    } finally {
      setProposingDriver(null);
    }
  };

  const handleBookDriver = (driverId: string) => {
    navigate(`/book-driver/${driverId}`);
  };

  // Charger les chauffeurs disponibles quand on passe à l'onglet recherche
  useEffect(() => {
    if (activeView === "search" && searchResults.length === 0 && !searching) {
      searchPublicDrivers();
    }
  }, [activeView]);

  const getMainSector = (sectors: string[] | null) => {
    if (!sectors || sectors.length === 0) return null;
    return sectors[0];
  };

  // Helper pour calculer le nom d'affichage en respectant les préférences du chauffeur
  const getDisplayName = (driver: Driver): string => {
    if (driver.display_driver_name) {
      return driver.full_name;
    } else if (driver.display_company_name && driver.company_name) {
      return driver.company_name;
    }
    return "Chauffeur VTC";
  };

  // Helper pour obtenir la meilleure photo disponible
  const getDriverPhoto = (driver: Driver): string | null => {
    return driver.card_photo_url || driver.avatar_url || null;
  };

  if (loading) {
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardContent className="flex items-center justify-center py-16">
          <div className="text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-primary/20 flex items-center justify-center animate-pulse">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">Chargement des chauffeurs...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header avec onglets */}
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-lg overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-primary via-accent to-success" />
        <CardContent className="p-6">
          <Tabs value={activeView} onValueChange={(v) => setActiveView(v as "partners" | "search")} className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Chauffeurs de l'entreprise
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Gérez les chauffeurs partenaires de votre entreprise
                </p>
              </div>
              
              <TabsList className="bg-muted/50 p-1 rounded-xl">
                <TabsTrigger 
                  value="partners" 
                  className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Partenaires ({drivers.length})
                </TabsTrigger>
                {canInviteDrivers && (
                  <TabsTrigger 
                    value="search" 
                    className="rounded-lg data-[state=active]:bg-accent data-[state=active]:text-accent-foreground"
                  >
                    <Search className="w-4 h-4 mr-2" />
                    Rechercher un partenaire
                  </TabsTrigger>
                )}
              </TabsList>
            </div>

            {/* Liste des partenaires */}
            <TabsContent value="partners" className="mt-6 animate-fade-in">
              {drivers.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 mx-auto rounded-3xl bg-muted/50 flex items-center justify-center mb-6">
                    <Users className="w-10 h-10 text-muted-foreground" />
                  </div>
                  <h3 className="font-bold text-lg mb-2">Aucun chauffeur partenaire</h3>
                  <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto">
                    Votre entreprise n'a pas encore de chauffeurs partenaires. Recherchez des chauffeurs pour les inviter.
                  </p>
                  {canInviteDrivers && (
                    <Button 
                      onClick={() => setActiveView("search")}
                      className="bg-gradient-to-r from-primary to-accent"
                    >
                      <Search className="w-4 h-4 mr-2" />
                      Rechercher des chauffeurs
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {drivers.map((driver, index) => (
                    <Card 
                      key={driver.id} 
                      className="group relative overflow-hidden border-border/50 bg-gradient-to-br from-muted/20 to-transparent hover:shadow-lg transition-all hover:scale-[1.02]"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:bg-primary/10 transition-colors" />
                      <CardContent className="pt-6 relative">
                        <div className="flex items-start gap-4">
                          <Avatar className="w-14 h-14 ring-2 ring-primary/20 ring-offset-2 ring-offset-background">
                            <AvatarImage src={getDriverPhoto(driver) || undefined} />
                            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 text-primary font-bold">
                              {getDisplayName(driver).slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold truncate">{getDisplayName(driver)}</h3>
                            {driver.display_company_name && driver.company_name && driver.display_driver_name && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                <Building2 className="w-3 h-3" />
                                {driver.company_name}
                              </p>
                            )}
                            {getMainSector(driver.working_sectors) && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {getMainSector(driver.working_sectors)}
                              </p>
                            )}
                            {driver.show_rating_partners && driver.rating && driver.rating > 0 && (
                              <div className="flex items-center gap-1 mt-1">
                                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                                <span className="text-sm font-semibold">{driver.rating.toFixed(1)}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {driver.vehicle_model && (
                          <Badge variant="secondary" className="mt-3 bg-primary/10 text-primary border-primary/20">
                            <Car className="w-3 h-3 mr-1" />
                            {driver.vehicle_model}
                          </Badge>
                        )}

                        {/* Contact buttons */}
                        <div className="flex flex-wrap gap-2 mt-3">
                          {driver.show_phone && driver.contact_phone && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="h-8 text-xs border-primary/20 hover:bg-primary/10"
                              onClick={() => window.open(`tel:${driver.contact_phone}`, "_blank")}
                            >
                              <Phone className="w-3 h-3 mr-1" />
                              Appeler
                            </Button>
                          )}
                          {driver.show_email && driver.contact_email && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="h-8 text-xs border-primary/20 hover:bg-primary/10"
                              onClick={() => window.open(`mailto:${driver.contact_email}`, "_blank")}
                            >
                              <Mail className="w-3 h-3 mr-1" />
                              Email
                            </Button>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex gap-2 mt-3">
                          {canCreateCourses && (
                            <Button 
                              size="sm" 
                              className="flex-1 bg-gradient-to-r from-primary to-primary-light"
                              onClick={() => handleBookDriver(driver.id)}
                            >
                              Réserver
                              <ArrowRight className="w-4 h-4 ml-1" />
                            </Button>
                          )}
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="border-accent/30 hover:bg-accent/10"
                            onClick={() => setProfileDialogDriverId(driver.id)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Profil
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Recherche de chauffeurs */}
            {canInviteDrivers && (
              <TabsContent value="search" className="mt-6 animate-fade-in">
                <div className="space-y-6">
                  {/* Filtres de recherche avancés */}
                  <DriverSearchFilters
                    filters={searchFilters}
                    onFiltersChange={setSearchFilters}
                    onSearch={searchPublicDrivers}
                    searching={searching}
                  />

                  {/* Résultats */}
                  {searching ? (
                    <div className="text-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
                      <p className="text-muted-foreground">Recherche en cours...</p>
                    </div>
                  ) : (searchResults.length > 0 || pendingDriversInSearch.length > 0) ? (
                    <div className="space-y-6">
                      {/* Section des demandes en attente */}
                      {pendingDriversInSearch.length > 0 && (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-amber-500" />
                            <h3 className="font-semibold text-sm text-amber-600">Demandes en attente ({pendingDriversInSearch.length})</h3>
                          </div>
                          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {pendingDriversInSearch.map((driver, index) => (
                              <Card 
                                key={driver.id}
                                className="group relative overflow-hidden border-amber-200/50 bg-gradient-to-br from-amber-50/50 to-transparent"
                                style={{ animationDelay: `${index * 50}ms` }}
                              >
                                <div className="absolute top-2 right-2">
                                  <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300 text-xs">
                                    <Clock className="w-3 h-3 mr-1" />
                                    En attente
                                  </Badge>
                                </div>
                                <CardContent className="pt-6">
                                  <div className="flex items-start gap-4">
                                    <Avatar className="w-12 h-12 ring-2 ring-amber-200 ring-offset-2 ring-offset-background">
                                      <AvatarImage src={getDriverPhoto(driver) || undefined} />
                                      <AvatarFallback className="bg-gradient-to-br from-amber-100 to-amber-200 text-amber-700 font-bold">
                                        {getDisplayName(driver).slice(0, 2).toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                      <h3 className="font-bold truncate">{getDisplayName(driver)}</h3>
                                      {(driver.city || getMainSector(driver.working_sectors)) && (
                                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                                          <MapPin className="w-3 h-3" />
                                          {driver.city || getMainSector(driver.working_sectors)}
                                        </p>
                                      )}
                                      {driver.show_rating_partners && driver.rating && driver.rating > 0 && (
                                        <div className="flex items-center gap-1 mt-1">
                                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                          <span className="text-sm font-medium">{driver.rating.toFixed(1)}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {driver.display_company_name && driver.company_name && (
                                    <Badge variant="outline" className="mt-3 text-xs">
                                      <Building2 className="w-3 h-3 mr-1" />
                                      {driver.company_name}
                                    </Badge>
                                  )}

                                  <div className="flex gap-2 mt-4">
                                    <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-100/50 text-amber-700 text-xs">
                                      <AlertCircle className="w-4 h-4" />
                                      <span>Invitation envoyée</span>
                                    </div>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setSelectedDriver(driver)}
                                      className="border-amber-200 hover:bg-amber-50"
                                    >
                                      <Eye className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Section des chauffeurs disponibles */}
                      {searchResults.length > 0 && (
                        <div className="space-y-3">
                          {pendingDriversInSearch.length > 0 && (
                            <div className="flex items-center gap-2">
                              <UserPlus className="w-4 h-4 text-accent" />
                              <h3 className="font-semibold text-sm">Chauffeurs disponibles ({searchResults.length})</h3>
                            </div>
                          )}
                          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {searchResults.map((driver, index) => (
                              <Card 
                                key={driver.id}
                                className="group relative overflow-hidden border-border/50 bg-gradient-to-br from-accent/5 to-transparent hover:shadow-lg transition-all hover:scale-[1.02]"
                                style={{ animationDelay: `${index * 50}ms` }}
                              >
                                <CardContent className="pt-6">
                                  <div className="flex items-start gap-4">
                                    <Avatar className="w-12 h-12 ring-2 ring-accent/20 ring-offset-2 ring-offset-background">
                                      <AvatarImage src={getDriverPhoto(driver) || undefined} />
                                      <AvatarFallback className="bg-gradient-to-br from-accent/20 to-success/20 text-accent font-bold">
                                        {getDisplayName(driver).slice(0, 2).toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                      <h3 className="font-bold truncate">{getDisplayName(driver)}</h3>
                                      {(driver.city || getMainSector(driver.working_sectors)) && (
                                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                                          <MapPin className="w-3 h-3" />
                                          {driver.city || getMainSector(driver.working_sectors)}
                                        </p>
                                      )}
                                      {driver.show_rating_partners && driver.rating && driver.rating > 0 && (
                                        <div className="flex items-center gap-1 mt-1">
                                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                          <span className="text-sm font-medium">{driver.rating.toFixed(1)}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {driver.display_company_name && driver.company_name && (
                                    <Badge variant="outline" className="mt-3 text-xs">
                                      <Building2 className="w-3 h-3 mr-1" />
                                      {driver.company_name}
                                    </Badge>
                                  )}

                                  <div className="flex gap-2 mt-4">
                                    <Button
                                      size="sm"
                                      onClick={() => proposeDriver(driver.id)}
                                      disabled={proposingDriver === driver.id}
                                      className="flex-1 bg-gradient-to-r from-accent to-success"
                                    >
                                      {proposingDriver === driver.id ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                      ) : (
                                        <>
                                          <UserPlus className="w-4 h-4 mr-1" />
                                          Inviter
                                        </>
                                      )}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setSelectedDriver(driver)}
                                      className="border-accent/20 hover:bg-accent/10"
                                    >
                                      <Eye className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 mx-auto rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                        <Search className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <h3 className="font-semibold mb-2">
                        {searchFilters.searchQuery || searchFilters.region || searchFilters.city ? "Aucun résultat" : "Recherchez des chauffeurs"}
                      </h3>
                      <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                        {searchFilters.searchQuery || searchFilters.region || searchFilters.city 
                          ? "Aucun chauffeur disponible ne correspond à vos critères."
                          : "Utilisez les filtres pour trouver des chauffeurs à inviter dans votre cercle."
                        }
                      </p>
                    </div>
                  )}

                  {/* Info box */}
                  <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-primary">Cercle de chauffeurs partagé</p>
                      <p className="text-muted-foreground mt-1">
                        Lorsque vous invitez un chauffeur, il devient visible par tous les collaborateurs et administrateurs de votre entreprise une fois qu'il accepte.
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>
            )}
          </Tabs>
        </CardContent>
      </Card>

      {/* Dialog de détail chauffeur */}
      <Dialog open={!!selectedDriver} onOpenChange={() => setSelectedDriver(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Profil du chauffeur</DialogTitle>
          </DialogHeader>
          {selectedDriver && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="w-16 h-16">
                  <AvatarImage src={selectedDriver.avatar_url || undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 text-lg font-bold">
                    {selectedDriver.full_name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-bold text-lg">{selectedDriver.full_name}</h3>
                  {getMainSector(selectedDriver.working_sectors) && (
                    <p className="text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {getMainSector(selectedDriver.working_sectors)}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {selectedDriver.rating && selectedDriver.rating > 0 && (
                  <div className="p-3 rounded-xl bg-muted/30">
                    <p className="text-xs text-muted-foreground">Note</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                      <span className="font-bold">{selectedDriver.rating.toFixed(1)}</span>
                    </div>
                  </div>
                )}
                {selectedDriver.vehicle_model && (
                  <div className="p-3 rounded-xl bg-muted/30">
                    <p className="text-xs text-muted-foreground">Véhicule</p>
                    <p className="font-medium mt-1">{selectedDriver.vehicle_model}</p>
                  </div>
                )}
              </div>

              {selectedDriver.services_offered && selectedDriver.services_offered.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Services proposés</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedDriver.services_offered.slice(0, 5).map((service, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {service}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <DialogFooter>
                <Button
                  onClick={() => {
                    proposeDriver(selectedDriver.id);
                    setSelectedDriver(null);
                  }}
                  disabled={proposingDriver === selectedDriver.id}
                  className="w-full bg-gradient-to-r from-accent to-success"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Inviter ce chauffeur
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog profil public complet */}
      <DriverProfileDialog
        driverId={profileDialogDriverId}
        open={!!profileDialogDriverId}
        onOpenChange={(open) => !open && setProfileDialogDriverId(null)}
      />
    </div>
  );
}
