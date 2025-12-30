import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  Star, 
  Car, 
  MapPin, 
  Filter,
  Loader2,
  Users,
  Building2,
  Phone,
  Mail,
  Eye,
  Briefcase,
  CheckCircle,
  Euro,
  ImageIcon,
  Send,
  Handshake,
  Percent
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { VEHICLE_EQUIPMENT, DRIVER_SERVICES } from "@/lib/vehicleEquipment";
import { getEquipmentLabel, getEquipmentIcon, getServiceLabel, getServiceIcon } from "@/lib/vehicleEquipmentDisplay";

interface SearchableDriver {
  id: string;
  user_id: string;
  company_name: string | null;
  vehicle_brand: string | null;
  vehicle_model: string | null;
  vehicle_year: number | null;
  vehicle_color: string | null;
  vehicle_equipment: string[] | null;
  vehicle_category: string[] | null;
  services_offered: string[] | null;
  working_sectors: string[] | null;
  bio: string | null;
  service_description: string | null;
  rating: number | null;
  total_rides: number | null;
  base_fare: number | null;
  per_km_rate: number | null;
  hourly_rate: number | null;
  home_address: string | null;
  vehicle_photos: string[] | null;
  gallery_photos: string[] | null;
  show_phone: boolean | null;
  show_email: boolean | null;
  sharing_number?: number | null;
  profile?: {
    full_name: string;
    profile_photo_url: string | null;
    phone: string | null;
    email: string | null;
  };
}

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
];

interface FleetDriverSearchProps {
  fleetManagerId: string;
}

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

