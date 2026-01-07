import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { 
  Loader2, Building2, MapPin, Send, 
  Eye, Phone, Mail, Users, Euro
} from "lucide-react";
import { AdvancedLocationFilter, LocationFilterValues, getDefaultFilterValues } from "@/components/shared/AdvancedLocationFilter";
import { PartnershipSignatureConfirmation } from "@/components/shared/PartnershipSignatureConfirmation";

// Haversine formula to calculate distance between two coordinates
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

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

interface FleetCompanySearchProps {
  fleetManagerId: string;
  fleetManagerProfile?: {
    company_name: string;
    contact_name?: string;
    services_offered?: string[];
    total_drivers?: number;
  };
}

export function FleetCompanySearch({ fleetManagerId, fleetManagerProfile }: FleetCompanySearchProps) {
  const queryClient = useQueryClient();
  const [selectedCompany, setSelectedCompany] = useState<any>(null);
  const [showProposalDialog, setShowProposalDialog] = useState(false);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [showSignatureDialog, setShowSignatureDialog] = useState(false);
  
  // Advanced location filter
  const [filterValues, setFilterValues] = useState<LocationFilterValues>(getDefaultFilterValues());
  const [isSearching, setIsSearching] = useState(false);
  
  // Geocoded company coordinates for radius filtering
  const [companyCoords, setCompanyCoords] = useState<Record<string, { lat: number; lng: number } | null>>({});
  const [geocodingInProgress, setGeocodingInProgress] = useState(false);
  
  // Proposal form state
  const [proposalMessage, setProposalMessage] = useState("");
  const [paymentMethods, setPaymentMethods] = useState<string[]>(["card"]);
  const [paymentFrequency, setPaymentFrequency] = useState("monthly");
  const [paymentDay, setPaymentDay] = useState<number | null>(null);
  const [notes, setNotes] = useState("");

  // Helper function to normalize text for searching
  const normalizeText = (text: string | null | undefined): string => {
    if (!text) return '';
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .trim();
  };

  // Department code to region mapping for France
  const departmentCodeToRegion: Record<string, string> = {
    '75': 'Île-de-France', '77': 'Île-de-France', '78': 'Île-de-France', 
    '91': 'Île-de-France', '92': 'Île-de-France', '93': 'Île-de-France', 
    '94': 'Île-de-France', '95': 'Île-de-France',
    '13': "Provence-Alpes-Côte d'Azur", '06': "Provence-Alpes-Côte d'Azur", 
    '83': "Provence-Alpes-Côte d'Azur", '84': "Provence-Alpes-Côte d'Azur",
    '04': "Provence-Alpes-Côte d'Azur", '05': "Provence-Alpes-Côte d'Azur",
    '69': 'Auvergne-Rhône-Alpes', '01': 'Auvergne-Rhône-Alpes', '03': 'Auvergne-Rhône-Alpes',
    '07': 'Auvergne-Rhône-Alpes', '15': 'Auvergne-Rhône-Alpes', '26': 'Auvergne-Rhône-Alpes',
    '38': 'Auvergne-Rhône-Alpes', '42': 'Auvergne-Rhône-Alpes', '43': 'Auvergne-Rhône-Alpes',
    '63': 'Auvergne-Rhône-Alpes', '73': 'Auvergne-Rhône-Alpes', '74': 'Auvergne-Rhône-Alpes',
    '31': 'Occitanie', '09': 'Occitanie', '11': 'Occitanie', '12': 'Occitanie',
    '30': 'Occitanie', '32': 'Occitanie', '34': 'Occitanie', '46': 'Occitanie',
    '48': 'Occitanie', '65': 'Occitanie', '66': 'Occitanie', '81': 'Occitanie', '82': 'Occitanie',
    '33': 'Nouvelle-Aquitaine', '16': 'Nouvelle-Aquitaine', '17': 'Nouvelle-Aquitaine',
    '19': 'Nouvelle-Aquitaine', '23': 'Nouvelle-Aquitaine', '24': 'Nouvelle-Aquitaine',
    '40': 'Nouvelle-Aquitaine', '47': 'Nouvelle-Aquitaine', '64': 'Nouvelle-Aquitaine',
    '79': 'Nouvelle-Aquitaine', '86': 'Nouvelle-Aquitaine', '87': 'Nouvelle-Aquitaine',
    '59': 'Hauts-de-France', '02': 'Hauts-de-France', '60': 'Hauts-de-France', '62': 'Hauts-de-France', '80': 'Hauts-de-France',
    '67': 'Grand Est', '68': 'Grand Est', '08': 'Grand Est', '10': 'Grand Est', 
    '51': 'Grand Est', '52': 'Grand Est', '54': 'Grand Est', '55': 'Grand Est', '57': 'Grand Est', '88': 'Grand Est',
    '44': 'Pays de la Loire', '49': 'Pays de la Loire', '53': 'Pays de la Loire', '72': 'Pays de la Loire', '85': 'Pays de la Loire',
    '35': 'Bretagne', '22': 'Bretagne', '29': 'Bretagne', '56': 'Bretagne',
    '76': 'Normandie', '14': 'Normandie', '27': 'Normandie', '50': 'Normandie', '61': 'Normandie',
    '21': 'Bourgogne-Franche-Comté', '25': 'Bourgogne-Franche-Comté', '39': 'Bourgogne-Franche-Comté',
    '58': 'Bourgogne-Franche-Comté', '70': 'Bourgogne-Franche-Comté', '71': 'Bourgogne-Franche-Comté',
    '89': 'Bourgogne-Franche-Comté', '90': 'Bourgogne-Franche-Comté',
    '18': 'Centre-Val de Loire', '28': 'Centre-Val de Loire', '36': 'Centre-Val de Loire',
    '37': 'Centre-Val de Loire', '41': 'Centre-Val de Loire', '45': 'Centre-Val de Loire',
    '2A': 'Corse', '2B': 'Corse', '20': 'Corse',
  };

  // Fetch companies visible to fleet managers (without location filtering - done separately)
  const { data: allCompanies, isLoading, refetch } = useQuery({
    queryKey: ["public-companies-for-fleets-base"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .eq("visible_to_drivers", true)
        .eq("accepting_proposals", true)
        .in("status", ["validated", "active"])
        .order('company_name')
        .limit(100);

      if (error) throw error;
      return data || [];
    },
  });

  // Geocode company addresses when location filter is active
  useEffect(() => {
    const geocodeCompanyAddresses = async () => {
      if (!filterValues.locationCoords || !allCompanies || allCompanies.length === 0) {
        return;
      }
      
      // Get companies that need geocoding
      const companiesToGeocode = allCompanies.filter(
        (c: any) => c.address && companyCoords[c.id] === undefined
      );
      
      if (companiesToGeocode.length === 0) return;
      
      setGeocodingInProgress(true);
      
      try {
        // Fetch Mapbox token
        const { data, error } = await supabase.functions.invoke('get-mapbox-token');
        if (error || !data?.token) {
          console.error('Could not get Mapbox token for geocoding');
          return;
        }
        
        const newCoords: Record<string, { lat: number; lng: number } | null> = { ...companyCoords };
        
        // Geocode each company address
        for (const company of companiesToGeocode) {
          try {
            const response = await fetch(
              `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(company.address)}.json?access_token=${data.token}&country=fr&limit=1`
            );
            const geoData = await response.json();
            if (geoData.features?.[0]?.center) {
              newCoords[company.id] = {
                lng: geoData.features[0].center[0],
                lat: geoData.features[0].center[1]
              };
            } else {
              newCoords[company.id] = null;
            }
          } catch {
            newCoords[company.id] = null;
          }
        }
        
        setCompanyCoords(newCoords);
      } finally {
        setGeocodingInProgress(false);
      }
    };
    
    geocodeCompanyAddresses();
  }, [filterValues.locationCoords, allCompanies]);

  // Filter companies based on all filters
  const companies = (allCompanies || []).filter((c: any) => {
    // Text search filter
    if (filterValues.searchText) {
      const searchNorm = normalizeText(filterValues.searchText);
      const matches = normalizeText(c.company_name).includes(searchNorm) ||
        normalizeText(c.contact_name).includes(searchNorm) ||
        normalizeText(c.address).includes(searchNorm) ||
        normalizeText(c.contact_email).includes(searchNorm);
      if (!matches) return false;
    }

    // City filter - check if address contains the city name
    if (filterValues.city) {
      const cityParts = filterValues.city.split(',').map(p => normalizeText(p.trim()));
      const mainCity = cityParts[0];
      const addressNorm = normalizeText(c.address);
      if (!addressNorm.includes(mainCity)) return false;
    }

    // Department filter - extract department code from filter and match against postal code in address
    if (filterValues.department) {
      // Extract department code from filter (e.g., "91" from "91 - Essonne")
      const deptCodeMatch = filterValues.department.match(/^(\d{2,3})/);
      const deptCode = deptCodeMatch ? deptCodeMatch[1] : null;
      const deptNameNorm = normalizeText(filterValues.department.replace(/^\d+\s*-?\s*/, '')); // Get name part
      
      const addressNorm = normalizeText(c.address);
      const companyDeptNorm = normalizeText(c.department);
      
      let matches = false;
      
      // Check if postal code in address starts with department code
      if (deptCode && c.address) {
        const postalCodeMatch = c.address.match(/\b(\d{5})\b/);
        if (postalCodeMatch) {
          const postalCode = postalCodeMatch[1];
          // For departments 01-95, first 2 digits match; for Corsica (2A/2B) and DOM-TOM, handle separately
          if (deptCode.length === 2 && postalCode.startsWith(deptCode)) {
            matches = true;
          } else if (deptCode.length === 3 && postalCode.startsWith(deptCode)) {
            matches = true;
          }
        }
      }
      
      // Also check department name in address or company department field
      if (!matches) {
        matches = addressNorm.includes(deptNameNorm) || companyDeptNorm.includes(deptNameNorm);
      }
      
      if (!matches) return false;
    }

    // Region filter - extract postal code from address to determine region
    if (filterValues.region) {
      const regionNorm = normalizeText(filterValues.region);
      const addressNorm = normalizeText(c.address);
      
      // Direct match in address (unlikely but check)
      if (!addressNorm.includes(regionNorm)) {
        // Extract postal code and determine region from it
        let regionMatch = false;
        if (c.address) {
          const postalCodeMatch = c.address.match(/\b(\d{5})\b/);
          if (postalCodeMatch) {
            const deptCode = postalCodeMatch[1].substring(0, 2);
            const companyRegion = departmentCodeToRegion[deptCode];
            if (companyRegion && normalizeText(companyRegion).includes(regionNorm)) {
              regionMatch = true;
            }
          }
        }
        if (!regionMatch) return false;
      }
    }

    // Geographic distance filter - use actual coordinates
    if (filterValues.locationCoords) {
      const coords = companyCoords[c.id];
      if (!coords) {
        // If we don't have coords yet, exclude (will be included after geocoding)
        return false;
      }
      const distance = calculateDistance(
        filterValues.locationCoords.lat,
        filterValues.locationCoords.lng,
        coords.lat,
        coords.lng
      );
      if (distance > filterValues.radiusKm) return false;
    }

    return true;
  });

  // Check existing agreements - include proposed_by to know who initiated
  const { data: existingAgreements } = useQuery({
    queryKey: ["fleet-company-agreements", fleetManagerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_fleet_agreements")
        .select("company_id, status, proposed_by")
        .eq("fleet_manager_id", fleetManagerId);

      if (error) throw error;
      return data;
    },
  });

  // Send proposal mutation
  const sendProposal = useMutation({
    mutationFn: async (companyId: string) => {
      const { error } = await supabase
        .from("company_fleet_agreements")
        .insert({
          company_id: companyId,
          fleet_manager_id: fleetManagerId,
          proposed_by: "fleet_manager",
          status: "pending",
          fleet_manager_signed: true,
          fleet_manager_signed_at: new Date().toISOString(),
          payment_methods: paymentMethods,
          payment_frequency: paymentFrequency,
          payment_day: paymentDay,
          proposal_message: proposalMessage,
          notes: notes || null,
        });

      if (error) throw error;

      // Notify company
      const { data: companyData } = await supabase
        .from("companies")
        .select("user_id")
        .eq("id", companyId)
        .single();

      if (companyData) {
        await supabase.from("notifications").insert({
          user_id: companyData.user_id,
          title: "Nouvelle proposition de partenariat",
          message: `Le gestionnaire de flotte ${fleetManagerProfile?.company_name || ""} vous propose un partenariat`,
          type: "partnership",
          link: "/company-dashboard?tab=fleet-partners"
        });
      }
    },
    onSuccess: () => {
      toast.success("Proposition de partenariat envoyée !");
      queryClient.invalidateQueries({ queryKey: ["fleet-company-agreements"] });
      resetForm();
      setShowProposalDialog(false);
      setSelectedCompany(null);
    },
    onError: (error: any) => {
      toast.error("Erreur: " + error.message);
    },
  });

  const resetForm = () => {
    setProposalMessage("");
    setPaymentMethods(["card"]);
    setPaymentFrequency("monthly");
    setPaymentDay(null);
    setNotes("");
  };

  const handleSearch = () => {
    setIsSearching(true);
    refetch().finally(() => setIsSearching(false));
  };

  const handleResetFilters = () => {
    setFilterValues(getDefaultFilterValues());
  };

  const getAgreement = (companyId: string) => {
    return existingAgreements?.find((a) => a.company_id === companyId);
  };

  const getAgreementStatus = (companyId: string) => {
    return getAgreement(companyId)?.status;
  };

  const getProposedBy = (companyId: string) => {
    return getAgreement(companyId)?.proposed_by;
  };

  const handleOpenProposal = (company: any) => {
    setSelectedCompany(company);
    
    const defaultMessage = `Bonjour,

Je représente ${fleetManagerProfile?.company_name || "notre flotte VTC"}${fleetManagerProfile?.total_drivers ? `, composée de ${fleetManagerProfile.total_drivers} chauffeurs professionnels` : ""}.

Nous proposons nos services de transport pour répondre aux besoins de votre entreprise.

${fleetManagerProfile?.services_offered?.length ? `Nos services incluent: ${fleetManagerProfile.services_offered.join(", ")}.` : ""}

Nous serions ravis d'établir un partenariat avec ${company.company_name} pour vous offrir un service de qualité.

Cordialement`;

    setProposalMessage(defaultMessage);
    setShowProposalDialog(true);
  };

  const handleViewProfile = (company: any) => {
    setSelectedCompany(company);
    setShowProfileDialog(true);
  };

  const hasActiveFilters = filterValues.searchText || filterValues.city || filterValues.department || filterValues.region || filterValues.locationAddress || filterValues.locationCoords;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Rechercher des entreprises
          </CardTitle>
          <CardDescription>
            Trouvez des entreprises et proposez vos services de transport
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Search & Filters */}
      <Card>
        <CardContent className="pt-6">
          <AdvancedLocationFilter
            values={filterValues}
            onChange={setFilterValues}
            onSearch={handleSearch}
            onReset={handleResetFilters}
            searching={isSearching}
            showRatingFilter={false}
            searchPlaceholder="Rechercher par nom d'entreprise, contact..."
          />
        </CardContent>
      </Card>

      {/* Results */}
      {isLoading ? (
        <div className="flex justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : companies && companies.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {companies.map((company: any) => {
            const agreementStatus = getAgreementStatus(company.id);
            const proposedBy = getProposedBy(company.id);
            const hasAgreement = !!agreementStatus;
            const isPendingFromCompany = agreementStatus === "pending" && proposedBy === "company";
            const isPendingSentByUs = agreementStatus === "pending" && proposedBy === "fleet_manager";

            return (
              <Card key={company.id} className={hasAgreement && !isPendingFromCompany ? "opacity-75" : ""}>
                <CardContent className="p-4">
                  <div className="flex gap-3 mb-4">
                    <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center overflow-hidden">
                      {company.logo_url ? (
                        <img src={company.logo_url} alt={company.company_name} className="w-full h-full object-cover" />
                      ) : (
                        <Building2 className="w-7 h-7 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold truncate">{company.company_name}</h4>
                      <p className="text-sm text-muted-foreground truncate">
                        {company.contact_name}
                      </p>
                    </div>
                    {hasAgreement && (
                      <Badge 
                        className={
                          agreementStatus === "accepted" 
                            ? "bg-green-500" 
                            : agreementStatus === "rejected" 
                            ? "bg-red-500" 
                            : isPendingFromCompany
                            ? "bg-blue-500"
                            : "bg-yellow-500"
                        }
                      >
                        {agreementStatus === "accepted" 
                          ? "Partenaire" 
                          : agreementStatus === "rejected" 
                          ? "Refusé" 
                          : isPendingFromCompany
                          ? "Proposition reçue"
                          : "En attente"}
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-2 text-sm mb-4">
                    {company.address && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{company.address}</span>
                      </div>
                    )}
                    {company.contact_email && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{company.contact_email}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {company.employee_count && (
                      <Badge variant="secondary" className="text-xs">
                        <Users className="w-3 h-3 mr-1" />
                        {company.employee_count} employés
                      </Badge>
                    )}
                    {company.monthly_budget && (
                      <Badge variant="secondary" className="text-xs">
                        <Euro className="w-3 h-3 mr-1" />
                        ~{company.monthly_budget}€/mois
                      </Badge>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleViewProfile(company)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Voir profil
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={() => handleOpenProposal(company)}
                      disabled={hasAgreement}
                    >
                      {isPendingSentByUs ? (
                        "Proposition envoyée"
                      ) : isPendingFromCompany ? (
                        "Voir dans Partenariats"
                      ) : agreementStatus === "accepted" ? (
                        "Déjà partenaire"
                      ) : agreementStatus === "rejected" ? (
                        "Proposition refusée"
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
            <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">
              {hasActiveFilters ? "Aucune entreprise trouvée" : "Aucune entreprise disponible"}
            </h3>
            <p className="text-muted-foreground">
              {hasActiveFilters 
                ? "Essayez avec d'autres critères de recherche"
                : "Aucune entreprise n'a activé son profil public"}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Profile Dialog */}
      <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Profil de l'entreprise
            </DialogTitle>
          </DialogHeader>

          {selectedCompany && (
            <ScrollArea className="max-h-[70vh]">
              <div className="space-y-6 py-4 pr-4">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-24 h-24 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center overflow-hidden">
                    {selectedCompany.logo_url ? (
                      <img src={selectedCompany.logo_url} alt={selectedCompany.company_name} className="w-full h-full object-cover" />
                    ) : (
                      <Building2 className="w-12 h-12 text-white" />
                    )}
                  </div>
                  <div className="text-center">
                    <h3 className="text-xl font-semibold">{selectedCompany.company_name}</h3>
                    <p className="text-muted-foreground">{selectedCompany.contact_name}</p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {selectedCompany.address && (
                    <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                      <MapPin className="w-5 h-5 text-primary mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">Adresse</p>
                        <p className="font-medium">{selectedCompany.address}</p>
                      </div>
                    </div>
                  )}
                  {selectedCompany.contact_email && (
                    <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                      <Mail className="w-5 h-5 text-primary mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">Email</p>
                        <p className="font-medium">{selectedCompany.contact_email}</p>
                      </div>
                    </div>
                  )}
                  {selectedCompany.contact_phone && selectedCompany.show_phone && (
                    <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                      <Phone className="w-5 h-5 text-primary mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">Téléphone</p>
                        <p className="font-medium">{selectedCompany.contact_phone}</p>
                      </div>
                    </div>
                  )}
                  {selectedCompany.employee_count && (
                    <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                      <Users className="w-5 h-5 text-primary mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">Effectif</p>
                        <p className="font-medium">{selectedCompany.employee_count} employés</p>
                      </div>
                    </div>
                  )}
                </div>

                {selectedCompany.notes && (
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <h4 className="font-medium mb-2">Description</h4>
                    <p className="text-sm text-muted-foreground">{selectedCompany.notes}</p>
                  </div>
                )}
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
              Envoyez une proposition à {selectedCompany?.company_name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Message */}
            <div className="space-y-2">
              <Label>Message de présentation</Label>
              <Textarea
                value={proposalMessage}
                onChange={(e) => setProposalMessage(e.target.value)}
                placeholder="Présentez votre flotte et vos services..."
                rows={8}
              />
            </div>

            {/* Payment Methods */}
            <div className="space-y-3">
              <Label>Moyens de paiement acceptés</Label>
              <div className="grid grid-cols-2 gap-3">
                {PAYMENT_METHODS.map((method) => (
                  <label
                    key={method.value}
                    className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${
                      paymentMethods.includes(method.value)
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <Checkbox
                      checked={paymentMethods.includes(method.value)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setPaymentMethods([...paymentMethods, method.value]);
                        } else {
                          setPaymentMethods(paymentMethods.filter((m) => m !== method.value));
                        }
                      }}
                    />
                    <span className="text-lg">{method.icon}</span>
                    <span className="text-sm">{method.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Payment Frequency */}
            <div className="space-y-3">
              <Label>Fréquence de facturation</Label>
              <div className="grid gap-2">
                {PAYMENT_FREQUENCIES.map((freq) => (
                  <label
                    key={freq.value}
                    className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${
                      paymentFrequency === freq.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="frequency"
                      value={freq.value}
                      checked={paymentFrequency === freq.value}
                      onChange={(e) => setPaymentFrequency(e.target.value)}
                      className="sr-only"
                    />
                    <div className={`w-4 h-4 rounded-full border-2 ${
                      paymentFrequency === freq.value ? "border-primary bg-primary" : "border-muted-foreground"
                    }`}>
                      {paymentFrequency === freq.value && (
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-white" />
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{freq.label}</p>
                      <p className="text-xs text-muted-foreground">{freq.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Payment Day */}
            {(paymentFrequency === "weekly" || paymentFrequency === "monthly") && (
              <div className="space-y-2">
                <Label>
                  {paymentFrequency === "weekly" ? "Jour de paiement" : "Jour du mois"}
                </Label>
                <Select 
                  value={paymentDay?.toString() || ""} 
                  onValueChange={(val) => setPaymentDay(val ? parseInt(val) : null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un jour" />
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
                      <>
                        {[1, 5, 10, 15, 20, 25].map((day) => (
                          <SelectItem key={day} value={day.toString()}>
                            Le {day} du mois
                          </SelectItem>
                        ))}
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <Label>Notes additionnelles (optionnel)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Conditions particulières, remarques..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProposalDialog(false)}>
              Annuler
            </Button>
            <Button 
              onClick={() => {
                setShowProposalDialog(false);
                setShowSignatureDialog(true);
              }}
              disabled={sendProposal.isPending || !proposalMessage.trim()}
            >
              <Send className="w-4 h-4 mr-2" />
              Continuer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Signature Confirmation Dialog */}
      <PartnershipSignatureConfirmation
        open={showSignatureDialog}
        onOpenChange={setShowSignatureDialog}
        partnerName={selectedCompany?.company_name || ""}
        paymentSchedule={paymentFrequency}
        onConfirmSign={() => {
          if (selectedCompany) {
            sendProposal.mutate(selectedCompany.id);
          }
          setShowSignatureDialog(false);
        }}
        signing={sendProposal.isPending}
        partnershipType="company_fleet"
        mode="propose"
        signerRole="fleet_manager"
      />
    </div>
  );
}
