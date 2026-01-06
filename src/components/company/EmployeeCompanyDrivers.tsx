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
  User,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DriverProfileDialog } from "@/components/DriverProfileDialog";
import { DriverSearchFilters, DriverSearchFiltersState, defaultFilters } from "./DriverSearchFilters";
import { VEHICLE_EQUIPMENT, DRIVER_SERVICES } from "@/lib/vehicleEquipment";

interface Driver {
  id: string;
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  card_photo_url: string | null;
  working_sectors: string[] | null;
  vehicle_model: string | null;
  vehicle_brand: string | null;
  vehicle_color: string | null;
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
  bio: string | null;
  vehicle_equipment: string[] | null;
}

interface PendingAgreement {
  driver_id: string;
  created_by_user_id: string | null;
  created_by_name: string | null;
  is_admin: boolean;
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
  const [pendingProposals, setPendingProposals] = useState<PendingAgreement[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<"partners" | "search">("partners");
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [profileDialogDriverId, setProfileDialogDriverId] = useState<string | null>(null);
  
  // Filtres pour les partenaires
  const [partnerSearchQuery, setPartnerSearchQuery] = useState("");

  useEffect(() => {
    const initData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }
      fetchCompanyDrivers();
      fetchPendingProposals();
    };
    initData();
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
        .select("id, user_id, working_sectors, vehicle_model, vehicle_brand, vehicle_color, rating, total_rides, contact_phone, contact_email, show_phone, show_email, show_rating_partners, display_driver_name, display_company_name, card_photo_url, services_offered, company_name, bio, vehicle_equipment")
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
          vehicle_brand: driver.vehicle_brand,
          vehicle_color: driver.vehicle_color,
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
          bio: driver.bio,
          vehicle_equipment: driver.vehicle_equipment,
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
        .select("driver_id, created_by_user_id")
        .eq("company_id", companyId)
        .eq("status", "pending");

      if (!error && data) {
        // Enrichir avec les infos de l'utilisateur qui a créé la demande
        const enrichedProposals: PendingAgreement[] = [];
        for (const proposal of data) {
          let creatorName: string | null = null;
          let isAdmin = false;
          
          if (proposal.created_by_user_id) {
            // Vérifier si c'est un administrateur
            const { data: adminData } = await supabase
              .from("company_administrators")
              .select("admin_type, user_id")
              .eq("company_id", companyId)
              .eq("user_id", proposal.created_by_user_id)
              .eq("is_active", true)
              .maybeSingle();
            
            if (adminData) {
              isAdmin = true;
            }
            
            // Récupérer le nom
            const { data: profile } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("id", proposal.created_by_user_id)
              .maybeSingle();
            
            creatorName = profile?.full_name || null;
          }
          
          enrichedProposals.push({
            driver_id: proposal.driver_id,
            created_by_user_id: proposal.created_by_user_id,
            created_by_name: creatorName,
            is_admin: isAdmin,
          });
        }
        setPendingProposals(enrichedProposals);
      }
    } catch (error) {
      console.error("Erreur récupération propositions:", error);
    }
  };
  
  // Helper pour obtenir le label de qui a fait la demande
  const getRequestedByLabel = (driverId: string): string | null => {
    const proposal = pendingProposals.find(p => p.driver_id === driverId);
    if (!proposal) return null;
    
    if (proposal.created_by_user_id === currentUserId) {
      return "Demande faite par vous";
    }
    
    if (proposal.is_admin) {
      return "Demande faite par l'administrateur";
    }
    
    if (proposal.created_by_name) {
      return `Demande faite par ${proposal.created_by_name}`;
    }
    
    return "Demande en cours";
  };
  
  // Helper pour vérifier si un chauffeur est en attente
  const isPendingDriver = (driverId: string): boolean => {
    return pendingProposals.some(p => p.driver_id === driverId);
  };

  const searchPublicDrivers = async () => {
    setSearching(true);
    try {
      let driversData: any[] = [];
      const { searchQuery, region, department, city, vehicleType } = searchFilters;

      // Construire la requête de base - sans city et department qui n'existent pas dans la table drivers
      let query = supabase
        .from("drivers")
        .select("id, user_id, vehicle_model, vehicle_brand, vehicle_color, rating, total_rides, contact_phone, contact_email, show_phone, show_email, show_rating_partners, display_driver_name, display_company_name, card_photo_url, services_offered, working_sectors, company_name, bio, vehicle_equipment")
        .eq("status", "validated")
        .eq("visible_to_companies", true);

      // Filtres géographiques basés sur working_sectors
      if (city) {
        query = query.contains("working_sectors", [city]);
      }
      if (department) {
        // Extraire le numéro de département si présent (ex: "Essonne (91)" -> "91")
        const deptMatch = department.match(/\((\d+[AB]?)\)/);
        const deptCode = deptMatch ? deptMatch[1] : department;
        // Rechercher dans working_sectors avec le département complet ou le code
        query = query.or(`working_sectors.cs.{"${department}"},working_sectors.cs.{"${deptCode}"}`);
      }
      if (region) {
        query = query.contains("working_sectors", [region]);
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
            .select("id, user_id, vehicle_model, vehicle_brand, vehicle_color, rating, total_rides, contact_phone, contact_email, show_phone, show_email, show_rating_partners, display_driver_name, display_company_name, card_photo_url, services_offered, working_sectors, company_name, bio, vehicle_equipment")
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
      const pendingDriverIds = pendingProposals.map(p => p.driver_id);
      const availableDrivers = driversData.filter(d => !partnerIds.includes(d.id) && !pendingDriverIds.includes(d.id));
      const pendingDrivers = driversData.filter(d => pendingDriverIds.includes(d.id));

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
          vehicle_brand: driver.vehicle_brand || null,
          vehicle_color: driver.vehicle_color || null,
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
          bio: driver.bio || null,
          vehicle_equipment: driver.vehicle_equipment || null,
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
          vehicle_brand: driver.vehicle_brand || null,
          vehicle_color: driver.vehicle_color || null,
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
          bio: driver.bio || null,
          vehicle_equipment: driver.vehicle_equipment || null,
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
          created_by_user_id: currentUserId,
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
      const newProposal: PendingAgreement = {
        driver_id: driverId,
        created_by_user_id: currentUserId,
        created_by_name: "Vous",
        is_admin: false, // sera mis à jour au prochain fetch
      };
      setPendingProposals(prev => [...prev, newProposal]);
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

  // Helper pour calculer le nom d'affichage - contexte B2B, on affiche toujours le nom complet
  const getDisplayName = (driver: Driver): string => {
    // En contexte B2B partenariat, le nom complet est toujours affiché
    if (driver.full_name && driver.full_name !== "Chauffeur") {
      return driver.full_name;
    }
    if (driver.display_company_name && driver.company_name) {
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
        <CardContent className="p-3 sm:p-6">
          <Tabs value={activeView} onValueChange={(v) => setActiveView(v as "partners" | "search")} className="space-y-4 sm:space-y-6">
            <div className="flex flex-col gap-3 sm:gap-4">
              <div>
                <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                  <Users className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                  Chauffeurs de l'entreprise
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  Gérez les chauffeurs partenaires de votre entreprise
                </p>
              </div>
              
              <TabsList className="bg-muted/50 p-1 rounded-xl w-full grid grid-cols-2 h-auto">
                <TabsTrigger 
                  value="partners" 
                  className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs sm:text-sm py-2 px-2 sm:px-4"
                >
                  <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 flex-shrink-0" />
                  <span className="truncate">Partenaires ({drivers.length})</span>
                </TabsTrigger>
                {canInviteDrivers && (
                  <TabsTrigger 
                    value="search" 
                    className="rounded-lg data-[state=active]:bg-accent data-[state=active]:text-accent-foreground text-xs sm:text-sm py-2 px-2 sm:px-4"
                  >
                    <Search className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 flex-shrink-0" />
                    <span className="truncate">Rechercher</span>
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
                    <div className="space-y-4 sm:space-y-6">
                      {/* Section des demandes en attente */}
                      {pendingDriversInSearch.length > 0 && (
                        <div className="space-y-2 sm:space-y-3">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-amber-500" />
                            <h3 className="font-semibold text-xs sm:text-sm text-amber-600">Demandes en attente ({pendingDriversInSearch.length})</h3>
                          </div>
                          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                            {pendingDriversInSearch.map((driver, index) => (
                              <Card 
                                key={driver.id}
                                className="group relative overflow-hidden border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5"
                                style={{ animationDelay: `${index * 50}ms` }}
                              >
                                <div className="absolute top-2 right-2">
                                  <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">
                                    <Clock className="w-3 h-3 mr-1" />
                                    En attente
                                  </Badge>
                                </div>
                                <CardContent className="pt-6 pb-4">
                                  <div className="flex items-start gap-3">
                                    <Avatar className="w-12 h-12 ring-2 ring-primary/30 ring-offset-2 ring-offset-background flex-shrink-0">
                                      <AvatarImage src={getDriverPhoto(driver) || undefined} />
                                      <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 text-primary font-bold">
                                        {getDisplayName(driver).slice(0, 2).toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                      <h3 className="font-bold text-sm truncate">{getDisplayName(driver)}</h3>
                                      {driver.display_company_name && driver.company_name && (
                                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                                          <Building2 className="w-3 h-3 flex-shrink-0" />
                                          <span className="truncate">{driver.company_name}</span>
                                        </p>
                                      )}
                                      {getMainSector(driver.working_sectors) && (
                                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                                          <MapPin className="w-3 h-3 flex-shrink-0" />
                                          <span className="truncate">{getMainSector(driver.working_sectors)}</span>
                                        </p>
                                      )}
                                      {driver.show_rating_partners && driver.rating && driver.rating > 0 && (
                                        <div className="flex items-center gap-1 mt-1">
                                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                          <span className="text-xs font-medium">{driver.rating.toFixed(1)}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  <div className="mt-3 space-y-2">
                                    <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 text-xs">
                                      <Clock className="w-4 h-4 flex-shrink-0 text-primary mt-0.5" />
                                      <div className="flex-1 min-w-0">
                                        <span className="font-medium text-primary">Invitation envoyée</span>
                                        {getRequestedByLabel(driver.id) && (
                                          <p className="text-primary/80 truncate">{getRequestedByLabel(driver.id)}</p>
                                        )}
                                      </div>
                                    </div>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setSelectedDriver(driver)}
                                      className="w-full border-primary/30 hover:bg-primary/10 text-xs"
                                    >
                                      <Eye className="w-3 h-3 mr-2" />
                                      Voir le profil
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
                        <div className="space-y-2 sm:space-y-3">
                          {pendingDriversInSearch.length > 0 && (
                            <div className="flex items-center gap-2">
                              <UserPlus className="w-4 h-4 text-accent" />
                              <h3 className="font-semibold text-xs sm:text-sm">Chauffeurs disponibles ({searchResults.length})</h3>
                            </div>
                          )}
                          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                            {searchResults.map((driver, index) => (
                              <Card 
                                key={driver.id}
                                className="group relative overflow-hidden border-border/50 bg-gradient-to-br from-accent/5 to-transparent hover:shadow-lg transition-all"
                                style={{ animationDelay: `${index * 50}ms` }}
                              >
                                <CardContent className="p-3 sm:p-4">
                                  <div className="flex items-start gap-3">
                                    <Avatar className="w-12 h-12 sm:w-14 sm:h-14 ring-2 ring-accent/20 ring-offset-2 ring-offset-background flex-shrink-0">
                                      <AvatarImage src={getDriverPhoto(driver) || undefined} />
                                      <AvatarFallback className="bg-gradient-to-br from-accent/20 to-success/20 text-accent font-bold text-sm">
                                        {driver.full_name?.slice(0, 2).toUpperCase() || "CH"}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                      {/* Nom du chauffeur */}
                                      <h3 className="font-bold text-sm truncate flex items-center gap-1">
                                        <User className="w-3 h-3 text-accent flex-shrink-0" />
                                        {driver.full_name || "Chauffeur"}
                                      </h3>
                                      {/* Entreprise */}
                                      {driver.display_company_name && driver.company_name && (
                                        <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                                          <Building2 className="w-3 h-3 flex-shrink-0" />
                                          {driver.company_name}
                                        </p>
                                      )}
                                      {getMainSector(driver.working_sectors) && (
                                        <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                                          <MapPin className="w-3 h-3 flex-shrink-0" />
                                          {getMainSector(driver.working_sectors)}
                                        </p>
                                      )}
                                      {driver.show_rating_partners && driver.rating && driver.rating > 0 && (
                                        <div className="flex items-center gap-1 mt-1">
                                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                          <span className="text-xs font-medium">{driver.rating.toFixed(1)}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Contacts visibles */}
                                  {(driver.show_phone || driver.show_email) && (
                                    <div className="flex flex-wrap gap-1.5 mt-3">
                                      {driver.show_phone && driver.contact_phone && (
                                        <a
                                          href={`tel:${driver.contact_phone}`}
                                          className="flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 text-primary text-xs hover:bg-primary/20 transition-colors"
                                        >
                                          <Phone className="w-3 h-3" />
                                          Appeler
                                        </a>
                                      )}
                                      {driver.show_email && driver.contact_email && (
                                        <a
                                          href={`mailto:${driver.contact_email}`}
                                          className="flex items-center gap-1 px-2 py-1 rounded-md bg-accent/10 text-accent text-xs hover:bg-accent/20 transition-colors"
                                        >
                                          <Mail className="w-3 h-3" />
                                          Email
                                        </a>
                                      )}
                                    </div>
                                  )}

                                  <div className="flex gap-2 mt-3">
                                    <Button
                                      size="sm"
                                      onClick={() => proposeDriver(driver.id)}
                                      disabled={proposingDriver === driver.id}
                                      className="flex-1 h-8 text-xs bg-gradient-to-r from-accent to-success"
                                    >
                                      {proposingDriver === driver.id ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                      ) : (
                                        <>
                                          <UserPlus className="w-3 h-3 mr-1" />
                                          Inviter
                                        </>
                                      )}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setSelectedDriver(driver)}
                                      className="h-8 border-accent/20 hover:bg-accent/10"
                                    >
                                      <Eye className="w-3 h-3" />
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

      {/* Dialog de détail chauffeur amélioré */}
      <Dialog open={!!selectedDriver} onOpenChange={() => setSelectedDriver(null)}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto p-0">
          {selectedDriver && (
            <>
              {/* Header fixe avec photo et nom */}
              <div className="sticky top-0 bg-background/95 backdrop-blur-sm z-10 p-4 border-b border-border/50">
                <div className="flex items-center gap-3">
                  <Avatar className="w-14 h-14 sm:w-16 sm:h-16 ring-2 ring-primary/20 flex-shrink-0">
                    <AvatarImage src={getDriverPhoto(selectedDriver) || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 text-lg font-bold">
                      {selectedDriver.full_name?.slice(0, 2).toUpperCase() || "CH"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    {/* Nom du chauffeur - toujours affiché en B2B */}
                    <h3 className="font-bold text-base sm:text-lg truncate flex items-center gap-2">
                      <User className="w-4 h-4 text-primary flex-shrink-0" />
                      {selectedDriver.full_name || "Chauffeur"}
                    </h3>
                    {/* Nom de l'entreprise si différent */}
                    {selectedDriver.display_company_name && selectedDriver.company_name && (
                      <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1">
                        <Building2 className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{selectedDriver.company_name}</span>
                      </p>
                    )}
                    {getMainSector(selectedDriver.working_sectors) && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{getMainSector(selectedDriver.working_sectors)}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Contenu scrollable */}
              <div className="p-4 space-y-4">

              {/* Bio / Présentation */}
              {selectedDriver.bio && (
                <div className="p-3 rounded-xl bg-muted/30 border border-border/50">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Présentation</p>
                  <p className="text-sm">{selectedDriver.bio}</p>
                </div>
              )}

              {/* Infos contacts (selon visibilité) */}
              {(selectedDriver.show_phone || selectedDriver.show_email) && (
                <div className="flex flex-wrap gap-2">
                  {selectedDriver.show_phone && selectedDriver.contact_phone && (
                    <a
                      href={`tel:${selectedDriver.contact_phone}`}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-sm"
                    >
                      <Phone className="w-4 h-4" />
                      {selectedDriver.contact_phone}
                    </a>
                  )}
                  {selectedDriver.show_email && selectedDriver.contact_email && (
                    <a
                      href={`mailto:${selectedDriver.contact_email}`}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors text-sm"
                    >
                      <Mail className="w-4 h-4" />
                      {selectedDriver.contact_email}
                    </a>
                  )}
                </div>
              )}

              {/* Note et véhicule */}
              <div className="grid grid-cols-2 gap-3">
                {selectedDriver.show_rating_partners && selectedDriver.rating && selectedDriver.rating > 0 && (
                  <div className="p-3 rounded-xl bg-muted/30">
                    <p className="text-xs text-muted-foreground">Note partenaires</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                      <span className="font-bold">{selectedDriver.rating.toFixed(1)}</span>
                      {selectedDriver.total_rides && (
                        <span className="text-xs text-muted-foreground ml-1">
                          ({selectedDriver.total_rides} courses)
                        </span>
                      )}
                    </div>
                  </div>
                )}
                {selectedDriver.vehicle_model && (
                  <div className="p-3 rounded-xl bg-muted/30">
                    <p className="text-xs text-muted-foreground">Véhicule</p>
                    <p className="font-medium mt-1">
                      {selectedDriver.vehicle_brand && `${selectedDriver.vehicle_brand} `}
                      {selectedDriver.vehicle_model}
                    </p>
                    {selectedDriver.vehicle_color && (
                      <p className="text-xs text-muted-foreground">{selectedDriver.vehicle_color}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Services proposés */}
              {selectedDriver.services_offered && selectedDriver.services_offered.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Services proposés</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedDriver.services_offered.map((serviceId, i) => {
                      const service = DRIVER_SERVICES.find(s => s.id === serviceId);
                      return (
                        <Badge key={i} variant="secondary" className="text-xs bg-primary/10 text-primary border-primary/20">
                          <span className="mr-1">{service?.icon || "🚗"}</span>
                          {service?.label || serviceId}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Équipements véhicule */}
              {selectedDriver.vehicle_equipment && selectedDriver.vehicle_equipment.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Équipements</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedDriver.vehicle_equipment.map((equipId, i) => {
                      const equip = VEHICLE_EQUIPMENT.find(e => e.id === equipId);
                      return (
                        <Badge key={i} variant="outline" className="text-xs bg-muted/50">
                          <span className="mr-1">{equip?.icon || "✓"}</span>
                          {equip?.label || equipId}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Zones d'intervention */}
              {selectedDriver.working_sectors && selectedDriver.working_sectors.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Zones d'intervention</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedDriver.working_sectors.slice(0, 5).map((sector, i) => (
                      <Badge key={i} variant="outline" className="text-xs bg-accent/5 border-accent/20 text-accent">
                        <MapPin className="w-3 h-3 mr-1" />
                        {sector}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Indicateur statut partenariat */}
              {isPendingDriver(selectedDriver.id) && (
                <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium text-primary">Invitation en attente de réponse</span>
                  </div>
                  {getRequestedByLabel(selectedDriver.id) && (
                    <p className="text-xs text-primary/80 mt-1 ml-6 flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {getRequestedByLabel(selectedDriver.id)}
                    </p>
                  )}
                </div>
              )}

              {/* Boutons d'action */}
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  onClick={() => setProfileDialogDriverId(selectedDriver.id)}
                  className="flex-1"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Profil complet
                </Button>
                {!isPendingDriver(selectedDriver.id) && !drivers.some(d => d.id === selectedDriver.id) && (
                  <Button
                    onClick={() => {
                      proposeDriver(selectedDriver.id);
                      setSelectedDriver(null);
                    }}
                    disabled={proposingDriver === selectedDriver.id}
                    className="flex-1 bg-gradient-to-r from-accent to-success"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Inviter
                  </Button>
                )}
              </div>
              </div>
            </>
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
