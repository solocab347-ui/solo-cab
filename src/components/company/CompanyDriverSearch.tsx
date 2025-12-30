import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
  Eye, Phone, Filter, Building2, RotateCcw, Euro, Briefcase
} from "lucide-react";
import { VEHICLE_EQUIPMENT, DRIVER_SERVICES } from "@/lib/vehicleEquipment";
import { getEquipmentLabel, getEquipmentIcon, getServiceLabel, getServiceIcon } from "@/lib/vehicleEquipmentDisplay";

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

  // Fetch drivers with public profiles visible to companies
  const { data: drivers, isLoading, refetch } = useQuery({
    queryKey: ["public-drivers-company", searchTerm, selectedDepartment, selectedRegion, citySearch, minRating, selectedVehicleType],
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
          profile:profiles!drivers_user_id_fkey(
            id,
            full_name,
            profile_photo_url,
            phone,
            email
          )
        `)
        .eq("status", "validated")
        .eq("visible_to_companies", true)
        .order('rating', { ascending: false, nullsFirst: false })
        .limit(100);

      if (error) throw error;

      // Récupérer les données non nulles
      let filteredData = data || [];
      
      // Apply filters in JavaScript for more flexibility
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

      // Fetch profiles pour les chauffeurs filtrés
      const userIds = filteredData.map((d: any) => d.user_id);
      
      if (userIds.length === 0) {
        return [];
      }
      
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, profile_photo_url, phone, email")
        .in("id", userIds);

      // Enrichir les chauffeurs avec les profils
      let enrichedDrivers = filteredData.map((driver: any) => ({
        ...driver,
        profile: profiles?.find((p: any) => p.id === driver.user_id),
      }));

      // Filter by search term
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        enrichedDrivers = enrichedDrivers.filter((d: any) =>
          d.profile?.full_name?.toLowerCase().includes(searchLower) ||
          d.company_name?.toLowerCase().includes(searchLower) ||
          d.vehicle_brand?.toLowerCase().includes(searchLower) ||
          d.vehicle_model?.toLowerCase().includes(searchLower) ||
          d.working_sectors?.some((s: string) => s.toLowerCase().includes(searchLower))
        );
      }

      return enrichedDrivers;
    },
  });

  // Check existing proposals
  const { data: existingProposals } = useQuery({
    queryKey: ["company-driver-proposals", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_driver_agreements")
        .select("driver_id, status")
        .eq("company_id", companyId);

      if (error) throw error;
      return data;
    },
  });

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
    return existingProposals?.find((p) => p.driver_id === driverId)?.status;
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
      ) : drivers && drivers.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {drivers.map((driver: any) => {
            const proposalStatus = getProposalStatus(driver.id);
            const hasProposal = !!proposalStatus;

            return (
              <Card key={driver.id} className={hasProposal ? "opacity-75" : ""}>
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
                        {driver.display_driver_name && driver.profile?.full_name 
                          ? driver.profile.full_name 
                          : driver.display_company_name && driver.company_name
                          ? driver.company_name
                          : "Chauffeur VTC"}
                      </h4>
                      {driver.display_driver_name && driver.display_company_name && driver.company_name && (
                        <p className="text-sm text-muted-foreground truncate">
                          {driver.company_name}
                        </p>
                      )}
                      {driver.rating && (driver.show_rating_public !== false || driver.show_rating_partners !== false) && (
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
                        {driver.vehicle_brand} {driver.vehicle_model}
                        {driver.max_passengers && ` • ${driver.max_passengers} places`}
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

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleViewProfile(driver)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Voir profil
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={() => handleOpenProposal(driver)}
                      disabled={hasProposal}
                    >
                      {hasProposal ? (
                        "Proposition envoyée"
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-1" />
                          Proposer
                        </>
                      )}
                    </Button>
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

      {/* Profile Dialog */}
      <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Profil du chauffeur
            </DialogTitle>
          </DialogHeader>

          {selectedDriver && (
            <ScrollArea className="max-h-[70vh]">
            <div className="space-y-6 py-4 pr-4">
              {/* Header with Photo */}
              <div className="flex flex-col items-center gap-4">
                <div className="w-32 h-32 rounded-full overflow-hidden bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center ring-4 ring-primary/20">
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
                    <User className="w-16 h-16 text-white" />
                  )}
                </div>
                <div className="text-center">
                  <h3 className="text-xl font-semibold">
                    {selectedDriver.display_driver_name && selectedDriver.profile?.full_name 
                      ? selectedDriver.profile.full_name 
                      : "Chauffeur VTC"}
                  </h3>
                  {selectedDriver.display_company_name && selectedDriver.company_name && (
                    <p className="text-muted-foreground">{selectedDriver.company_name}</p>
                  )}
                  {selectedDriver.rating && (selectedDriver.show_rating_public !== false || selectedDriver.show_rating_partners !== false) && (
                    <div className="flex items-center justify-center gap-2 mt-2">
                      <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                      <span className="font-medium">{selectedDriver.rating.toFixed(1)}/5</span>
                      {selectedDriver.total_rides && (
                        <span className="text-muted-foreground">
                          ({selectedDriver.total_rides} courses)
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Bio */}
              {selectedDriver.bio && (
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">À propos</h4>
                  <p className="text-sm whitespace-pre-wrap">{selectedDriver.bio}</p>
                </div>
              )}

              {/* Vehicle */}
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Car className="w-4 h-4" />
                  Véhicule
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Modèle:</span>{" "}
                    {selectedDriver.vehicle_brand} {selectedDriver.vehicle_model}
                  </div>
                  {selectedDriver.vehicle_year && (
                    <div>
                      <span className="text-muted-foreground">Année:</span>{" "}
                      {selectedDriver.vehicle_year}
                    </div>
                  )}
                  {selectedDriver.vehicle_color && (
                    <div>
                      <span className="text-muted-foreground">Couleur:</span>{" "}
                      {selectedDriver.vehicle_color}
                    </div>
                  )}
                  {selectedDriver.max_passengers && (
                    <div>
                      <span className="text-muted-foreground">Passagers max:</span>{" "}
                      {selectedDriver.max_passengers}
                    </div>
                  )}
                  {selectedDriver.vehicle_category && (
                    <div>
                      <span className="text-muted-foreground">Catégorie:</span>{" "}
                      {selectedDriver.vehicle_category}
                    </div>
                  )}
                </div>
                {selectedDriver.vehicle_equipment?.length > 0 && (
                  <div className="mt-4">
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

              {/* Pricing - only if driver allows */}
              {selectedDriver.show_pricing_partners && (
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Euro className="w-4 h-4" />
                    Tarifs indicatifs
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {selectedDriver.base_rate && (
                      <div>
                        <span className="text-muted-foreground">Prise en charge:</span>{" "}
                        {selectedDriver.base_rate.toFixed(2)}€
                      </div>
                    )}
                    {selectedDriver.per_km_rate && (
                      <div>
                        <span className="text-muted-foreground">Par km:</span>{" "}
                        {selectedDriver.per_km_rate.toFixed(2)}€
                      </div>
                    )}
                    {selectedDriver.hourly_rate && (
                      <div>
                        <span className="text-muted-foreground">Taux horaire:</span>{" "}
                        {selectedDriver.hourly_rate.toFixed(2)}€/h
                      </div>
                    )}
                    {selectedDriver.minimum_price && (
                      <div>
                        <span className="text-muted-foreground">Minimum:</span>{" "}
                        {selectedDriver.minimum_price.toFixed(2)}€
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Services */}
              {selectedDriver.services_offered?.length > 0 && (
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
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

              {/* Sectors */}
              {selectedDriver.working_sectors?.length > 0 && (
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
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

              <div className="flex gap-2 pt-4 border-t">
                <Button variant="outline" className="flex-1" onClick={() => setShowProfileDialog(false)}>
                  Fermer
                </Button>
                <Button 
                  className="flex-1" 
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