export function FleetDriverSearch({ fleetManagerId }: FleetDriverSearchProps) {
  const [drivers, setDrivers] = useState<SearchableDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  
  // Filtres
  const [searchText, setSearchText] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [selectedRegion, setSelectedRegion] = useState<string>('');
  const [citySearch, setCitySearch] = useState('');
  const [minRating, setMinRating] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedVehicleType, setSelectedVehicleType] = useState<string>('');
  
  // Profil détaillé
  const [selectedDriver, setSelectedDriver] = useState<SearchableDriver | null>(null);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  
  // Demande de partenariat
  const [partnershipDialogOpen, setPartnershipDialogOpen] = useState(false);
  const [partnershipDriver, setPartnershipDriver] = useState<SearchableDriver | null>(null);
  const [partnershipCommission, setPartnershipCommission] = useState(10);
  const [partnershipPaymentSchedule, setPartnershipPaymentSchedule] = useState('per_course');
  const [partnershipMessage, setPartnershipMessage] = useState('');
  const [sendingPartnership, setSendingPartnership] = useState(false);
  const [existingPartnerships, setExistingPartnerships] = useState<string[]>([]);

  // Initial load only - filters are applied independently with the search button
  useEffect(() => {
    searchDrivers();
    fetchExistingPartnerships();
  }, []);

  const fetchExistingPartnerships = async () => {
    try {
      const { data } = await supabase
        .from('fleet_driver_partnerships')
        .select('driver_id')
        .eq('fleet_manager_id', fleetManagerId)
        .in('status', ['pending', 'active']);
      
      if (data) {
        setExistingPartnerships(data.map(p => p.driver_id));
      }
    } catch (error) {
      console.error('Error fetching partnerships:', error);
    }
  };

  const getDefaultPartnershipMessage = (driverName: string) => {
    return `Bonjour ${driverName},

J'ai découvert votre profil et je suis impressionné par votre expérience et la qualité de vos services. Je gère une flotte de VTC et je recherche des chauffeurs professionnels comme vous pour collaborer sur des courses.

Ce partenariat vous permettrait d'accéder à des clients supplémentaires sans effort de prospection, tout en conservant votre indépendance.

N'hésitez pas à me contacter si vous souhaitez en discuter.

Cordialement`;
  };

  const openPartnershipDialog = (driver: SearchableDriver) => {
    setPartnershipDriver(driver);
    setPartnershipCommission(10);
    setPartnershipPaymentSchedule('per_course');
    setPartnershipMessage(getDefaultPartnershipMessage(driver.profile?.full_name || 'Cher chauffeur'));
    setPartnershipDialogOpen(true);
  };

  const sendPartnershipRequest = async () => {
    if (!partnershipDriver) return;
    
    setSendingPartnership(true);
    try {
      const { error } = await supabase
        .from('fleet_driver_partnerships')
        .insert({
          fleet_manager_id: fleetManagerId,
          driver_id: partnershipDriver.id,
          initiated_by: 'fleet_manager',
          commission_percentage: partnershipCommission,
          payment_schedule: partnershipPaymentSchedule,
          proposal_message: partnershipMessage || null,
          status: 'pending',
          fleet_manager_signed: true,
          fleet_manager_signed_at: new Date().toISOString()
        });

      if (error) throw error;

      // Notify driver
      await supabase.from('notifications').insert({
        user_id: partnershipDriver.user_id,
        title: 'Nouvelle demande de partenariat',
        message: `Un gestionnaire de flotte souhaite établir un partenariat avec vous (${partnershipCommission}% de commission)`,
        type: 'info',
        link: '/driver-dashboard?tab=partnerships'
      });

      toast.success('Demande de partenariat envoyée avec succès');
      setPartnershipDialogOpen(false);
      setExistingPartnerships([...existingPartnerships, partnershipDriver.id]);
    } catch (error) {
      console.error('Error sending partnership request:', error);
      toast.error('Erreur lors de l\'envoi de la demande');
    } finally {
      setSendingPartnership(false);
    }
  };

  const searchDrivers = async () => {
    setSearching(true);
    try {
      // Query drivers directly (same logic as FleetDriverPartnerships)
      let query = supabase
        .from('drivers')
        .select('id, user_id, company_name, vehicle_brand, vehicle_model, vehicle_year, vehicle_color, vehicle_equipment, vehicle_category, services_offered, working_sectors, bio, service_description, rating, total_rides, base_fare, per_km_rate, hourly_rate, home_address, vehicle_photos, gallery_photos, show_phone, show_email, visible_to_drivers, display_driver_name, display_company_name, show_rating_public, show_rating_partners, show_pricing_partners, card_photo_url, minimum_price')
        .eq('status', 'validated')
        .or('visible_to_drivers.eq.true,public_profile_enabled.eq.true')
        .is('fleet_manager_id', null);

      // Apply filters independently
      if (minRating > 0) {
        query = query.gte('rating', minRating);
      }

      // Department filter - search in working_sectors array
      if (selectedDepartment) {
        query = query.contains('working_sectors', [selectedDepartment]);
      }

      // Region filter - search in working_sectors array
      if (selectedRegion) {
        query = query.contains('working_sectors', [selectedRegion]);
      }

      // City/sector filter
      if (citySearch.trim()) {
        query = query.contains('working_sectors', [citySearch.trim()]);
      }

      // Vehicle category filter
      if (selectedVehicleType) {
        query = query.contains('vehicle_category', [selectedVehicleType]);
      }

      const { data: driversData, error } = await query.order('rating', { ascending: false, nullsFirst: false });

      if (error) throw error;

      if (driversData && driversData.length > 0) {
        // Fetch profiles
        const userIds = driversData.map(d => d.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, profile_photo_url, phone, email')
          .in('id', userIds);

        // Apply text search filter on combined data
        let driversWithProfiles = driversData.map(d => ({
          ...d,
          profile: profiles?.find(p => p.id === d.user_id)
        }));

        // Text search filter (client-side after joining with profiles)
        if (searchText.trim()) {
          const searchLower = searchText.toLowerCase();
          driversWithProfiles = driversWithProfiles.filter(d => 
            d.profile?.full_name?.toLowerCase().includes(searchLower) ||
            d.company_name?.toLowerCase().includes(searchLower) ||
            d.vehicle_brand?.toLowerCase().includes(searchLower) ||
            d.vehicle_model?.toLowerCase().includes(searchLower)
          );
        }

        setDrivers(driversWithProfiles as SearchableDriver[]);
      } else {
        setDrivers([]);
      }
    } catch (error) {
      console.error('Error searching drivers:', error);
      toast.error('Erreur lors de la recherche');
    } finally {
      setSearching(false);
      setLoading(false);
    }
  };

  const resetFilters = () => {
    setSearchText('');
    setSelectedDepartment('');
    setSelectedRegion('');
    setCitySearch('');
    setMinRating(0);
    setSelectedVehicleType('');
    searchDrivers();
  };

  const getCategoryLabel = (category: string | null) => {
    if (!category) return null;
    const found = VEHICLE_CATEGORIES.find(c => c.value === category);
    return found ? found.label : category;
  };

  const getCategoryLabels = (categories: string[] | null) => {
    if (!categories || categories.length === 0) return null;
    return categories.map(cat => getCategoryLabel(cat)).filter(Boolean).join(', ');
  };

  const openDriverProfile = (driver: SearchableDriver) => {
    setSelectedDriver(driver);
    setProfileDialogOpen(true);
  };

  const handleSearch = () => {
    searchDrivers();
  };

  const formatPrice = (value: number | null) => {
    if (value === null || value === undefined) return 'N/A';
    return `${value.toFixed(2)}€`;
  };

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'CH';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            Recherche de Chauffeurs
          </CardTitle>
          <CardDescription>
            Trouvez des chauffeurs indépendants disponibles pour collaborer avec votre flotte
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Barre de recherche principale */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Rechercher par nom, entreprise, véhicule..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="flex-1"
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button onClick={handleSearch} disabled={searching}>
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>

          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            {showFilters ? 'Masquer les filtres' : 'Filtres avancés'}
          </Button>

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
                  Note minimum : {minRating > 0 ? `${minRating}/5` : 'Aucune'}
                </Label>
                <Slider
                  value={[minRating]}
                  onValueChange={(v) => setMinRating(v[0])}
                  max={5}
                  step={0.5}
                />
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                <Button onClick={handleSearch} className="flex-1">
                  <Search className="h-4 w-4 mr-2" />
                  Rechercher
                </Button>
                <Button variant="outline" onClick={resetFilters}>
                  Réinitialiser
                </Button>
              </div>

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
                      ≥ {minRating}/5 ⭐
                    </Badge>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Résultats */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Chauffeurs disponibles ({drivers.length})
          </h2>
          {searching && <Loader2 className="h-4 w-4 animate-spin" />}
        </div>

        {drivers.length === 0 && !searching ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="font-medium text-lg mb-2">Aucun chauffeur disponible</p>
              <p className="text-muted-foreground text-sm max-w-md mx-auto">
                Les chauffeurs indépendants doivent activer l'option "Visible par les gestionnaires de flotte" 
                dans leur profil pour apparaître dans cette recherche.
              </p>
              <p className="text-muted-foreground text-sm mt-4">
                Vous pouvez également utiliser l'onglet "Invitations" pour inviter des chauffeurs spécifiques.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {drivers.map((driver) => (
              <Card key={driver.id} className="hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-16 w-16 border-2 border-primary/20">
                      <AvatarImage src={(driver as any).card_photo_url || driver.profile?.profile_photo_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {getInitials(driver.profile?.full_name || 'CH')}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold truncate">
                          {(driver as any).display_driver_name && driver.profile?.full_name 
                            ? driver.profile.full_name 
                            : 'Chauffeur VTC'}
                        </h3>
                        {((driver as any).show_rating_public !== false || (driver as any).show_rating_partners !== false) && driver.rating && driver.rating >= 4.5 && (
                          <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
                            <Star className="h-3 w-3 fill-current mr-1" />
                            {driver.rating.toFixed(1)}
                          </Badge>
                        )}
                      </div>
                      
                      {(driver as any).display_company_name && driver.company_name && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                          <Building2 className="h-3 w-3" />
                          {driver.company_name}
                        </p>
                      )}

                      {driver.vehicle_brand && driver.vehicle_model && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                          <Car className="h-3 w-3" />
                          {driver.vehicle_brand} {driver.vehicle_model}
                          {driver.vehicle_year && ` (${driver.vehicle_year})`}
                        </p>
                      )}
                      
                      {driver.vehicle_category && driver.vehicle_category.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {driver.vehicle_category.slice(0, 2).map((cat, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {getCategoryLabel(cat)}
                            </Badge>
                          ))}
                          {driver.vehicle_category.length > 2 && (
                            <span className="text-xs text-muted-foreground">
                              +{driver.vehicle_category.length - 2}
                            </span>
                          )}
                        </div>
                      )}
                      
                      <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                        {((driver as any).show_rating_public !== false || (driver as any).show_rating_partners !== false) && driver.rating && (
                          <span className="flex items-center gap-1">
                            <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                            {driver.rating.toFixed(1)}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3 text-success" />
                          {driver.total_rides || 0} courses
                        </span>
                      </div>

                      {driver.working_sectors && driver.working_sectors.length > 0 && (
                        <div className="flex items-center gap-1 mt-2 flex-wrap">
                          <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                          {driver.working_sectors.slice(0, 3).map((sector, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
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
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 mt-4">
                    <Button 
                      variant="outline"
                      onClick={() => openDriverProfile(driver)}
                      className="w-full"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Voir le profil complet
                    </Button>
                    
                    {existingPartnerships.includes(driver.id) ? (
                      <Badge variant="secondary" className="w-full justify-center py-2">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Partenariat en cours
                      </Badge>
                    ) : (
                      <Button 
                        onClick={() => openPartnershipDialog(driver)}
                        className="w-full"
                      >
                        <Handshake className="h-4 w-4 mr-2" />
                        Proposer un partenariat
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Dialog profil détaillé */}
      <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <ScrollArea className="max-h-[80vh] pr-4">
            {selectedDriver && (
              <div className="space-y-6">
                <DialogHeader>
                  <div className="flex items-start gap-4">
                    <Avatar className="h-20 w-20 border-2 border-primary">
                      <AvatarImage src={(selectedDriver as any).card_photo_url || selectedDriver.profile?.profile_photo_url || undefined} />
                      <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                        {getInitials(selectedDriver.profile?.full_name || 'CH')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <DialogTitle className="text-2xl">
                        {(selectedDriver as any).display_driver_name && selectedDriver.profile?.full_name 
                          ? selectedDriver.profile.full_name 
                          : 'Chauffeur VTC'}
                      </DialogTitle>
                      {(selectedDriver as any).display_company_name && selectedDriver.company_name && (
                        <p className="text-muted-foreground flex items-center gap-2 mt-1">
                          <Building2 className="h-4 w-4" />
                          {selectedDriver.company_name}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-2">
                        {((selectedDriver as any).show_rating_public !== false || (selectedDriver as any).show_rating_partners !== false) && selectedDriver.rating && (
                          <Badge className="bg-yellow-500/10 text-yellow-600">
                            <Star className="h-4 w-4 fill-current mr-1" />
                            {selectedDriver.rating.toFixed(1)}/5
                          </Badge>
                        )}
                        <Badge variant="outline">
                          <CheckCircle className="h-4 w-4 mr-1 text-success" />
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

                    {selectedDriver.home_address && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            Localisation
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground">{selectedDriver.home_address}</p>
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>

                  <TabsContent value="vehicle" className="space-y-4 mt-4">
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
                              <Badge key={i} variant="secondary" className="flex items-center gap-1.5 px-2 py-1">
                                <span>{getEquipmentIcon(equip)}</span>
                                <span>{getEquipmentLabel(equip)}</span>
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
                          <div className="grid grid-cols-3 gap-2">
                            {selectedDriver.vehicle_photos.slice(0, 6).map((photo, i) => (
                              <img 
                                key={i} 
                                src={photo} 
                                alt={`Véhicule ${i + 1}`}
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
                              <Badge key={i} variant="secondary" className="flex items-center gap-1.5 px-3 py-1.5 text-sm">
                                <span className="text-base">{getServiceIcon(service)}</span>
                                <span>{getServiceLabel(service)}</span>
                              </Badge>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

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
                            <p className="font-bold text-lg">{formatPrice(selectedDriver.base_fare)}</p>
                          </div>
                          <div className="p-3 bg-muted/50 rounded-lg">
                            <p className="text-xs text-muted-foreground">Par km</p>
                            <p className="font-bold text-lg">{formatPrice(selectedDriver.per_km_rate)}</p>
                          </div>
                          <div className="p-3 bg-muted/50 rounded-lg">
                            <p className="text-xs text-muted-foreground">Par heure</p>
                            <p className="font-bold text-lg">{formatPrice(selectedDriver.hourly_rate)}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="contact" className="space-y-4 mt-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Coordonnées</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {selectedDriver.show_phone && selectedDriver.profile?.phone && (
                          <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-lg">
                            <Phone className="h-5 w-5 text-primary" />
                            <div>
                              <p className="text-xs text-muted-foreground">Téléphone</p>
                              <a href={`tel:${selectedDriver.profile.phone}`} className="font-medium hover:text-primary">
                                {selectedDriver.profile.phone}
                              </a>
                            </div>
                          </div>
                        )}
                        {selectedDriver.show_email && selectedDriver.profile?.email && (
                          <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-lg">
                            <Mail className="h-5 w-5 text-primary" />
                            <div>
                              <p className="text-xs text-muted-foreground">Email</p>
                              <a href={`mailto:${selectedDriver.profile.email}`} className="font-medium hover:text-primary">
                                {selectedDriver.profile.email}
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

                    <div className="flex gap-2">
                      <Button className="flex-1" size="lg" variant="outline">
                        <Send className="h-4 w-4 mr-2" />
                        Contacter
                      </Button>
                      {existingPartnerships.includes(selectedDriver.id) ? (
                        <Button className="flex-1" size="lg" disabled variant="secondary">
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Partenariat existant
                        </Button>
                      ) : (
                        <Button 
                          className="flex-1" 
                          size="lg"
                          onClick={() => {
                            setProfileDialogOpen(false);
                            openPartnershipDialog(selectedDriver);
                          }}
                        >
                          <Handshake className="h-4 w-4 mr-2" />
                          Demander un partenariat
                        </Button>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Dialog de demande de partenariat */}
      <Dialog open={partnershipDialogOpen} onOpenChange={setPartnershipDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Handshake className="h-5 w-5 text-primary" />
              Demande de Partenariat
            </DialogTitle>
            <DialogDescription>
              Proposer un partenariat à {partnershipDriver?.profile?.full_name || 'ce chauffeur'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Info chauffeur */}
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Avatar>
                <AvatarImage src={partnershipDriver?.profile?.profile_photo_url || undefined} />
                <AvatarFallback>
                  {getInitials(partnershipDriver?.profile?.full_name || 'CH')}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{partnershipDriver?.profile?.full_name}</p>
                <p className="text-sm text-muted-foreground">
                  {partnershipDriver?.vehicle_brand} {partnershipDriver?.vehicle_model}
                </p>
              </div>
            </div>

            {/* Commission */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Percent className="h-4 w-4" />
                Commission sur les courses ({partnershipCommission}%)
              </Label>
              <Slider
                value={[partnershipCommission]}
                onValueChange={(v) => setPartnershipCommission(v[0])}
                min={0}
                max={30}
                step={1}
              />
              <p className="text-xs text-muted-foreground">
                Pourcentage que le chauffeur vous reverse sur chaque course effectuée pour la flotte
              </p>
            </div>

            {/* Calendrier de paiement */}
            <div className="space-y-2">
              <Label>Fréquence de versement</Label>
              <Select value={partnershipPaymentSchedule} onValueChange={setPartnershipPaymentSchedule}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="per_course">Par course</SelectItem>
                  <SelectItem value="weekly">Hebdomadaire</SelectItem>
                  <SelectItem value="biweekly">Bi-mensuel</SelectItem>
                  <SelectItem value="monthly">Mensuel</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Message */}
            <div className="space-y-2">
              <Label>Message personnalisé</Label>
              <Textarea
                placeholder="Présentez-vous et expliquez les avantages de ce partenariat..."
                value={partnershipMessage}
                onChange={(e) => setPartnershipMessage(e.target.value)}
                rows={6}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Ce message sera envoyé au chauffeur avec votre demande de partenariat
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPartnershipDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={sendPartnershipRequest} disabled={sendingPartnership}>
              {sendingPartnership ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Envoyer la demande
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
