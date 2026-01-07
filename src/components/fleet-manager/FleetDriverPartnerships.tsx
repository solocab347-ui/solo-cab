import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Handshake, 
  Search, 
  Star, 
  Car, 
  MapPin, 
  Send, 
  Check, 
  X, 
  Clock, 
  FileText,
  Loader2,
  Users,
  Percent,
  AlertTriangle,
  Wallet,
  Eye,
  Phone,
  Mail,
  Briefcase,
  Euro,
  ImageIcon,
  Building2,
  Filter,
  Edit,
  Navigation
} from "lucide-react";
import { extractCityDepartment } from "@/lib/addressPrivacy";
import { getServiceLabel, getServiceIcon } from "@/lib/serviceLabels";
import { getEquipmentLabel } from "@/lib/vehicleEquipmentDisplay";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { PartnershipModificationDialog } from "./PartnershipModificationDialog";
import { PendingModificationBanner } from "@/components/shared/PendingModificationBanner";
import { PartnershipContractDocument } from "./PartnershipContractDocument";
import { PartnershipSignatureConfirmation } from "@/components/shared/PartnershipSignatureConfirmation";
import { PartnerPublicProfilePreview } from "@/components/shared/PartnerPublicProfilePreview";

// Vehicle categories
const VEHICLE_CATEGORIES = [
  { value: 'berline_standard', label: 'Berline Standard' },
  { value: 'berline_luxe', label: 'Berline Luxe' },
  { value: 'berline_electrique', label: 'Berline Électrique' },
  { value: 'electrique', label: 'Électrique' },
  { value: 'hybrid', label: 'Hybride' },
  { value: 'van', label: 'Van' },
  { value: 'suv', label: 'SUV' },
  { value: 'minivan', label: 'Minivan' },
  { value: 'tpmr', label: 'TPMR (Handicapés)' },
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

interface FleetDriverPartnershipsProps {
  fleetManagerId: string;
  defaultCommission: number;
}

interface DriverVehicle {
  id: string;
  brand: string;
  model: string;
  year: number;
  color: string | null;
  category: string | null;
  photos: string[];
  equipment: string[];
  is_favorite: boolean;
  max_passengers: number | null;
}

interface IndependentDriver {
  id: string;
  user_id: string;
  vehicle_model: string;
  vehicle_brand: string | null;
  vehicle_year?: number | null;
  vehicle_color?: string | null;
  vehicle_equipment?: string[] | null;
  vehicle_photos?: string[] | null;
  gallery_photos?: string[] | null;
  services_offered?: string[] | null;
  rating: number | null;
  total_rides: number | null;
  working_sectors: string[] | null;
  bio: string | null;
  service_description?: string | null;
  base_fare?: number | null;
  per_km_rate?: number | null;
  hourly_rate?: number | null;
  show_phone?: boolean | null;
  show_email?: boolean | null;
  show_rating_partners?: boolean | null;
  show_pricing_partners?: boolean | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  home_address?: string | null;
  vehicles?: DriverVehicle[];
  profile?: {
    full_name: string;
    profile_photo_url: string | null;
    phone?: string | null;
    email?: string | null;
  };
}

interface Partnership {
  id: string;
  driver_id: string;
  fleet_manager_id: string;
  initiated_by: string;
  commission_type?: string;
  commission_percentage: number;
  commission_fixed_amount?: number | null;
  status: string;
  fleet_manager_signed: boolean;
  driver_signed: boolean;
  contract_signed: boolean;
  proposal_message: string | null;
  rejection_reason: string | null;
  proposed_at: string;
  payment_schedule?: string;
  pending_modification?: boolean;
  pending_modification_by?: string;
  pending_new_commission?: number;
  pending_new_commission_type?: string;
  pending_new_commission_fixed_amount?: number | null;
  pending_new_payment_schedule?: string;
  pending_modification_reason?: string;
  fleet_manager_signed_at?: string;
  driver_signed_at?: string;
  created_at?: string;
  driver?: IndependentDriver;
}

interface FleetManagerInfo {
  name: string;
  company: string;
}


export const FleetDriverPartnerships = ({ 
  fleetManagerId, 
  defaultCommission 
}: FleetDriverPartnershipsProps) => {
  const [loading, setLoading] = useState(true);
  const [partnerships, setPartnerships] = useState<Partnership[]>([]);
  const [independentDrivers, setIndependentDrivers] = useState<IndependentDriver[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDriver, setSelectedDriver] = useState<IndependentDriver | null>(null);
  const [showProposalDialog, setShowProposalDialog] = useState(false);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [proposalMessage, setProposalMessage] = useState("");
  const [commissionRate, setCommissionRate] = useState(defaultCommission.toString());
  const [commissionType, setCommissionType] = useState<"percentage" | "fixed">("percentage");
  const [commissionFixedAmount, setCommissionFixedAmount] = useState("");
  const [paymentSchedule, setPaymentSchedule] = useState("per_course");
  const [submitting, setSubmitting] = useState(false);
  
  // Fleet manager info for contracts
  const [fleetManagerInfo, setFleetManagerInfo] = useState<FleetManagerInfo | null>(null);
  
  // Modification dialog state
  const [showModificationDialog, setShowModificationDialog] = useState(false);
  const [modifyingPartnership, setModifyingPartnership] = useState<Partnership | null>(null);
  
  // Counter-proposal dialog state (for pending proposals from drivers)
  const [showCounterProposalDialog, setShowCounterProposalDialog] = useState(false);
  const [counterProposingPartnership, setCounterProposingPartnership] = useState<Partnership | null>(null);
  const [counterCommission, setCounterCommission] = useState(10);
  const [counterPaymentSchedule, setCounterPaymentSchedule] = useState("per_course");
  const [counterReason, setCounterReason] = useState("");
  const [submittingCounter, setSubmittingCounter] = useState(false);
  
  // Pre-signature confirmation state
  const [confirmSignaturePartnership, setConfirmSignaturePartnership] = useState<Partnership | null>(null);
  const [signingContract, setSigningContract] = useState(false);
  
  // Profile preview before signature
  const [previewProfilePartnership, setPreviewProfilePartnership] = useState<Partnership | null>(null);
  
  // Advanced filters
  const [showFilters, setShowFilters] = useState(false);
  const [selectedVehicleType, setSelectedVehicleType] = useState<string>('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [selectedRegion, setSelectedRegion] = useState<string>('');
  const [citySearch, setCitySearch] = useState('');
  const [minRating, setMinRating] = useState(0);

  useEffect(() => {
    fetchData();
  }, [fleetManagerId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch fleet manager info for contracts
      const { data: fmData } = await supabase
        .from("fleet_managers")
        .select("company_name, contact_name, user_id")
        .eq("id", fleetManagerId)
        .single();

      if (fmData) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", fmData.user_id)
          .single();

        setFleetManagerInfo({
          name: profile?.full_name || fmData.contact_name,
          company: fmData.company_name
        });
      }

      // Fetch existing partnerships
      const { data: partnershipsData, error: partErr } = await supabase
        .from("fleet_driver_partnerships")
        .select("*")
        .eq("fleet_manager_id", fleetManagerId)
        .order("created_at", { ascending: false });

      if (partErr) throw partErr;

      // Get driver info for partnerships
      if (partnershipsData && partnershipsData.length > 0) {
        const driverIds = partnershipsData.map(p => p.driver_id);
        const { data: driversData } = await supabase
          .from("drivers")
          .select("id, user_id, vehicle_model, vehicle_brand, vehicle_year, vehicle_color, vehicle_equipment, vehicle_photos, gallery_photos, services_offered, rating, total_rides, working_sectors, bio, service_description, base_fare, per_km_rate, hourly_rate, show_phone, show_email, show_rating_partners, show_pricing_partners, contact_phone, contact_email, home_address")
          .in("id", driverIds);

        // Fetch vehicles for drivers
        const { data: vehiclesData } = await supabase
          .from("driver_vehicles")
          .select("*")
          .in("driver_id", driverIds)
          .eq("is_active", true);

        if (driversData) {
          const userIds = driversData.map(d => d.user_id);
          const { data: profilesData } = await supabase
            .from("profiles")
            .select("id, full_name, profile_photo_url, phone, email")
            .in("id", userIds);

          const partnershipsWithDrivers = partnershipsData.map(p => {
            const driver = driversData.find(d => d.id === p.driver_id);
            const driverVehicles = vehiclesData?.filter(v => v.driver_id === p.driver_id) || [];
            return {
              ...p,
              driver: {
                ...driver,
                vehicles: driverVehicles,
                profile: profilesData?.find(pr => pr.id === driver?.user_id)
              }
            };
          });
          setPartnerships(partnershipsWithDrivers as Partnership[]);
        } else {
          setPartnerships(partnershipsData as Partnership[]);
        }
      } else {
        setPartnerships([]);
      }

      // Fetch independent drivers (not in any fleet) with complete data
      const { data: independentData, error: indErr } = await supabase
        .from("drivers")
        .select("id, user_id, vehicle_model, vehicle_brand, vehicle_year, vehicle_color, vehicle_equipment, vehicle_photos, gallery_photos, services_offered, rating, total_rides, working_sectors, bio, service_description, base_fare, per_km_rate, hourly_rate, show_phone, show_email, show_rating_partners, show_pricing_partners, contact_phone, contact_email, home_address")
        .eq("status", "validated")
        .eq("public_profile_enabled", true)
        .is("fleet_manager_id", null);

      console.log("Independent drivers query result:", { independentData, indErr });

      if (independentData && independentData.length > 0) {
        const userIds = independentData.map(d => d.user_id);
        const driverIds = independentData.map(d => d.id);
        
        // Fetch profiles and vehicles in parallel
        const [profilesResult, vehiclesResult] = await Promise.all([
          supabase
            .from("profiles")
            .select("id, full_name, profile_photo_url, phone, email")
            .in("id", userIds),
          supabase
            .from("driver_vehicles")
            .select("*")
            .in("driver_id", driverIds)
            .eq("is_active", true)
        ]);

        const profiles = profilesResult.data;
        const vehiclesData = vehiclesResult.data;

        const driversWithProfiles = independentData.map(d => ({
          ...d,
          vehicles: vehiclesData?.filter(v => v.driver_id === d.id) || [],
          profile: profiles?.find(p => p.id === d.user_id)
        }));
        console.log("Drivers with profiles:", driversWithProfiles);
        setIndependentDrivers(driversWithProfiles);
      } else {
        setIndependentDrivers([]);
      }
    } catch (error) {
      console.error("Error fetching partnerships:", error);
      toast.error("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  };

  const handleViewProfile = (driver: IndependentDriver) => {
    setSelectedDriver(driver);
    setShowProfileDialog(true);
  };

  const handleProposePartnership = (driver: IndependentDriver) => {
    setSelectedDriver(driver);
    setCommissionRate(defaultCommission.toString());
    setCommissionType("percentage");
    setCommissionFixedAmount("");
    setPaymentSchedule("per_course");
    setProposalMessage("");
    setShowProposalDialog(true);
  };

  const submitProposal = async () => {
    if (!selectedDriver) return;
    setSubmitting(true);

    try {
      const { error } = await supabase
        .from("fleet_driver_partnerships")
        .insert({
          fleet_manager_id: fleetManagerId,
          driver_id: selectedDriver.id,
          initiated_by: "fleet_manager",
          commission_type: commissionType,
          commission_percentage: commissionType === "percentage" ? parseFloat(commissionRate) : 0,
          commission_fixed_amount: commissionType === "fixed" ? parseFloat(commissionFixedAmount) : null,
          payment_schedule: paymentSchedule,
          proposal_message: proposalMessage || null,
          fleet_manager_signed: true,
          fleet_manager_signed_at: new Date().toISOString()
        });

      if (error) {
        if (error.code === "23505") {
          toast.error("Un partenariat existe déjà avec ce chauffeur");
        } else {
          throw error;
        }
        return;
      }

      // Notify driver
      const { data: driverData } = await supabase
        .from("drivers")
        .select("user_id")
        .eq("id", selectedDriver.id)
        .single();

      if (driverData) {
        const commissionInfo = commissionType === "percentage" 
          ? `${commissionRate}% de commission` 
          : `${commissionFixedAmount}€ par course`;
        await supabase.from("notifications").insert({
          user_id: driverData.user_id,
          title: "Proposition de partenariat",
          message: `Un gestionnaire de flotte vous propose un partenariat avec ${commissionInfo}`,
          type: "partnership",
          link: "/driver-dashboard?tab=partnerships"
        });
      }

      toast.success("Proposition envoyée !");
      setShowProposalDialog(false);
      fetchData();
    } catch (error) {
      console.error("Error proposing partnership:", error);
      toast.error("Erreur lors de l'envoi");
    } finally {
      setSubmitting(false);
    }
  };

  const signContract = async (partnershipId: string) => {
    try {
      const { error } = await supabase
        .from("fleet_driver_partnerships")
        .update({
          fleet_manager_signed: true,
          fleet_manager_signed_at: new Date().toISOString(),
          status: "accepted",
          accepted_at: new Date().toISOString()
        })
        .eq("id", partnershipId);

      if (error) throw error;
      toast.success("Contrat signé !");
      fetchData();
    } catch (error) {
      console.error("Error signing contract:", error);
      toast.error("Erreur lors de la signature");
    }
  };

  const cancelPartnership = async (partnershipId: string) => {
    try {
      const { error } = await supabase
        .from("fleet_driver_partnerships")
        .update({
          status: "cancelled"
        })
        .eq("id", partnershipId);

      if (error) throw error;
      toast.success("Partenariat annulé");
      fetchData();
    } catch (error) {
      console.error("Error cancelling partnership:", error);
      toast.error("Erreur lors de l'annulation");
    }
  };

  const openCounterProposal = (partnership: Partnership) => {
    setCounterProposingPartnership(partnership);
    setCounterCommission(partnership.commission_percentage);
    setCounterPaymentSchedule(partnership.payment_schedule || "per_course");
    setCounterReason("");
    setShowCounterProposalDialog(true);
  };

  const submitCounterProposal = async () => {
    if (!counterProposingPartnership) return;
    
    if (!counterReason.trim()) {
      toast.error("Veuillez indiquer la raison de votre contre-proposition");
      return;
    }
    
    setSubmittingCounter(true);
    try {
      // Update the partnership with the counter-proposal
      const { error } = await supabase
        .from("fleet_driver_partnerships")
        .update({
          commission_percentage: counterCommission,
          payment_schedule: counterPaymentSchedule,
          proposal_message: counterReason,
          initiated_by: "fleet_manager", // Flip the initiator to show it's now the fleet manager's turn
          fleet_manager_signed: true,
          fleet_manager_signed_at: new Date().toISOString(),
          driver_signed: false, // Reset driver signature to require their approval
          driver_signed_at: null,
        })
        .eq("id", counterProposingPartnership.id);

      if (error) throw error;

      // Notify driver
      const { data: driverData } = await supabase
        .from("drivers")
        .select("user_id")
        .eq("id", counterProposingPartnership.driver_id)
        .single();

      if (driverData) {
        await supabase.from("notifications").insert({
          user_id: driverData.user_id,
          title: "Contre-proposition reçue",
          message: `Le gestionnaire a fait une contre-proposition: ${counterCommission}%`,
          type: "partnership",
          link: "/driver-dashboard?tab=partnerships"
        });
      }

      toast.success("Contre-proposition envoyée !");
      setShowCounterProposalDialog(false);
      fetchData();
    } catch (error) {
      console.error("Error submitting counter-proposal:", error);
      toast.error("Erreur lors de l'envoi");
    } finally {
      setSubmittingCounter(false);
    }
  };

  const getCategoryLabel = (category: string | null) => {
    if (!category) return null;
    const found = VEHICLE_CATEGORIES.find(c => c.value === category);
    return found ? found.label : category;
  };

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedVehicleType('');
    setSelectedDepartment('');
    setSelectedRegion('');
    setCitySearch('');
    setMinRating(0);
  };

  const filteredDrivers = independentDrivers.filter(d => {
    // Text search
    if (searchTerm) {
      const name = d.profile?.full_name?.toLowerCase() || "";
      const vehicle = `${d.vehicle_brand} ${d.vehicle_model}`.toLowerCase();
      const sectors = d.working_sectors?.join(" ").toLowerCase() || "";
      if (!name.includes(searchTerm.toLowerCase()) && 
          !vehicle.includes(searchTerm.toLowerCase()) &&
          !sectors.includes(searchTerm.toLowerCase())) {
        return false;
      }
    }
    
    // Vehicle type filter
    if (selectedVehicleType) {
      // TODO: Add vehicle_category to IndependentDriver interface when available
      // For now, check working_sectors as fallback
    }
    
    // Department filter
    if (selectedDepartment && d.working_sectors) {
      if (!d.working_sectors.some(s => s.toLowerCase().includes(selectedDepartment.toLowerCase()))) {
        return false;
      }
    }
    
    // Region filter
    if (selectedRegion && d.working_sectors) {
      if (!d.working_sectors.some(s => s.toLowerCase().includes(selectedRegion.toLowerCase()))) {
        return false;
      }
    }
    
    // City filter
    if (citySearch && d.working_sectors) {
      if (!d.working_sectors.some(s => s.toLowerCase().includes(citySearch.toLowerCase()))) {
        return false;
      }
    }
    
    // Rating filter
    if (minRating > 0 && (d.rating === null || d.rating < minRating)) {
      return false;
    }
    
    return true;
  });

  // Filter out drivers with existing partnerships
  const existingPartnerDriverIds = partnerships.map(p => p.driver_id);
  const availableDrivers = filteredDrivers.filter(d => !existingPartnerDriverIds.includes(d.id));

  const activePartnerships = partnerships.filter(p => p.status === "accepted" && p.contract_signed);
  const pendingPartnerships = partnerships.filter(p => p.status === "pending" || (p.status === "accepted" && !p.contract_signed));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-card/50 backdrop-blur border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Handshake className="w-5 h-5 text-primary" />
            Partenariats Chauffeurs
          </CardTitle>
          <CardDescription>
            Collaborez avec des chauffeurs indépendants pour élargir votre offre
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="explore" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="explore" className="gap-2">
                <Search className="w-4 h-4" />
                Explorer
              </TabsTrigger>
              <TabsTrigger value="pending" className="gap-2">
                <Clock className="w-4 h-4" />
                En attente ({pendingPartnerships.length})
              </TabsTrigger>
              <TabsTrigger value="active" className="gap-2">
                <Check className="w-4 h-4" />
                Actifs ({activePartnerships.length})
              </TabsTrigger>
            </TabsList>

            {/* Explore Tab */}
            <TabsContent value="explore" className="space-y-4">
              {/* Search Bar */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher par nom, véhicule ou secteur..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Filtres
                </Button>
              </div>

              {/* Advanced Filters */}
              {showFilters && (
                <Card className="border-border/50">
                  <CardContent className="pt-4 space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Chaque filtre fonctionne indépendamment.
                    </p>
                    
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      {/* Vehicle Category Filter */}
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2 text-sm">
                          <Car className="h-4 w-4" />
                          Catégorie
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
                        <Label className="flex items-center gap-2 text-sm">
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
                        <Label className="flex items-center gap-2 text-sm">
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
                        <Label className="flex items-center gap-2 text-sm">
                          <MapPin className="h-4 w-4" />
                          Ville / Secteur
                        </Label>
                        <Input
                          placeholder="Paris, Lyon..."
                          value={citySearch}
                          onChange={(e) => setCitySearch(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Rating Filter */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2 text-sm">
                        <Star className="h-4 w-4" />
                        Note minimum : {minRating > 0 ? `${minRating}/5` : 'Aucune'}
                      </Label>
                      <Slider
                        value={[minRating]}
                        onValueChange={(v) => setMinRating(v[0])}
                        max={5}
                        step={0.5}
                      />
                    </div>

                    {/* Reset button */}
                    <Button variant="outline" onClick={resetFilters} className="w-full">
                      Réinitialiser les filtres
                    </Button>

                    {/* Active filters display */}
                    {(selectedVehicleType || selectedDepartment || selectedRegion || citySearch || minRating > 0) && (
                      <div className="flex flex-wrap gap-2 pt-2 border-t">
                        <span className="text-sm text-muted-foreground">Filtres actifs :</span>
                        {selectedVehicleType && (
                          <Badge variant="secondary" className="text-xs">
                            {getCategoryLabel(selectedVehicleType)}
                          </Badge>
                        )}
                        {selectedDepartment && (
                          <Badge variant="secondary" className="text-xs">
                            {selectedDepartment}
                          </Badge>
                        )}
                        {selectedRegion && (
                          <Badge variant="secondary" className="text-xs">
                            {selectedRegion}
                          </Badge>
                        )}
                        {citySearch && (
                          <Badge variant="secondary" className="text-xs">
                            {citySearch}
                          </Badge>
                        )}
                        {minRating > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            ≥ {minRating}★
                          </Badge>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {availableDrivers.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
                  <p className="text-muted-foreground">Aucun chauffeur indépendant disponible</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {availableDrivers.map((driver) => (
                    <Card 
                      key={driver.id} 
                      className="border-border/50 hover:border-primary/50 transition-colors cursor-pointer"
                      onClick={() => handleViewProfile(driver)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <Avatar className="w-16 h-16 border-2 border-border">
                            <AvatarImage src={driver.profile?.profile_photo_url || undefined} />
                            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 text-lg">
                              {(driver.profile?.full_name || "C").slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold truncate">
                                {driver.profile?.full_name || "Chauffeur"}
                              </h3>
                              {driver.show_rating_partners && driver.rating && (
                                <Badge variant="secondary" className="bg-warning/20 text-warning gap-1">
                                  <Star className="w-3 h-3 fill-warning" />
                                  {driver.rating.toFixed(1)}
                                </Badge>
                              )}
                            </div>
                            {/* Use driver_vehicles if available, fallback to legacy fields */}
                            {(() => {
                              const favoriteVehicle = driver.vehicles?.find(v => v.is_favorite) || driver.vehicles?.[0];
                              if (favoriteVehicle) {
                                return (
                                  <p className="text-sm text-muted-foreground mb-2">
                                    <Car className="w-3 h-3 inline mr-1" />
                                    {favoriteVehicle.brand} {favoriteVehicle.model}
                                    {favoriteVehicle.year && ` (${favoriteVehicle.year})`}
                                  </p>
                                );
                              }
                              return driver.vehicle_brand || driver.vehicle_model ? (
                                <p className="text-sm text-muted-foreground mb-2">
                                  <Car className="w-3 h-3 inline mr-1" />
                                  {driver.vehicle_brand} {driver.vehicle_model}
                                  {driver.vehicle_year && ` (${driver.vehicle_year})`}
                                </p>
                              ) : null;
                            })()}
                            {driver.working_sectors && driver.working_sectors.length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-2">
                                {driver.working_sectors.slice(0, 3).map((sector, i) => (
                                  <Badge key={i} variant="outline" className="text-xs">
                                    <MapPin className="w-2 h-2 mr-1" />
                                    {sector}
                                  </Badge>
                                ))}
                                {driver.working_sectors.length > 3 && (
                                  <span className="text-xs text-muted-foreground">
                                    +{driver.working_sectors.length - 3}
                                  </span>
                                )}
                              </div>
                            )}
                            <p className="text-xs text-muted-foreground">
                              {driver.total_rides || 0} courses effectuées
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-4">
                          <Button 
                            variant="outline"
                            className="flex-1 gap-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewProfile(driver);
                            }}
                          >
                            <Eye className="w-4 h-4" />
                            Voir le profil
                          </Button>
                          <Button 
                            className="flex-1 gap-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleProposePartnership(driver);
                            }}
                          >
                            <Send className="w-4 h-4" />
                            Proposer
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Pending Tab */}
            <TabsContent value="pending" className="space-y-4">
              {pendingPartnerships.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
                  <p className="text-muted-foreground">Aucune demande en attente</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingPartnerships.map((partnership) => (
                    <Card key={partnership.id} className="border-warning/30 bg-warning/5">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <Avatar className="w-12 h-12">
                              <AvatarImage src={partnership.driver?.profile?.profile_photo_url || undefined} />
                              <AvatarFallback>
                                {(partnership.driver?.profile?.full_name || "C").slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <h3 className="font-semibold">
                                {partnership.driver?.profile?.full_name || "Chauffeur"}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                Commission: {partnership.commission_type === "fixed" 
                                  ? `${partnership.commission_fixed_amount}€/course` 
                                  : `${partnership.commission_percentage}%`}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant={partnership.fleet_manager_signed ? "default" : "secondary"}>
                                  {partnership.fleet_manager_signed ? "✓ Vous avez signé" : "En attente de votre signature"}
                                </Badge>
                                <Badge variant={partnership.driver_signed ? "default" : "secondary"}>
                                  {partnership.driver_signed ? "✓ Chauffeur a signé" : "En attente du chauffeur"}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {!partnership.fleet_manager_signed && partnership.initiated_by === "driver" && (
                              <>
                                <Button size="sm" onClick={() => setPreviewProfilePartnership(partnership)}>
                                  <FileText className="w-4 h-4 mr-1" />
                                  Accepter et signer
                                </Button>
                                <Button 
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => openCounterProposal(partnership)}
                                >
                                  <Edit className="w-4 h-4 mr-1" />
                                  Contre-proposer
                                </Button>
                              </>
                            )}
                            {partnership.fleet_manager_signed && !partnership.driver_signed && partnership.initiated_by === "fleet_manager" && (
                              <Badge variant="secondary" className="py-1.5">
                                <Clock className="w-3 h-3 mr-1" />
                                En attente de réponse du chauffeur
                              </Badge>
                            )}
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => cancelPartnership(partnership.id)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Active Tab */}
            <TabsContent value="active" className="space-y-4">
              {activePartnerships.length === 0 ? (
                <div className="text-center py-8">
                  <Handshake className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
                  <p className="text-muted-foreground">Aucun partenariat actif</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activePartnerships.map((partnership) => (
                    <Card key={partnership.id} className="border-success/30 bg-success/5">
                      <CardContent className="p-4 space-y-4">
                        {/* Pending modification banner */}
                        {partnership.pending_modification && (
                          <PendingModificationBanner
                            partnershipId={partnership.id}
                            pendingCommission={partnership.pending_new_commission || partnership.commission_percentage}
                            pendingPaymentSchedule={partnership.pending_new_payment_schedule || partnership.payment_schedule || "per_course"}
                            currentCommission={partnership.commission_percentage}
                            currentPaymentSchedule={partnership.payment_schedule || "per_course"}
                            reason={partnership.pending_modification_reason || ""}
                            initiatedBy={partnership.pending_modification_by as "fleet_manager" | "driver"}
                            isInitiator={partnership.pending_modification_by === "fleet_manager"}
                            onResponse={fetchData}
                          />
                        )}

                        <div className="flex items-center gap-4">
                          <Avatar className="w-14 h-14 border-2 border-success/30">
                            <AvatarImage src={partnership.driver?.profile?.profile_photo_url || undefined} />
                            <AvatarFallback className="bg-success/20">
                              {(partnership.driver?.profile?.full_name || "C").slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">
                                {partnership.driver?.profile?.full_name || "Chauffeur"}
                              </h3>
                              <Badge className="bg-success/20 text-success border-success/30">
                                <Check className="w-3 h-3 mr-1" />
                                Actif
                              </Badge>
                            </div>
                            {/* Use driver_vehicles if available, fallback to legacy fields */}
                            {(() => {
                              const favoriteVehicle = partnership.driver?.vehicles?.find(v => v.is_favorite) || partnership.driver?.vehicles?.[0];
                              if (favoriteVehicle) {
                                return (
                                  <p className="text-sm text-muted-foreground">
                                    <Car className="w-3 h-3 inline mr-1" />
                                    {favoriteVehicle.brand} {favoriteVehicle.model}
                                    {favoriteVehicle.year && ` (${favoriteVehicle.year})`}
                                  </p>
                                );
                              }
                              return partnership.driver?.vehicle_brand || partnership.driver?.vehicle_model ? (
                                <p className="text-sm text-muted-foreground">
                                  <Car className="w-3 h-3 inline mr-1" />
                                  {partnership.driver?.vehicle_brand} {partnership.driver?.vehicle_model}
                                  {partnership.driver?.vehicle_year && ` (${partnership.driver?.vehicle_year})`}
                                </p>
                              ) : null;
                            })()}
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              <Badge variant="outline">
                                {partnership.commission_type === "fixed" ? (
                                  <>
                                    <Euro className="w-3 h-3 mr-1" />
                                    {partnership.commission_fixed_amount}€/course
                                  </>
                                ) : (
                                  <>
                                    <Percent className="w-3 h-3 mr-1" />
                                    {partnership.commission_percentage}% commission
                                  </>
                                )}
                              </Badge>
                              {partnership.payment_schedule && (
                                <Badge variant="secondary" className="text-xs">
                                  <Clock className="w-3 h-3 mr-1" />
                                  {partnership.payment_schedule === "per_course" ? "Par course" : 
                                   partnership.payment_schedule === "weekly" ? "Hebdo" : "Mensuel"}
                                </Badge>
                              )}
                            </div>
                            {/* Contract document */}
                            {fleetManagerInfo && (
                              <div className="mt-3">
                                <PartnershipContractDocument
                                  partnershipId={partnership.id}
                                  fleetManagerName={fleetManagerInfo.name}
                                  fleetManagerCompany={fleetManagerInfo.company}
                                  driverName={partnership.driver?.profile?.full_name || "Chauffeur"}
                                  commissionPercentage={partnership.commission_percentage}
                                  paymentSchedule={partnership.payment_schedule || "per_course"}
                                  signedAt={partnership.created_at}
                                  fleetManagerSignedAt={partnership.fleet_manager_signed_at}
                                  driverSignedAt={partnership.driver_signed_at}
                                  contractType="partner"
                                />
                              </div>
                            )}
                          </div>
                          
                          {/* Modify button */}
                          {!partnership.pending_modification && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setModifyingPartnership(partnership);
                                setShowModificationDialog(true);
                              }}
                            >
                              <Edit className="w-4 h-4 mr-1" />
                              Modifier
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Proposal Dialog */}
      <Dialog open={showProposalDialog} onOpenChange={setShowProposalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Handshake className="w-5 h-5 text-primary" />
              Proposer un partenariat
            </DialogTitle>
            <DialogDescription>
              Proposez une collaboration à {selectedDriver?.profile?.full_name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Alert>
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription>
                <strong>Important :</strong> Ce partenariat nécessite la signature des deux parties. 
                Le non-respect des délais de paiement peut entraîner la suspension du compte du chauffeur 
                et de sa capacité à établir des partenariats.
              </AlertDescription>
            </Alert>

            {/* Type de commission */}
            <div className="space-y-2">
              <Label>Type de commission</Label>
              <Select value={commissionType} onValueChange={(v) => setCommissionType(v as "percentage" | "fixed")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Pourcentage (%)</SelectItem>
                  <SelectItem value="fixed">Montant fixe (€)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {commissionType === "percentage" ? (
              <div className="space-y-2">
                <Label>Commission (%)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    max="50"
                    value={commissionRate}
                    onChange={(e) => setCommissionRate(e.target.value)}
                    className="w-24"
                  />
                  <span className="text-muted-foreground">%</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Pourcentage prélevé sur chaque course effectuée par le chauffeur
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Montant fixe par course (€)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    step="0.5"
                    value={commissionFixedAmount}
                    onChange={(e) => setCommissionFixedAmount(e.target.value)}
                    className="w-24"
                    placeholder="Ex: 5"
                  />
                  <span className="text-muted-foreground">€</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Montant fixe prélevé sur chaque course, quel que soit le prix
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Période de versement des commissions
              </Label>
              <Select value={paymentSchedule} onValueChange={setPaymentSchedule}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir la période" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="per_course">À chaque course (48h max)</SelectItem>
                  <SelectItem value="weekly">Hebdomadaire</SelectItem>
                  <SelectItem value="monthly">Mensuel</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Le chauffeur devra régler ses commissions selon cette période
              </p>
            </div>

            <div className="space-y-2">
              <Label>Message (optionnel)</Label>
              <Textarea
                placeholder="Présentez votre offre de partenariat..."
                value={proposalMessage}
                onChange={(e) => setProposalMessage(e.target.value)}
                rows={3}
              />
            </div>

            <Alert className="bg-info/10 border-info/30">
              <Wallet className="w-4 h-4 text-info" />
              <AlertDescription className="text-sm">
                En signant ce contrat, le chauffeur s'engage à verser {commissionType === "percentage" ? `${commissionRate}%` : `${commissionFixedAmount}€`} {commissionType === "percentage" ? "de chaque course" : "par course"}
                {paymentSchedule === "per_course" && " dans les 48h suivant chaque course."}
                {paymentSchedule === "weekly" && " de façon hebdomadaire."}
                {paymentSchedule === "monthly" && " de façon mensuelle."}
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProposalDialog(false)}>
              Annuler
            </Button>
            <Button onClick={submitProposal} disabled={submitting}>
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Envoyer la proposition
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Profile View Dialog */}
      <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <ScrollArea className="max-h-[80vh] pr-4">
            {selectedDriver && (
              <div className="space-y-6">
                <DialogHeader>
                  <div className="flex items-start gap-4">
                    <Avatar className="h-20 w-20 border-2 border-primary">
                      <AvatarImage src={selectedDriver.profile?.profile_photo_url || undefined} />
                      <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                        {(selectedDriver.profile?.full_name || "C").slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <DialogTitle className="text-2xl">{selectedDriver.profile?.full_name || "Chauffeur"}</DialogTitle>
                      <div className="flex items-center gap-4 mt-2">
                        {selectedDriver.show_rating_partners && selectedDriver.rating && (
                          <Badge className="bg-yellow-500/10 text-yellow-600">
                            <Star className="h-4 w-4 fill-current mr-1" />
                            {selectedDriver.rating.toFixed(1)}/5
                          </Badge>
                        )}
                        <Badge variant="outline">
                          <Check className="h-4 w-4 mr-1 text-green-500" />
                          {selectedDriver.total_rides || 0} courses
                        </Badge>
                      </div>
                    </div>
                  </div>
                </DialogHeader>

                <Tabs defaultValue="info" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="info">Infos</TabsTrigger>
                    <TabsTrigger value="vehicle">Véhicule</TabsTrigger>
                    <TabsTrigger value="services">Services</TabsTrigger>
                    <TabsTrigger value="contact">Contact</TabsTrigger>
                  </TabsList>

                  <TabsContent value="info" className="space-y-4 mt-4">
                    {selectedDriver.bio && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Biographie</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground">{selectedDriver.bio}</p>
                        </CardContent>
                      </Card>
                    )}

                    {selectedDriver.service_description && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Description des services</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground">{selectedDriver.service_description}</p>
                        </CardContent>
                      </Card>
                    )}

                    {selectedDriver.working_sectors && selectedDriver.working_sectors.length > 0 && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            Zones d'intervention
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex flex-wrap gap-2">
                            {selectedDriver.working_sectors.map((sector, i) => (
                              <Badge key={i} variant="secondary">{sector}</Badge>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Localisation - ville/département uniquement, pas l'adresse complète */}
                    {selectedDriver.home_address && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Navigation className="h-4 w-4" />
                            Localisation
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground">
                            {extractCityDepartment(selectedDriver.home_address) || "Non spécifiée"}
                          </p>
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>

                  <TabsContent value="vehicle" className="space-y-4 mt-4">
                    {/* Use driver_vehicles if available, else fallback to legacy */}
                    {(() => {
                      const vehicles = selectedDriver.vehicles || [];
                      const favoriteVehicle = vehicles.find(v => v.is_favorite) || vehicles[0];
                      
                      if (favoriteVehicle) {
                        return (
                          <>
                            <Card>
                              <CardHeader className="pb-2">
                                <CardTitle className="text-sm flex items-center gap-2">
                                  <Car className="h-4 w-4" />
                                  Véhicule principal
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-3">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label className="text-xs text-muted-foreground">Marque</Label>
                                    <p className="font-medium">{favoriteVehicle.brand}</p>
                                  </div>
                                  <div>
                                    <Label className="text-xs text-muted-foreground">Modèle</Label>
                                    <p className="font-medium">{favoriteVehicle.model}</p>
                                  </div>
                                  <div>
                                    <Label className="text-xs text-muted-foreground">Année</Label>
                                    <p className="font-medium">{favoriteVehicle.year}</p>
                                  </div>
                                  {favoriteVehicle.color && (
                                    <div>
                                      <Label className="text-xs text-muted-foreground">Couleur</Label>
                                      <p className="font-medium">{favoriteVehicle.color}</p>
                                    </div>
                                  )}
                                  {favoriteVehicle.category && (
                                    <div>
                                      <Label className="text-xs text-muted-foreground">Catégorie</Label>
                                      <p className="font-medium">{getCategoryLabel(favoriteVehicle.category)}</p>
                                    </div>
                                  )}
                                  {favoriteVehicle.max_passengers && (
                                    <div>
                                      <Label className="text-xs text-muted-foreground">Passagers max</Label>
                                      <p className="font-medium">{favoriteVehicle.max_passengers}</p>
                                    </div>
                                  )}
                                </div>
                              </CardContent>
                            </Card>

                            {favoriteVehicle.equipment && favoriteVehicle.equipment.length > 0 && (
                              <Card>
                                <CardHeader className="pb-2">
                                  <CardTitle className="text-sm">Équipements</CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <div className="flex flex-wrap gap-2">
                                    {favoriteVehicle.equipment.map((equip, i) => (
                                      <Badge key={i} variant="outline">
                                        {getEquipmentLabel(equip)}
                                      </Badge>
                                    ))}
                                  </div>
                                </CardContent>
                              </Card>
                            )}

                            {favoriteVehicle.photos && favoriteVehicle.photos.length > 0 && (
                              <Card>
                                <CardHeader className="pb-2">
                                  <CardTitle className="text-sm flex items-center gap-2">
                                    <ImageIcon className="h-4 w-4" />
                                    Photos du véhicule
                                  </CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <Carousel className="w-full">
                                    <CarouselContent>
                                      {favoriteVehicle.photos.map((photo, i) => (
                                        <CarouselItem key={i} className="md:basis-1/2 lg:basis-1/3">
                                          <img 
                                            src={photo} 
                                            alt={`Véhicule ${i + 1}`}
                                            className="w-full h-32 object-cover rounded-lg"
                                          />
                                        </CarouselItem>
                                      ))}
                                    </CarouselContent>
                                    <CarouselPrevious />
                                    <CarouselNext />
                                  </Carousel>
                                </CardContent>
                              </Card>
                            )}

                            {/* Show other vehicles if multiple */}
                            {vehicles.length > 1 && (
                              <Card>
                                <CardHeader className="pb-2">
                                  <CardTitle className="text-sm">Autres véhicules ({vehicles.length - 1})</CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <div className="space-y-2">
                                    {vehicles.filter(v => v.id !== favoriteVehicle.id).map((v, i) => (
                                      <div key={i} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                                        <Car className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm">{v.brand} {v.model} ({v.year})</span>
                                        {v.category && (
                                          <Badge variant="outline" className="text-xs ml-auto">
                                            {getCategoryLabel(v.category)}
                                          </Badge>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </CardContent>
                              </Card>
                            )}
                          </>
                        );
                      }

                      // Fallback to legacy vehicle fields
                      return (
                        <>
                          <Card>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm flex items-center gap-2">
                                <Car className="h-4 w-4" />
                                Véhicule
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              <div className="grid grid-cols-2 gap-4">
                                {selectedDriver.vehicle_brand && (
                                  <div>
                                    <Label className="text-xs text-muted-foreground">Marque</Label>
                                    <p className="font-medium">{selectedDriver.vehicle_brand}</p>
                                  </div>
                                )}
                                {selectedDriver.vehicle_model && (
                                  <div>
                                    <Label className="text-xs text-muted-foreground">Modèle</Label>
                                    <p className="font-medium">{selectedDriver.vehicle_model}</p>
                                  </div>
                                )}
                                {selectedDriver.vehicle_year && (
                                  <div>
                                    <Label className="text-xs text-muted-foreground">Année</Label>
                                    <p className="font-medium">{selectedDriver.vehicle_year}</p>
                                  </div>
                                )}
                                {selectedDriver.vehicle_color && (
                                  <div>
                                    <Label className="text-xs text-muted-foreground">Couleur</Label>
                                    <p className="font-medium">{selectedDriver.vehicle_color}</p>
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>

                          {selectedDriver.vehicle_equipment && selectedDriver.vehicle_equipment.length > 0 && (
                            <Card>
                              <CardHeader className="pb-2">
                                <CardTitle className="text-sm">Équipements</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="flex flex-wrap gap-2">
                                  {selectedDriver.vehicle_equipment.map((equip, i) => (
                                    <Badge key={i} variant="outline">
                                      {getEquipmentLabel(equip)}
                                    </Badge>
                                  ))}
                                </div>
                              </CardContent>
                            </Card>
                          )}

                          {selectedDriver.vehicle_photos && selectedDriver.vehicle_photos.length > 0 && (
                            <Card>
                              <CardHeader className="pb-2">
                                <CardTitle className="text-sm flex items-center gap-2">
                                  <ImageIcon className="h-4 w-4" />
                                  Photos du véhicule
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                <Carousel className="w-full">
                                  <CarouselContent>
                                    {selectedDriver.vehicle_photos.map((photo, i) => (
                                      <CarouselItem key={i} className="md:basis-1/2 lg:basis-1/3">
                                        <img 
                                          src={photo} 
                                          alt={`Véhicule ${i + 1}`}
                                          className="w-full h-32 object-cover rounded-lg"
                                        />
                                      </CarouselItem>
                                    ))}
                                  </CarouselContent>
                                  <CarouselPrevious />
                                  <CarouselNext />
                                </Carousel>
                              </CardContent>
                            </Card>
                          )}
                        </>
                      );
                    })()}

                    {selectedDriver.gallery_photos && selectedDriver.gallery_photos.length > 0 && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <ImageIcon className="h-4 w-4" />
                            Galerie photos
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-3 gap-2">
                            {selectedDriver.gallery_photos.slice(0, 6).map((photo, i) => (
                              <img 
                                key={i} 
                                src={photo} 
                                alt={`Photo ${i + 1}`}
                                className="w-full h-24 object-cover rounded-lg"
                              />
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>

                  <TabsContent value="services" className="space-y-4 mt-4">
                    {selectedDriver.services_offered && selectedDriver.services_offered.length > 0 && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Briefcase className="h-4 w-4" />
                            Services proposés
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex flex-wrap gap-2">
                            {selectedDriver.services_offered.map((service, i) => (
                              <Badge key={i} variant="secondary" className="gap-1">
                                <span>{getServiceIcon(service)}</span>
                                {getServiceLabel(service)}
                              </Badge>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Tarification - only show if driver allows it */}
                    {selectedDriver.show_pricing_partners && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Euro className="h-4 w-4" />
                            Tarification indicative
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-3 gap-4 text-center">
                            <div className="p-3 bg-muted/50 rounded-lg">
                              <p className="text-xs text-muted-foreground">Prise en charge</p>
                              <p className="font-bold text-lg">
                                {selectedDriver.base_fare ? `${selectedDriver.base_fare.toFixed(2)}€` : 'N/A'}
                              </p>
                            </div>
                            <div className="p-3 bg-muted/50 rounded-lg">
                              <p className="text-xs text-muted-foreground">Par km</p>
                              <p className="font-bold text-lg">
                                {selectedDriver.per_km_rate ? `${selectedDriver.per_km_rate.toFixed(2)}€` : 'N/A'}
                              </p>
                            </div>
                            <div className="p-3 bg-muted/50 rounded-lg">
                              <p className="text-xs text-muted-foreground">Par heure</p>
                              <p className="font-bold text-lg">
                                {selectedDriver.hourly_rate ? `${selectedDriver.hourly_rate.toFixed(2)}€` : 'N/A'}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {!selectedDriver.show_pricing_partners && (
                      <Card className="border-dashed">
                        <CardContent className="py-6 text-center">
                          <Euro className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                          <p className="text-sm text-muted-foreground">
                            Le chauffeur n'a pas activé le partage de ses tarifs
                          </p>
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>

                  <TabsContent value="contact" className="space-y-4 mt-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Coordonnées</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {selectedDriver.show_phone && (selectedDriver.contact_phone || selectedDriver.profile?.phone) && (
                          <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-lg">
                            <Phone className="h-5 w-5 text-primary" />
                            <div>
                              <p className="text-xs text-muted-foreground">Téléphone</p>
                              <a href={`tel:${selectedDriver.contact_phone || selectedDriver.profile?.phone}`} className="font-medium hover:text-primary">
                                {selectedDriver.contact_phone || selectedDriver.profile?.phone}
                              </a>
                            </div>
                          </div>
                        )}
                        {selectedDriver.show_email && (selectedDriver.contact_email || selectedDriver.profile?.email) && (
                          <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-lg">
                            <Mail className="h-5 w-5 text-primary" />
                            <div>
                              <p className="text-xs text-muted-foreground">Email</p>
                              <a href={`mailto:${selectedDriver.contact_email || selectedDriver.profile?.email}`} className="font-medium hover:text-primary">
                                {selectedDriver.contact_email || selectedDriver.profile?.email}
                              </a>
                            </div>
                          </div>
                        )}
                        {(!selectedDriver.show_phone && !selectedDriver.show_email) && (
                          <p className="text-muted-foreground text-sm text-center py-4">
                            Ce chauffeur n'a pas rendu ses coordonnées publiques
                          </p>
                        )}
                      </CardContent>
                    </Card>

                    <Button 
                      className="w-full" 
                      size="lg"
                      onClick={() => {
                        setShowProfileDialog(false);
                        handleProposePartnership(selectedDriver);
                      }}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Proposer un partenariat
                    </Button>
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Partnership Modification Dialog */}
      {modifyingPartnership && (
        <PartnershipModificationDialog
          open={showModificationDialog}
          onOpenChange={setShowModificationDialog}
          partnershipId={modifyingPartnership.id}
          currentCommission={modifyingPartnership.commission_percentage}
          currentPaymentSchedule={modifyingPartnership.payment_schedule || "per_course"}
          partnerName={modifyingPartnership.driver?.profile?.full_name || "Chauffeur"}
          initiatorType="fleet_manager"
          onSuccess={fetchData}
        />
      )}

      {/* Counter-Proposal Dialog */}
      <Dialog open={showCounterProposalDialog} onOpenChange={setShowCounterProposalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5 text-primary" />
              Contre-proposition
            </DialogTitle>
            <DialogDescription>
              Proposez de nouvelles conditions à {counterProposingPartnership?.driver?.profile?.full_name}
            </DialogDescription>
          </DialogHeader>

          {counterProposingPartnership && (
            <div className="space-y-4">
              <Alert>
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription>
                  Proposition actuelle: <strong>{counterProposingPartnership.commission_percentage}%</strong> de commission
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label>Nouvelle commission (%)</Label>
                <Input
                  type="number"
                  min={5}
                  max={30}
                  value={counterCommission}
                  onChange={(e) => setCounterCommission(parseInt(e.target.value) || 10)}
                />
                <p className="text-xs text-muted-foreground">Entre 5% et 30%</p>
              </div>

              <div className="space-y-2">
                <Label>Fréquence de paiement</Label>
                <Select value={counterPaymentSchedule} onValueChange={setCounterPaymentSchedule}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="per_course">Par course</SelectItem>
                    <SelectItem value="weekly">Hebdomadaire</SelectItem>
                    <SelectItem value="bi_weekly">Bi-mensuel</SelectItem>
                    <SelectItem value="monthly">Mensuel</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Raison de la contre-proposition *</Label>
                <Textarea
                  placeholder="Expliquez pourquoi vous proposez ces nouvelles conditions..."
                  value={counterReason}
                  onChange={(e) => setCounterReason(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCounterProposalDialog(false)}>
              Annuler
            </Button>
            <Button onClick={submitCounterProposal} disabled={submittingCounter}>
              {submittingCounter ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Envoyer la contre-proposition
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Partner Profile Preview before signature */}
      <PartnerPublicProfilePreview
        open={!!previewProfilePartnership}
        onOpenChange={(open) => !open && setPreviewProfilePartnership(null)}
        partnerId={previewProfilePartnership?.driver_id || ''}
        partnerType="driver"
        partnerName={previewProfilePartnership?.driver?.profile?.full_name || 'Chauffeur partenaire'}
        onContinue={() => {
          if (previewProfilePartnership) {
            setConfirmSignaturePartnership(previewProfilePartnership);
            setPreviewProfilePartnership(null);
          }
        }}
      />

      {/* Pre-Signature Confirmation Dialog */}
      <PartnershipSignatureConfirmation
        open={!!confirmSignaturePartnership}
        onOpenChange={(open) => !open && setConfirmSignaturePartnership(null)}
        partnerName={confirmSignaturePartnership?.driver?.profile?.full_name || 'Chauffeur partenaire'}
        commissionPercentage={confirmSignaturePartnership?.commission_percentage}
        paymentSchedule={confirmSignaturePartnership?.payment_schedule}
        onConfirmSign={async () => {
          if (confirmSignaturePartnership) {
            setSigningContract(true);
            await signContract(confirmSignaturePartnership.id);
            setSigningContract(false);
            setConfirmSignaturePartnership(null);
          }
        }}
        signing={signingContract}
      />
    </div>
  );
};
