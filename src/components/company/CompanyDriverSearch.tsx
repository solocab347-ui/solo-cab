import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PUBLIC_DRIVERS_QUERY_KEY, useDriverProfileRealtime } from "@/hooks/usePublicDriverProfile";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { 
  Loader2, Search, Car, MapPin, Star, Send, 
  CreditCard, Clock, User, Languages, 
  Eye, Phone, Filter, Building2, RotateCcw, Euro, Briefcase, EyeOff, AlertTriangle, XCircle, Calendar, Ban
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { VEHICLE_EQUIPMENT, DRIVER_SERVICES } from "@/lib/vehicleEquipment";
import { getEquipmentLabel, getEquipmentIcon } from "@/lib/vehicleEquipmentDisplay";
import { getServiceLabel, getServiceIcon } from "@/lib/serviceLabels";
import { extractCityDepartment } from "@/lib/addressPrivacy";

interface DriverVehicle {
  id: string;
  brand: string;
  model: string;
  year: number | null;
  color: string | null;
  license_plate: string | null;
  vehicle_category: string | null;
  max_passengers: number | null;
  vehicle_photos: string[] | null;
  is_favorite: boolean | null;
}

interface CompanyDriverSearchProps {
  companyId: string;
}

const PAYMENT_METHODS = [
  { value: "card", label: "Carte bancaire", icon: "💳" },
  { value: "payment_link", label: "Lien de paiement", icon: "🔗" },
  { value: "cash", label: "Espèces", icon: "💵" },
  { value: "bank_transfer", label: "Virement bancaire", icon: "🏦" },
];

const PAYMENT_FREQUENCIES = [
  { value: "per_course", label: "À la course", description: "Paiement après chaque course" },
  { value: "weekly", label: "Hebdomadaire", description: "Paiement chaque semaine" },
  { value: "monthly", label: "Mensuel", description: "Paiement chaque mois" },
  { value: "mixed", label: "Mixte", description: "Selon l'accord" },
];

const VEHICLE_CATEGORIES = [
  { value: 'berline_standard', label: 'Berline Standard' },
  { value: 'berline_luxe', label: 'Berline Luxe' },
  { value: 'berline_electrique', label: 'Berline Électrique' },
  { value: 'electrique', label: 'Électrique' },
  { value: 'hybrid', label: 'Hybride' },
  { value: 'van', label: 'Van' },
  { value: 'suv', label: 'SUV' },
  { value: 'minivan', label: 'Minivan' },
];

const FRENCH_DEPARTMENTS = [
  { code: '75', name: 'Paris' },
  { code: '77', name: 'Seine-et-Marne' },
  { code: '78', name: 'Yvelines' },
  { code: '91', name: 'Essonne' },
  { code: '92', name: 'Hauts-de-Seine' },
  { code: '93', name: 'Seine-Saint-Denis' },
  { code: '94', name: 'Val-de-Marne' },
  { code: '95', name: "Val-d'Oise" },
  { code: '13', name: 'Bouches-du-Rhône' },
  { code: '69', name: 'Rhône' },
  { code: '31', name: 'Haute-Garonne' },
  { code: '33', name: 'Gironde' },
  { code: '59', name: 'Nord' },
  { code: '06', name: 'Alpes-Maritimes' },
  { code: '44', name: 'Loire-Atlantique' },
  { code: '67', name: 'Bas-Rhin' },
  { code: '34', name: 'Hérault' },
  { code: '35', name: 'Ille-et-Vilaine' },
];

const FRENCH_REGIONS = [
  'Île-de-France',
  'Provence-Alpes-Côte d\'Azur',
  'Auvergne-Rhône-Alpes',
  'Occitanie',
  'Nouvelle-Aquitaine',
  'Hauts-de-France',
  'Grand Est',
  'Pays de la Loire',
  'Bretagne',
  'Normandie',
];

export function CompanyDriverSearch({ companyId }: CompanyDriverSearchProps) {
  const queryClient = useQueryClient();
  
  // Active realtime pour synchronisation instantanée
  useDriverProfileRealtime();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDriver, setSelectedDriver] = useState<any>(null);
  const [showProposalDialog, setShowProposalDialog] = useState(false);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  
  // Advanced filters state
  const [showFilters, setShowFilters] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<string>("");
  const [selectedRegion, setSelectedRegion] = useState<string>("");
  const [citySearch, setCitySearch] = useState("");
  const [minRating, setMinRating] = useState(0);
  const [selectedVehicleType, setSelectedVehicleType] = useState<string>("");
  
  // Proposal form state
  const [proposalMessage, setProposalMessage] = useState("");
  const [paymentMethods, setPaymentMethods] = useState<string[]>(["card"]);
  const [paymentFrequency, setPaymentFrequency] = useState("per_course");
  const [paymentDay, setPaymentDay] = useState<number | null>(null);
  const [notes, setNotes] = useState("");

  // Fetch company info for message
  const { data: company } = useQuery({
    queryKey: ["company-info", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .eq("id", companyId)
        .single();

      if (error) throw error;
      return data;
    },
  });

  // Fetch drivers with public profiles visible to companies - staleTime: 0 pour données fraîches
  const { data: drivers, isLoading, refetch } = useQuery({
    queryKey: [PUBLIC_DRIVERS_QUERY_KEY, "companies", searchTerm, selectedDepartment, selectedRegion, citySearch, minRating, selectedVehicleType],
    staleTime: 0, // Toujours refetch pour données instantanées
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    queryFn: async () => {
      // Base query - fetch all validated drivers visible to companies
      // IMPORTANT: On filtre par visible_to_companies = true explicitement
      const { data, error } = await supabase
        .from("drivers")
        .select(`
          id,
          user_id,
          company_name,
          vehicle_brand,
          vehicle_model,
          vehicle_color,
          vehicle_year,
          vehicle_equipment,
          vehicle_category,
          max_passengers,
          rating,
          total_rides,
          bio,
          service_description,
          services_offered,
          working_sectors,
          vehicle_photos,
          gallery_photos,
          show_phone,
          show_email,
          contact_phone,
          contact_email,
          visible_to_companies,
          public_profile_enabled,
          display_driver_name,
          display_company_name,
          show_rating_public,
          show_rating_partners,
          show_pricing_partners,
          card_photo_url,
          base_rate,
          per_km_rate,
          hourly_rate,
          minimum_price,
          home_address
        `)
        .eq("status", "validated")
        .eq("visible_to_companies", true)
        .order('rating', { ascending: false, nullsFirst: false })
        .limit(100);

      // Récupérer les véhicules pour chaque chauffeur
      const driverIds = (data || []).map((d: any) => d.id);
      let vehiclesMap: Record<string, DriverVehicle[]> = {};
      if (driverIds.length > 0) {
        const { data: vehicles } = await supabase
          .from("driver_vehicles")
          .select("*")
          .in("driver_id", driverIds);
        
        if (vehicles) {
          vehiclesMap = vehicles.reduce((acc: Record<string, DriverVehicle[]>, v: any) => {
            if (!acc[v.driver_id]) acc[v.driver_id] = [];
            acc[v.driver_id].push(v);
            return acc;
          }, {});
        }
      }

      if (error) throw error;
      
      // Récupérer les profils séparément pour éviter les problèmes de jointure
      const userIds = (data || []).map((d: any) => d.user_id).filter(Boolean);
      
      let profilesMap: Record<string, any> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, profile_photo_url, phone, email")
          .in("id", userIds);
        
        if (profiles) {
          profilesMap = profiles.reduce((acc: Record<string, any>, p: any) => {
            acc[p.id] = p;
            return acc;
          }, {});
        }
      }
      
      // Attacher les profils et véhicules aux chauffeurs
      const dataWithProfiles = (data || []).map((driver: any) => ({
        ...driver,
        profile: profilesMap[driver.user_id] || null,
        vehicles: vehiclesMap[driver.id] || []
      }));

      // Apply filters in JavaScript for more flexibility
      let filteredData = dataWithProfiles;
      
      if (minRating > 0) {
        filteredData = filteredData.filter((d: any) => (d.rating || 0) >= minRating);
      }
      if (selectedDepartment) {
        filteredData = filteredData.filter((d: any) => 
          d.working_sectors?.includes(selectedDepartment)
        );
      }
      if (selectedRegion) {
        filteredData = filteredData.filter((d: any) => 
          d.working_sectors?.includes(selectedRegion)
        );
      }
      if (citySearch.trim()) {
        const search = citySearch.trim().toLowerCase();
        filteredData = filteredData.filter((d: any) => 
          d.working_sectors?.some((s: string) => s.toLowerCase().includes(search))
        );
      }
      if (selectedVehicleType) {
        filteredData = filteredData.filter((d: any) => 
          d.vehicle_category?.includes(selectedVehicleType)
        );
      }

      // Filter by search term
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        filteredData = filteredData.filter((d: any) =>
          d.profile?.full_name?.toLowerCase().includes(searchLower) ||
          d.company_name?.toLowerCase().includes(searchLower) ||
          d.vehicle_brand?.toLowerCase().includes(searchLower) ||
          d.vehicle_model?.toLowerCase().includes(searchLower) ||
          d.working_sectors?.some((s: string) => s.toLowerCase().includes(searchLower))
        );
      }

      return filteredData;
    },
  });

  // Check existing proposals and blocked drivers - inclut les détails du rejet
  const { data: existingProposals } = useQuery({
    queryKey: ["company-driver-proposals", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_driver_agreements")
        .select("id, driver_id, status, company_blocked_driver, driver_blocked_company, proposed_by, rejected_at, rejection_reason")
        .eq("company_id", companyId);

      if (error) throw error;
      return data;
    },
  });

  // Get blocked driver IDs for filtering
  const blockedDriverIds = (existingProposals || [])
    .filter((p: any) => p.company_blocked_driver || p.driver_blocked_company)
    .map((p: any) => p.driver_id);

  // Filter out blocked drivers from the list
  const filteredDrivers = (drivers || []).filter((d: any) => !blockedDriverIds.includes(d.id));

  // Send proposal mutation
  const sendProposal = useMutation({
    mutationFn: async (driverId: string) => {
      const { error } = await supabase
        .from("company_driver_agreements")
        .insert({
          company_id: companyId,
          driver_id: driverId,
          proposed_by: "company",
          status: "pending",
          company_signed: true,
          company_signed_at: new Date().toISOString(),
          payment_methods: paymentMethods,
          payment_frequency: paymentFrequency,
          payment_day: paymentDay,
          notes: `${proposalMessage}${notes ? `\n\nConditions: ${notes}` : ""}`,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Proposition de partenariat envoyée !");
      queryClient.invalidateQueries({ queryKey: ["company-driver-proposals"] });
      queryClient.invalidateQueries({ queryKey: ["company-agreements"] });
      resetForm();
      setShowProposalDialog(false);
      setSelectedDriver(null);
    },
    onError: (error: any) => {
      toast.error("Erreur: " + error.message);
    },
  });

  // Block driver mutation - bloquer directement depuis la recherche
  const blockDriverFromSearch = useMutation({
    mutationFn: async ({ driverId, agreementId }: { driverId: string; agreementId?: string }) => {
      if (agreementId) {
        // Mise à jour d'un accord existant
        const { error } = await supabase
          .from("company_driver_agreements")
          .update({
            company_blocked_driver: true,
            company_blocked_driver_at: new Date().toISOString(),
          })
          .eq("id", agreementId);

        if (error) throw error;
      } else {
        // Créer un nouvel accord pour bloquer
        const { error } = await supabase
          .from("company_driver_agreements")
          .insert({
            company_id: companyId,
            driver_id: driverId,
            proposed_by: "company",
            status: "rejected",
            company_blocked_driver: true,
            company_blocked_driver_at: new Date().toISOString(),
            rejection_reason: "Bloqué par l'entreprise",
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Chauffeur bloqué. Il n'apparaîtra plus dans vos recherches.");
      queryClient.invalidateQueries({ queryKey: ["company-driver-proposals"] });
      queryClient.invalidateQueries({ queryKey: ["company-agreements"] });
    },
    onError: (error: any) => {
      toast.error("Erreur lors du blocage: " + error.message);
    },
  });

  const resetForm = () => {
    setProposalMessage("");
    setPaymentMethods(["card"]);
    setPaymentFrequency("per_course");
    setPaymentDay(null);
    setNotes("");
  };

  const resetFilters = () => {
    setSearchTerm("");
    setSelectedDepartment("");
    setSelectedRegion("");
    setCitySearch("");
    setMinRating(0);
    setSelectedVehicleType("");
  };

  const getProposalStatus = (driverId: string) => {
    const proposal = existingProposals?.find((p) => p.driver_id === driverId);
    // Si le statut est "rejected", on permet de refaire une demande
    if (proposal?.status === 'rejected') return null;
    return proposal?.status;
  };

  const wasRejected = (driverId: string) => {
    return existingProposals?.find((p) => p.driver_id === driverId)?.status === 'rejected';
  };

  const getRejectionDetails = (driverId: string) => {
    const proposal = existingProposals?.find((p) => p.driver_id === driverId && p.status === 'rejected');
    if (!proposal) return null;
    return {
      id: (proposal as any).id, // récupérer l'ID pour le blocage
      rejectedAt: proposal.rejected_at,
      rejectionReason: proposal.rejection_reason,
      proposedBy: proposal.proposed_by,
      driverBlockedCompany: proposal.driver_blocked_company
    };
  };

  const getAgreementId = (driverId: string) => {
    const proposal = existingProposals?.find((p) => p.driver_id === driverId);
    return (proposal as any)?.id;
  };

  const handleOpenProposal = (driver: any) => {
    setSelectedDriver(driver);
    
    // Generate pre-filled message based on context
    const defaultMessage = `Bonjour ${driver.profile?.full_name || ""},

Je suis ${company?.contact_name || ""}, représentant de ${company?.company_name || "notre entreprise"}.

Nous avons remarqué votre profil et serions intéressés par vos services de transport VTC pour nos besoins professionnels.

${company?.employee_count ? `Notre entreprise compte ${company.employee_count} collaborateurs` : ""}${company?.monthly_budget ? ` et un budget transport mensuel d'environ ${company.monthly_budget}€` : ""}.

${company?.preferred_vehicle_types?.length ? `Nous recherchons particulièrement des véhicules de type: ${company.preferred_vehicle_types.join(", ")}.` : ""}

Nous souhaitons établir un partenariat durable et de confiance avec un chauffeur professionnel comme vous.

N'hésitez pas à nous contacter pour discuter des conditions.

Cordialement,
${company?.contact_name || ""}
${company?.company_name || ""}`;

    setProposalMessage(defaultMessage);
    setShowProposalDialog(true);
  };

  const handleViewProfile = (driver: any) => {
    setSelectedDriver(driver);
    setShowProfileDialog(true);
  };

  const activeFiltersCount = [
    selectedDepartment,
    selectedRegion,
    citySearch,
    minRating > 0,
    selectedVehicleType,
  ].filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            Rechercher des chauffeurs
          </CardTitle>
          <CardDescription>
            Trouvez des chauffeurs VTC professionnels et proposez-leur un partenariat
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Search & Filters */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Rechercher par nom, entreprise, véhicule..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant={showFilters ? "secondary" : "outline"}
              onClick={() => setShowFilters(!showFilters)}
              className="gap-2"
            >
              <Filter className="h-4 w-4" />
              Filtres
              {activeFiltersCount > 0 && (
                <Badge className="h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="space-y-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Chaque filtre fonctionne indépendamment. Vous pouvez les combiner ou utiliser un seul critère.
              </p>
              
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* Vehicle Category Filter */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Car className="h-4 w-4" />
                    Catégorie de véhicule
                  </Label>
                  <Select value={selectedVehicleType || "all"} onValueChange={(val) => setSelectedVehicleType(val === "all" ? "" : val)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Toutes catégories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes catégories</SelectItem>
                      {VEHICLE_CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Department Filter */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Département
                  </Label>
                  <Select value={selectedDepartment || "all"} onValueChange={(val) => setSelectedDepartment(val === "all" ? "" : val)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Tous les départements" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les départements</SelectItem>
                      {FRENCH_DEPARTMENTS.map((dept) => (
                        <SelectItem key={dept.code} value={dept.name}>
                          {dept.code} - {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Region Filter */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Région
                  </Label>
                  <Select value={selectedRegion || "all"} onValueChange={(val) => setSelectedRegion(val === "all" ? "" : val)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Toutes les régions" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes les régions</SelectItem>
                      {FRENCH_REGIONS.map((region) => (
                        <SelectItem key={region} value={region}>
                          {region}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* City/Sector Filter */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Ville / Secteur
                  </Label>
                  <Input
                    placeholder="Paris, Lyon, Marseille..."
                    value={citySearch}
                    onChange={(e) => setCitySearch(e.target.value)}
                  />
                </div>
              </div>

              {/* Rating Filter */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Star className="h-4 w-4" />
                  Note minimale: {minRating > 0 ? `${minRating}/5` : "Toutes"}
                </Label>
                <Slider
                  value={[minRating]}
                  onValueChange={(vals) => setMinRating(vals[0])}
                  min={0}
                  max={5}
                  step={0.5}
                  className="w-full"
                />
              </div>

              {/* Reset Filters */}
              {activeFiltersCount > 0 && (
                <Button variant="ghost" onClick={resetFilters} className="gap-2">
                  <RotateCcw className="h-4 w-4" />
                  Réinitialiser les filtres
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {isLoading ? (
        <div className="flex justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredDrivers && filteredDrivers.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredDrivers.map((driver: any) => {
            const proposalStatus = getProposalStatus(driver.id);
            const hasProposal = !!proposalStatus;
            const isRejected = wasRejected(driver.id);
            const rejectionDetails = getRejectionDetails(driver.id);

            return (
              <Card key={driver.id} className={hasProposal ? "opacity-75" : isRejected ? "border-destructive/40" : ""}>
                <CardContent className="p-4">
                  {/* Location badge at top */}
                  {driver.working_sectors?.length > 0 && (
                    <div className="flex items-center gap-1.5 mb-3 -mt-1">
                      <MapPin className="w-4 h-4 text-primary" />
                      <Badge variant="outline" className="text-xs font-medium border-primary/30 text-primary">
                        {driver.working_sectors[0]}
                      </Badge>
                      {driver.working_sectors.length > 1 && (
                        <span className="text-xs text-muted-foreground">
                          +{driver.working_sectors.length - 1} zones
                        </span>
                      )}
                    </div>
                  )}
                  <div className="flex gap-3 mb-4">
                    <Avatar className="w-14 h-14">
                      <AvatarImage src={driver.card_photo_url || driver.profile?.profile_photo_url} />
                      <AvatarFallback>
                        <User className="w-6 h-6" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                    <h4 className="font-semibold truncate">
                      {(() => {
                        const fullName = driver.profile?.full_name?.trim();
                        const companyName = driver.company_name?.trim();
                        const showDriverName = driver.display_driver_name === true;
                        const showCompanyName = driver.display_company_name === true;
                        
                        // Afficher les deux si les deux sont cochés
                        if (showDriverName && showCompanyName && fullName && companyName) {
                          return fullName;
                        }
                        // Sinon afficher celui qui est coché
                        if (showDriverName && fullName) return fullName;
                        if (showCompanyName && companyName) return companyName;
                        // Fallback
                        return "Chauffeur VTC";
                      })()}
                    </h4>
                    {/* Afficher le nom de l'entreprise en dessous si les deux sont activés */}
                    {driver.display_driver_name === true && driver.display_company_name === true && driver.company_name?.trim() && driver.profile?.full_name?.trim() && (
                      <p className="text-sm text-muted-foreground truncate">
                        {driver.company_name}
                      </p>
                    )}
                    {/* Ou afficher le nom du chauffeur en dessous si seule l'entreprise est en titre */}
                    {driver.display_driver_name !== true && driver.display_company_name === true && driver.profile?.full_name?.trim() && (
                      <p className="text-sm text-muted-foreground truncate">
                        {driver.profile.full_name}
                      </p>
                    )}
                    {/* Note visible uniquement si show_rating_public = true (contexte recherche publique, pas encore partenaires) */}
                    {driver.rating && driver.show_rating_public === true && (
                      <div className="flex items-center gap-1 mt-1">
                          <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                          <span className="text-xs font-medium">{driver.rating.toFixed(1)}</span>
                          {driver.total_rides && (
                            <span className="text-xs text-muted-foreground">
                              ({driver.total_rides} courses)
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    {hasProposal && (
                      <Badge 
                        className={
                          proposalStatus === "accepted" 
                            ? "bg-green-500" 
                            : proposalStatus === "rejected" 
                            ? "bg-red-500" 
                            : "bg-yellow-500"
                        }
                      >
                        {proposalStatus === "accepted" 
                          ? "Partenaire" 
                          : proposalStatus === "rejected" 
                          ? "Refusé" 
                          : "En attente"}
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-2 text-sm mb-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Car className="w-4 h-4" />
                      <span className="truncate">
                        {(() => {
                          // Priorité aux véhicules de la nouvelle table
                          const vehicles = driver.vehicles || [];
                          const favoriteVehicle = vehicles.find((v: DriverVehicle) => v.is_favorite) || vehicles[0];
                          if (favoriteVehicle) {
                            return `${favoriteVehicle.brand} ${favoriteVehicle.model}${favoriteVehicle.max_passengers ? ` • ${favoriteVehicle.max_passengers} places` : ''}`;
                          }
                          // Fallback vers anciens champs
                          return `${driver.vehicle_brand || ''} ${driver.vehicle_model || ''}${driver.max_passengers ? ` • ${driver.max_passengers} places` : ''}`.trim() || 'Véhicule non renseigné';
                        })()}
                      </span>
                    </div>
                    {driver.working_sectors?.length > 0 && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="w-4 h-4" />
                        <span className="truncate">
                          {driver.working_sectors.slice(0, 2).join(", ")}
                          {driver.working_sectors.length > 2 && " ..."}
                        </span>
                      </div>
                    )}
                  </div>

                  {driver.vehicle_equipment?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {driver.vehicle_equipment.slice(0, 3).map((eq: string) => (
                        <Badge key={eq} variant="secondary" className="text-xs gap-1">
                          <span>{getEquipmentIcon(eq)}</span>
                          {getEquipmentLabel(eq)}
                        </Badge>
                      ))}
                      {driver.vehicle_equipment.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{driver.vehicle_equipment.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Affichage des détails de refus - Logique: si proposed_by='company' et rejeté → chauffeur a refusé. Si proposed_by='driver' et rejeté → entreprise a refusé */}
                  {isRejected && rejectionDetails && (
                    <Alert variant="destructive" className="mb-4 py-2">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="text-xs space-y-1">
                        <div className="font-semibold">
                          {rejectionDetails.proposedBy === 'company' 
                            ? "Refusé par le chauffeur" 
                            : "Vous avez refusé cette demande"}
                          {rejectionDetails.rejectedAt && (
                            <span className="font-normal text-muted-foreground ml-1">
                              le {format(new Date(rejectionDetails.rejectedAt), "d MMM yyyy", { locale: fr })}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {rejectionDetails.proposedBy === 'company' 
                            ? "Vous aviez proposé ce partenariat" 
                            : "Le chauffeur avait fait cette demande"}
                        </div>
                        {rejectionDetails.rejectionReason && (
                          <div className="text-xs italic mt-1 p-2 bg-background/50 rounded">
                            « {rejectionDetails.rejectionReason} »
                          </div>
                        )}
                        {rejectionDetails.driverBlockedCompany && (
                          <Badge variant="outline" className="text-xs border-destructive text-destructive mt-1">
                            <EyeOff className="w-3 h-3 mr-1" />
                            Le chauffeur vous a bloqué
                          </Badge>
                        )}
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 min-w-[100px]"
                      onClick={() => handleViewProfile(driver)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Voir profil
                    </Button>
                    
                    {/* Bouton principal : Proposer / Relancer */}
                    <Button
                      className="flex-1 min-w-[100px]"
                      onClick={() => handleOpenProposal(driver)}
                      disabled={hasProposal || rejectionDetails?.driverBlockedCompany}
                    >
                      {hasProposal ? (
                        "Proposition envoyée"
                      ) : isRejected ? (
                        rejectionDetails?.driverBlockedCompany ? (
                          <>
                            <XCircle className="w-4 h-4 mr-1" />
                            Bloqué
                          </>
                        ) : (
                          <>
                            <RotateCcw className="w-4 h-4 mr-1" />
                            Relancer
                          </>
                        )
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-1" />
                          Proposer
                        </>
                      )}
                    </Button>
                    
                    {/* Bouton Bloquer - visible seulement si refusé et pas déjà bloqué par le chauffeur */}
                    {isRejected && !rejectionDetails?.driverBlockedCompany && (
                      <Button
                        variant="destructive"
                        size="sm"
                        className="w-full sm:w-auto"
                        onClick={() => {
                          const agreementId = getAgreementId(driver.id);
                          blockDriverFromSearch.mutate({ driverId: driver.id, agreementId });
                        }}
                        disabled={blockDriverFromSearch.isPending}
                      >
                        {blockDriverFromSearch.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Ban className="w-4 h-4 mr-1" />
                            Bloquer ce chauffeur
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Car className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">
              {searchTerm ? "Aucun chauffeur trouvé" : "Aucun chauffeur disponible"}
            </h3>
            <p className="text-muted-foreground">
              {searchTerm 
                ? "Essayez avec d'autres termes de recherche"
                : "Aucun chauffeur n'a activé son profil public pour l'instant"}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Profile Dialog - Profil complet du chauffeur */}
      <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Profil complet du chauffeur
            </DialogTitle>
            <DialogDescription>
              Consultez toutes les informations du chauffeur avant de le contacter
            </DialogDescription>
          </DialogHeader>

          {selectedDriver && (
            <ScrollArea className="max-h-[70vh]">
            <div className="space-y-6 py-4 pr-4">
              {/* Header with Photo */}
              <div className="flex items-start gap-4">
                <div className="w-24 h-24 rounded-xl overflow-hidden bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center ring-4 ring-primary/20 flex-shrink-0">
                  {(selectedDriver.card_photo_url || selectedDriver.profile?.profile_photo_url) ? (
                    <img
                      src={selectedDriver.card_photo_url || selectedDriver.profile?.profile_photo_url}
                      alt={selectedDriver.display_driver_name ? selectedDriver.profile?.full_name : "Chauffeur"}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <User className="w-12 h-12 text-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-bold">
                    {(() => {
                      const fullName = selectedDriver.profile?.full_name?.trim();
                      const companyName = selectedDriver.company_name?.trim();
                      const showDriverName = selectedDriver.display_driver_name === true;
                      const showCompanyName = selectedDriver.display_company_name === true;
                      
                      // Afficher les deux si les deux sont cochés
                      if (showDriverName && showCompanyName && fullName && companyName) {
                        return fullName;
                      }
                      // Sinon afficher celui qui est coché
                      if (showDriverName && fullName) return fullName;
                      if (showCompanyName && companyName) return companyName;
                      // Fallback
                      return "Chauffeur VTC";
                    })()}
                  </h3>
                  {/* Afficher le nom de l'entreprise en dessous si les deux sont activés */}
                  {selectedDriver.display_driver_name === true && selectedDriver.display_company_name === true && selectedDriver.company_name?.trim() && selectedDriver.profile?.full_name?.trim() && (
                    <p className="text-muted-foreground text-sm flex items-center gap-1 mt-1">
                      <Building2 className="w-3 h-3" />
                      {selectedDriver.company_name}
                    </p>
                  )}
                  {/* Ou afficher le nom du chauffeur en dessous si seule l'entreprise est en titre */}
                  {selectedDriver.display_driver_name !== true && selectedDriver.display_company_name === true && selectedDriver.profile?.full_name?.trim() && (
                    <p className="text-muted-foreground text-sm flex items-center gap-1 mt-1">
                      {selectedDriver.profile.full_name}
                    </p>
                  )}
                  {/* Note visible uniquement si show_rating_public = true (contexte recherche, pas encore partenaires) */}
                  {selectedDriver.rating && selectedDriver.show_rating_public === true && (
                    <div className="flex items-center gap-2 mt-2">
                      <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                      <span className="font-semibold">{selectedDriver.rating.toFixed(1)}/5</span>
                      {selectedDriver.total_rides && (
                        <span className="text-sm text-muted-foreground">
                          ({selectedDriver.total_rides} courses)
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Bio / À propos */}
              {selectedDriver.bio && (
                <div className="p-4 bg-muted/50 rounded-xl">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    À propos
                  </h4>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{selectedDriver.bio}</p>
                </div>
              )}

              {/* Description du service */}
              {selectedDriver.service_description && (
                <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-primary" />
                    Mon service
                  </h4>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{selectedDriver.service_description}</p>
                </div>
              )}

              {/* Contact - Section mise en avant */}
              {(selectedDriver.show_phone || selectedDriver.show_email) && (selectedDriver.contact_phone || selectedDriver.contact_email || selectedDriver.profile) && (
                <div className="p-4 border-2 border-green-500/30 rounded-xl bg-green-500/5">
                  <h4 className="font-semibold mb-3 flex items-center gap-2 text-green-700">
                    <Phone className="w-4 h-4" />
                    Contact direct
                  </h4>
                  <div className="space-y-2">
                    {selectedDriver.show_phone && (selectedDriver.contact_phone || selectedDriver.profile?.phone) && (
                      <div className="flex items-center gap-3 p-3 bg-green-500/10 rounded-lg">
                        <Phone className="w-5 h-5 text-green-600" />
                        <a href={`tel:${selectedDriver.contact_phone || selectedDriver.profile?.phone}`} className="text-green-700 font-semibold hover:underline text-lg">
                          {selectedDriver.contact_phone || selectedDriver.profile?.phone}
                        </a>
                      </div>
                    )}
                    {selectedDriver.show_email && (selectedDriver.contact_email || selectedDriver.profile?.email) && (
                      <div className="flex items-center gap-3 p-3 bg-blue-500/10 rounded-lg">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <a href={`mailto:${selectedDriver.contact_email || selectedDriver.profile?.email}`} className="text-blue-700 hover:underline">
                          {selectedDriver.contact_email || selectedDriver.profile?.email}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Véhicule */}
              <div className="p-4 border rounded-xl">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Car className="w-4 h-4" />
                  Véhicule
                </h4>
                
                {(() => {
                  // Priorité aux véhicules de la nouvelle table
                  const vehicles = selectedDriver.vehicles || [];
                  const favoriteVehicle = vehicles.find((v: DriverVehicle) => v.is_favorite) || vehicles[0];
                  const vehiclePhotos = favoriteVehicle?.vehicle_photos || selectedDriver.vehicle_photos;
                  
                  return (
                    <>
                      {/* Photos du véhicule */}
                      {vehiclePhotos?.length > 0 && (
                        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                          {vehiclePhotos.slice(0, 4).map((photo: string, idx: number) => (
                            <img 
                              key={idx}
                              src={photo} 
                              alt={`Véhicule ${idx + 1}`}
                              className="w-24 h-18 object-cover rounded-lg flex-shrink-0 border"
                            />
                          ))}
                        </div>
                      )}
                      
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="flex flex-col">
                          <span className="text-muted-foreground text-xs">Modèle</span>
                          <span className="font-medium">
                            {favoriteVehicle 
                              ? `${favoriteVehicle.brand} ${favoriteVehicle.model}`
                              : `${selectedDriver.vehicle_brand || ''} ${selectedDriver.vehicle_model || ''}`.trim() || 'Non renseigné'}
                          </span>
                        </div>
                        {(favoriteVehicle?.year || selectedDriver.vehicle_year) && (
                          <div className="flex flex-col">
                            <span className="text-muted-foreground text-xs">Année</span>
                            <span className="font-medium">{favoriteVehicle?.year || selectedDriver.vehicle_year}</span>
                          </div>
                        )}
                        {(favoriteVehicle?.color || selectedDriver.vehicle_color) && (
                          <div className="flex flex-col">
                            <span className="text-muted-foreground text-xs">Couleur</span>
                            <span className="font-medium">{favoriteVehicle?.color || selectedDriver.vehicle_color}</span>
                          </div>
                        )}
                        {(favoriteVehicle?.max_passengers || selectedDriver.max_passengers) && (
                          <div className="flex flex-col">
                            <span className="text-muted-foreground text-xs">Passagers max</span>
                            <span className="font-medium">{favoriteVehicle?.max_passengers || selectedDriver.max_passengers}</span>
                          </div>
                        )}
                        {(favoriteVehicle?.vehicle_category || (selectedDriver.vehicle_category && typeof selectedDriver.vehicle_category === 'string')) && (
                          <div className="flex flex-col col-span-2">
                            <span className="text-muted-foreground text-xs">Catégorie</span>
                            <span className="font-medium capitalize">
                              {(favoriteVehicle?.vehicle_category || selectedDriver.vehicle_category)?.replace(/_/g, ' ')}
                            </span>
                          </div>
                        )}
                      </div>
                    </>
                  );
                })()}
                
                {selectedDriver.vehicle_equipment?.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <span className="text-sm font-medium text-muted-foreground">Équipements:</span>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedDriver.vehicle_equipment.map((eq: string) => (
                        <Badge 
                          key={eq} 
                          className="bg-primary text-primary-foreground flex items-center gap-1.5 px-3 py-1.5 text-sm"
                        >
                          <span className="text-base">{getEquipmentIcon(eq)}</span>
                          <span>{getEquipmentLabel(eq)}</span>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Tarifs - uniquement si chauffeur autorise */}
              {selectedDriver.show_pricing_partners ? (
                <div className="p-4 border rounded-xl bg-amber-500/5 border-amber-500/20">
                  <h4 className="font-semibold mb-3 flex items-center gap-2 text-amber-700">
                    <Euro className="w-4 h-4" />
                    Tarifs indicatifs
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {selectedDriver.base_rate && (
                      <div className="flex flex-col">
                        <span className="text-muted-foreground text-xs">Prise en charge</span>
                        <span className="font-semibold text-amber-700">{selectedDriver.base_rate.toFixed(2)}€</span>
                      </div>
                    )}
                    {selectedDriver.per_km_rate && (
                      <div className="flex flex-col">
                        <span className="text-muted-foreground text-xs">Par km</span>
                        <span className="font-semibold text-amber-700">{selectedDriver.per_km_rate.toFixed(2)}€</span>
                      </div>
                    )}
                    {selectedDriver.hourly_rate && (
                      <div className="flex flex-col">
                        <span className="text-muted-foreground text-xs">Taux horaire</span>
                        <span className="font-semibold text-amber-700">{selectedDriver.hourly_rate.toFixed(2)}€/h</span>
                      </div>
                    )}
                    {selectedDriver.minimum_price && (
                      <div className="flex flex-col">
                        <span className="text-muted-foreground text-xs">Minimum</span>
                        <span className="font-semibold text-amber-700">{selectedDriver.minimum_price.toFixed(2)}€</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-4 border rounded-xl bg-muted/50 border-muted">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <EyeOff className="w-4 h-4" />
                    <span className="text-sm">Les tarifs ne sont pas partagés par ce chauffeur</span>
                  </div>
                </div>
              )}

              {/* Localisation - Ville/Département uniquement */}
              {selectedDriver.home_address && (
                <div className="p-4 border rounded-xl">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Localisation
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {extractCityDepartment(selectedDriver.home_address) || 'Non renseignée'}
                  </p>
                </div>
              )}

              {/* Services */}
              {selectedDriver.services_offered?.length > 0 && (
                <div className="p-4 border rounded-xl">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Briefcase className="w-4 h-4" />
                    Services proposés
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedDriver.services_offered.map((service: string) => (
                      <Badge 
                        key={service} 
                        className="bg-primary text-primary-foreground flex items-center gap-1.5 px-3 py-1.5 text-sm"
                      >
                        <span className="text-base">{getServiceIcon(service)}</span>
                        <span>{getServiceLabel(service)}</span>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Secteurs */}
              {selectedDriver.working_sectors?.length > 0 && (
                <div className="p-4 border rounded-xl">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Secteurs d'intervention
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedDriver.working_sectors.map((sector: string) => (
                      <Badge key={sector} variant="secondary">
                        {sector}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t">
                <Button 
                  variant="outline" 
                  className="w-full sm:flex-1 order-2 sm:order-1" 
                  onClick={() => setShowProfileDialog(false)}
                >
                  Fermer
                </Button>
                {selectedDriver.show_phone && (selectedDriver.contact_phone || selectedDriver.profile?.phone) && (
                  <Button 
                    variant="secondary" 
                    asChild 
                    className="w-full sm:flex-1 order-3 sm:order-2"
                  >
                    <a href={`tel:${selectedDriver.contact_phone || selectedDriver.profile?.phone}`}>
                      <Phone className="w-4 h-4 mr-2" />
                      Appeler
                    </a>
                  </Button>
                )}
                <Button 
                  className="w-full sm:flex-1 order-1 sm:order-3" 
                  onClick={() => {
                    setShowProfileDialog(false);
                    handleOpenProposal(selectedDriver);
                  }}
                  disabled={!!getProposalStatus(selectedDriver.id)}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Proposer un partenariat
                </Button>
              </div>
            </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* Proposal Dialog */}
      <Dialog open={showProposalDialog} onOpenChange={setShowProposalDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5" />
              Proposer un partenariat
            </DialogTitle>
            <DialogDescription>
              Envoyez une proposition à {selectedDriver?.profile?.full_name || "ce chauffeur"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Driver Summary */}
            {selectedDriver && (
              <div className="flex gap-3 p-4 bg-muted rounded-lg">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={selectedDriver.profile?.profile_photo_url} />
                  <AvatarFallback>
                    <User className="w-6 h-6" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h4 className="font-medium">{selectedDriver.profile?.full_name}</h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedDriver.company_name} • {selectedDriver.vehicle_brand} {selectedDriver.vehicle_model}
                  </p>
                </div>
              </div>
            )}

            {/* Message */}
            <div className="space-y-2">
              <Label htmlFor="message">Votre message de présentation</Label>
              <Textarea
                id="message"
                placeholder="Présentez votre entreprise et vos besoins..."
                value={proposalMessage}
                onChange={(e) => setProposalMessage(e.target.value)}
                rows={10}
              />
              <p className="text-xs text-muted-foreground">
                Ce message personnalisé sera envoyé au chauffeur avec votre proposition
              </p>
            </div>

            {/* Payment Methods */}
            <div className="space-y-3">
              <Label>Modes de paiement proposés</Label>
              <div className="grid grid-cols-2 gap-3">
                {PAYMENT_METHODS.map((method) => (
                  <div key={method.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`payment-${method.value}`}
                      checked={paymentMethods.includes(method.value)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setPaymentMethods([...paymentMethods, method.value]);
                        } else {
                          setPaymentMethods(paymentMethods.filter((m) => m !== method.value));
                        }
                      }}
                    />
                    <Label htmlFor={`payment-${method.value}`} className="flex items-center gap-2 cursor-pointer">
                      <span>{method.icon}</span>
                      {method.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Frequency */}
            <div className="space-y-2">
              <Label>Fréquence de paiement</Label>
              <Select value={paymentFrequency} onValueChange={setPaymentFrequency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_FREQUENCIES.map((freq) => (
                    <SelectItem key={freq.value} value={freq.value}>
                      <div>
                        <span className="font-medium">{freq.label}</span>
                        <span className="text-muted-foreground ml-2">- {freq.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Payment Day for weekly/monthly */}
            {(paymentFrequency === "weekly" || paymentFrequency === "monthly") && (
              <div className="space-y-2">
                <Label>
                  {paymentFrequency === "weekly" ? "Jour de paiement" : "Jour du mois"}
                </Label>
                <Select 
                  value={paymentDay?.toString() || ""} 
                  onValueChange={(v) => setPaymentDay(v ? parseInt(v) : null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentFrequency === "weekly" ? (
                      <>
                        <SelectItem value="1">Lundi</SelectItem>
                        <SelectItem value="2">Mardi</SelectItem>
                        <SelectItem value="3">Mercredi</SelectItem>
                        <SelectItem value="4">Jeudi</SelectItem>
                        <SelectItem value="5">Vendredi</SelectItem>
                      </>
                    ) : (
                      Array.from({ length: 28 }, (_, i) => (
                        <SelectItem key={i + 1} value={(i + 1).toString()}>
                          Le {i + 1}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Additional Notes */}
            <div className="space-y-2">
              <Label>Conditions particulières</Label>
              <Textarea
                placeholder="Ex: Facturation mensuelle, devis obligatoire au-dessus de 200€..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            <Button
              className="w-full"
              onClick={() => selectedDriver && sendProposal.mutate(selectedDriver.id)}
              disabled={sendProposal.isPending || !proposalMessage.trim()}
            >
              {sendProposal.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Envoyer la proposition
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
