import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { notificationService } from '@/lib/notificationService';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PartnershipSignatureConfirmation } from '@/components/shared/PartnershipSignatureConfirmation';
import { PioneerBadge } from "@/components/ui/PioneerBadge";
import { 
  Search, 
  UserPlus, 
  Star, 
  Car, 
  Filter,
  Loader2,
  Users,
  Building2,
  Phone,
  MapPin,
  Mail,
  MessageSquare,
  Eye,
  Briefcase,
  Package,
  ExternalLink,
  X
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { getEquipmentIcon, getEquipmentLabel, getServiceLabel, getServiceIcon } from '@/lib/vehicleEquipmentDisplay';

interface AvailableDriver {
  id: string;
  user_id: string;
  sharing_number: number;
  formatted_sharing_number: string;
  working_sectors: string[];
  rating: number;
  total_rides: number;
  company_name: string | null;
  full_name: string;
  profile_photo_url: string | null;
  phone: string | null;
  email?: string | null;
  display_driver_name?: boolean;
  display_company_name?: boolean;
  show_phone?: boolean;
  show_email?: boolean;
  show_rating_partners?: boolean;
  is_pioneer?: boolean;
  vehicle_brand?: string | null;
  vehicle_model?: string | null;
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

const PAYMENT_SCHEDULES = [
  { value: 'per_course', label: 'À chaque course' },
  { value: 'weekly', label: 'Hebdomadaire' },
  { value: 'monthly', label: 'Mensuel' },
];

interface Props {
  driverId: string;
}

export function DriverPartnerSearch({ driverId }: Props) {
  const [drivers, setDrivers] = useState<AvailableDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [existingPartnerIds, setExistingPartnerIds] = useState<string[]>([]);
  
  // Filters
  const [searchNumber, setSearchNumber] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [citySearch, setCitySearch] = useState('');
  const [minRating, setMinRating] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  
  // Partnership proposal
  const [selectedDriver, setSelectedDriver] = useState<AvailableDriver | null>(null);
  const [proposalDialogOpen, setProposalDialogOpen] = useState(false);
  const [proposedCommission, setProposedCommission] = useState(10);
  const [proposedPaymentSchedule, setProposedPaymentSchedule] = useState('per_course');
  const [proposalMessage, setProposalMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // Signature confirmation before sending
  const [showSignatureConfirmation, setShowSignatureConfirmation] = useState(false);

  // Driver profile dialog
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [viewingDriver, setViewingDriver] = useState<AvailableDriver | null>(null);
  const [driverDetails, setDriverDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Charger les partenaires existants pour les exclure de la recherche
  useEffect(() => {
    if (driverId) {
      loadExistingPartners();
    }
  }, [driverId]);

  const loadExistingPartners = async () => {
    const { data } = await supabase
      .from('driver_partnerships')
      .select('driver_a_id, driver_b_id')
      .or(`driver_a_id.eq.${driverId},driver_b_id.eq.${driverId}`)
      .in('status', ['active', 'pending']);

    if (data) {
      const partnerIds = data.map(p => 
        p.driver_a_id === driverId ? p.driver_b_id : p.driver_a_id
      );
      setExistingPartnerIds(partnerIds);
    }
  };

  // Fetch driver profile for default message
  const { data: driverProfile } = useQuery({
    queryKey: ["my-driver-profile", driverId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("drivers")
        .select(`*, profile:profiles!drivers_user_id_fkey(full_name)`)
        .eq("id", driverId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!driverId,
  });

  // Generate default message when driver profile is available
  const generateDefaultMessage = () => {
    const name = driverProfile?.profile?.full_name || "Chauffeur VTC";
    const company = driverProfile?.company_name ? ` de ${driverProfile.company_name}` : "";
    return `Bonjour,

Je suis ${name}${company}, chauffeur VTC indépendant.

Je vous propose un partenariat pour échanger des courses lorsque l'un de nous n'est pas disponible. Cela nous permettra de mieux servir nos clients respectifs tout en développant nos activités.

Seriez-vous intéressé pour en discuter ?

Cordialement.`;
  };

  useEffect(() => {
    if (driverId) {
      searchDrivers();
    }
  }, [driverId, selectedDepartment, minRating, existingPartnerIds]);

  const searchDrivers = async () => {
    if (!driverId) return;
    setSearching(true);

    try {
      const { data, error } = await supabase.rpc('search_available_partners', {
        _driver_id: driverId,
        _department: selectedDepartment === 'all' ? null : selectedDepartment,
        _city: citySearch || null,
        _min_rating: minRating > 0 ? minRating : null,
      });

      if (error) throw error;
      
      // Filtrer pour exclure les partenaires existants (actifs ou en attente)
      const filteredData = (data || []).filter(
        (driver: AvailableDriver) => !existingPartnerIds.includes(driver.id)
      );
      setDrivers(filteredData);
    } catch (error) {
      console.error('Error searching drivers:', error);
      toast.error('Erreur lors de la recherche');
    } finally {
      setSearching(false);
      setLoading(false);
    }
  };

  const searchByNumber = async () => {
    if (!searchNumber.trim()) {
      searchDrivers();
      return;
    }

    setSearching(true);
    try {
      const { data, error } = await supabase.rpc('find_driver_by_sharing_number', {
        _number: searchNumber.trim(),
      });

      if (error) throw error;

      if (data && data.length > 0) {
        const found = data[0];
        if (found.id === driverId) {
          toast.error('Vous ne pouvez pas vous rechercher vous-même');
          return;
        }
        // Vérifier si c'est déjà un partenaire
        if (existingPartnerIds.includes(found.id)) {
          toast.info('Vous avez déjà un partenariat avec ce chauffeur');
          return;
        }
        setDrivers([{
          id: found.id,
          user_id: '', // Non retourné par find_driver_by_sharing_number
          sharing_number: found.sharing_number,
          formatted_sharing_number: found.formatted_sharing_number,
          working_sectors: [],
          rating: found.rating || 5,
          total_rides: found.total_rides || 0,
          company_name: found.company_name,
          full_name: found.full_name,
          profile_photo_url: found.profile_photo_url,
          phone: found.phone || null,
        }]);
      } else {
        toast.error('Aucun chauffeur trouvé avec ce numéro');
        setDrivers([]);
      }
    } catch (error) {
      console.error('Error searching by number:', error);
      toast.error('Erreur lors de la recherche');
    } finally {
      setSearching(false);
    }
  };

  const proposePartnership = async () => {
    if (!selectedDriver || !driverId) return;

    setSubmitting(true);
    try {
      const { data: existing } = await supabase
        .from('driver_partnerships')
        .select('id')
        .or(`and(driver_a_id.eq.${driverId},driver_b_id.eq.${selectedDriver.id}),and(driver_a_id.eq.${selectedDriver.id},driver_b_id.eq.${driverId})`)
        .maybeSingle();

      if (existing) {
        toast.error('Un partenariat existe déjà avec ce chauffeur');
        return;
      }

      const { error } = await supabase.from('driver_partnerships').insert({
        driver_a_id: driverId,
        driver_b_id: selectedDriver.id,
        commission_percentage: proposedCommission,
        proposed_by: driverId,
        status: 'pending',
        payment_schedule: proposedPaymentSchedule,
        proposal_message: proposalMessage || null,
      });

      if (error) throw error;

      // Envoyer la notification au chauffeur destinataire
      const senderName = driverProfile?.profile?.full_name || driverProfile?.company_name || 'Un chauffeur';
      await notificationService.notifyDriverPartnershipRequest(
        selectedDriver.user_id,
        senderName,
        proposedCommission
      );

      toast.success(`Demande de partenariat envoyée à ${selectedDriver.full_name} !`);
      setProposalDialogOpen(false);
      setSelectedDriver(null);
      setProposedCommission(10);
    } catch (error: any) {
      console.error('Error proposing partnership:', error);
      if (error.code === '23505') {
        toast.error('Un partenariat existe déjà avec ce chauffeur');
      } else {
        toast.error('\'Erreur lors de lenvoi de la demande');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Load full driver details for profile dialog
  const loadDriverDetails = async (driver: AvailableDriver) => {
    setViewingDriver(driver);
    setProfileDialogOpen(true);
    setLoadingDetails(true);

    try {
      // Fetch full driver data including vehicles, services, equipment
      const { data, error } = await supabase
        .from('drivers')
        .select(`
          *,
          profile:profiles!drivers_user_id_fkey(
            full_name,
            phone,
            email,
            profile_photo_url
          ),
          vehicles:driver_vehicles(
            id, brand, model, color, year, category, max_passengers, equipment, photos, is_favorite
          )
        `)
        .eq('id', driver.id)
        .single();

      if (error) throw error;
      setDriverDetails(data);
    } catch (error) {
      console.error('Error loading driver details:', error);
      toast.error('Erreur lors du chargement du profil');
    } finally {
      setLoadingDetails(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search by number */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex gap-2">
            <div className="flex-1 flex items-center">
              <span className="bg-muted px-3 py-2 rounded-l-md border border-r-0 text-sm font-medium text-muted-foreground">
                SOLO-
              </span>
              <Input
                placeholder="123456"
                value={searchNumber}
                onChange={(e) => setSearchNumber(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="rounded-l-none flex-1"
                maxLength={6}
              />
            </div>
            <Button onClick={searchByNumber} disabled={searching}>
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
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Département</Label>
                  <div className="flex gap-2">
                    <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Tous" />
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
                    {selectedDepartment !== 'all' && (
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => setSelectedDepartment('all')}
                        className="shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Ville / Secteur</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Paris, Lyon..."
                      value={citySearch}
                      onChange={(e) => setCitySearch(e.target.value)}
                    />
                    {citySearch && (
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => {
                          setCitySearch('');
                          searchDrivers();
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                    <Button variant="outline" size="icon" onClick={searchDrivers}>
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Note minimum : {minRating > 0 ? `${minRating}/5` : 'Aucune'}</Label>
                  {minRating > 0 && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setMinRating(0)}
                      className="h-6 px-2 text-xs"
                    >
                      <X className="h-3 w-3 mr-1" />
                      Effacer
                    </Button>
                  )}
                </div>
                <Slider
                  value={[minRating]}
                  onValueChange={(v) => setMinRating(v[0])}
                  max={5}
                  step={0.5}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {drivers.length} chauffeur{drivers.length !== 1 ? 's' : ''} disponible{drivers.length !== 1 ? 's' : ''}
          </span>
          {searching && <Loader2 className="h-4 w-4 animate-spin" />}
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : drivers.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Aucun chauffeur disponible</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {drivers.map((driver) => (
              <Card key={driver.id} className="overflow-hidden">
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={driver.profile_photo_url || undefined} />
                      <AvatarFallback>
                        {driver.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'CH'}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm truncate">
                          {/* Afficher selon les préférences */}
                          {driver.display_driver_name !== false && driver.display_company_name !== false
                            ? `${driver.full_name}${driver.company_name ? ` - ${driver.company_name}` : ''}`
                            : driver.display_driver_name !== false
                            ? driver.full_name
                            : driver.display_company_name !== false && driver.company_name
                            ? driver.company_name
                            : driver.full_name}
                        </span>
                        {(driver as any).is_pioneer && (
                          <PioneerBadge size="xs" />
                        )}
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {driver.formatted_sharing_number}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        {driver.show_rating_partners && (
                          <span className="flex items-center gap-1">
                            <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                            {driver.rating?.toFixed(1) || 'N/A'}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Car className="h-3 w-3" />
                          {driver.total_rides || 0}
                        </span>
                      </div>

                      {/* Secteurs de travail */}
                      {driver.working_sectors && driver.working_sectors.length > 0 && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">
                            {driver.working_sectors.slice(0, 2).join(', ')}
                            {driver.working_sectors.length > 2 && ` +${driver.working_sectors.length - 2}`}
                          </span>
                        </div>
                      )}

                      {/* Contact info */}
                      <div className="flex flex-wrap gap-2 mt-1">
                        {driver.show_phone !== false && driver.phone && (
                          <a 
                            href={`tel:${driver.phone}`} 
                            className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
                          >
                            <Phone className="h-3 w-3" />
                            {driver.phone}
                          </a>
                        )}
                        {driver.show_email !== false && driver.email && (
                          <a 
                            href={`mailto:${driver.email}`} 
                            className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
                          >
                            <Mail className="h-3 w-3" />
                            {driver.email}
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <Button 
                        size="sm"
                        variant="outline"
                        onClick={() => loadDriverDetails(driver)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm"
                        onClick={() => {
                          setSelectedDriver(driver);
                          setProposalDialogOpen(true);
                        }}
                      >
                        <UserPlus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Partnership proposal dialog */}
      <Dialog open={proposalDialogOpen} onOpenChange={setProposalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Proposer un partenariat</DialogTitle>
            <DialogDescription>
              Définissez les termes du partenariat avec {selectedDriver?.full_name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Message personnalisable */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Message d'introduction
              </Label>
              <Textarea
                placeholder="Présentez-vous et expliquez pourquoi vous souhaitez ce partenariat..."
                value={proposalMessage || generateDefaultMessage()}
                onChange={(e) => setProposalMessage(e.target.value)}
                rows={6}
                className="text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Ce message sera envoyé avec votre demande de partenariat
              </p>
            </div>

            <div className="space-y-2">
              <Label>Commission : {proposedCommission}%</Label>
              <Slider
                value={[proposedCommission]}
                onValueChange={(v) => setProposedCommission(v[0])}
                min={5}
                max={30}
                step={1}
              />
              <p className="text-xs text-muted-foreground">
                Ce pourcentage sera prélevé sur le prix de chaque course partagée
              </p>
            </div>

            <div className="space-y-2">
              <Label>Fréquence de paiement</Label>
              <Select value={proposedPaymentSchedule} onValueChange={setProposedPaymentSchedule}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_SCHEDULES.map((schedule) => (
                    <SelectItem key={schedule.value} value={schedule.value}>
                      {schedule.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setProposalDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={() => {
              setProposalDialogOpen(false);
              setShowSignatureConfirmation(true);
            }} disabled={submitting}>
              Voir les conditions et signer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Partnership Signature Confirmation Dialog */}
      <PartnershipSignatureConfirmation
        open={showSignatureConfirmation}
        onOpenChange={setShowSignatureConfirmation}
        partnerName={selectedDriver?.full_name || ''}
        commissionPercentage={proposedCommission}
        paymentSchedule={proposedPaymentSchedule}
        onConfirmSign={proposePartnership}
        signing={submitting}
        partnershipType="driver"
        mode="propose"
        signerRole="driver"
      />
      <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Profil du chauffeur
            </DialogTitle>
            <DialogDescription>
              Informations complètes sur {viewingDriver?.full_name}
            </DialogDescription>
          </DialogHeader>

          {loadingDetails ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : viewingDriver && driverDetails ? (
            <div className="space-y-6 py-4">
              {/* En-tête chauffeur avec photo */}
              <div className="p-4 bg-gradient-to-br from-primary/10 to-accent/10 rounded-lg border">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={driverDetails.profile?.profile_photo_url || viewingDriver.profile_photo_url || undefined} />
                    <AvatarFallback className="text-lg">
                      {viewingDriver.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 'CH'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-xl font-bold text-foreground">
                        {viewingDriver.display_driver_name !== false ? viewingDriver.full_name : ''}
                        {viewingDriver.display_driver_name !== false && viewingDriver.company_name ? ' - ' : ''}
                        {viewingDriver.display_company_name !== false ? viewingDriver.company_name : ''}
                      </h3>
                      <Badge variant="outline" className="font-mono text-xs">
                        {viewingDriver.formatted_sharing_number}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                      {viewingDriver.show_rating_partners && (
                        <span className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                          <span className="font-medium">{viewingDriver.rating?.toFixed(1) || 'N/A'}</span>
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Car className="h-4 w-4" />
                        {viewingDriver.total_rides || 0} courses
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Coordonnées */}
              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Contact
                </h4>
                <div className="grid gap-2 text-sm">
                  {viewingDriver.show_phone !== false && viewingDriver.phone && (
                    <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <a href={`tel:${viewingDriver.phone}`} className="text-primary hover:underline font-medium">
                        {viewingDriver.phone}
                      </a>
                    </div>
                  )}
                  {viewingDriver.show_email !== false && viewingDriver.email && (
                    <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <a href={`mailto:${viewingDriver.email}`} className="text-primary hover:underline">
                        {viewingDriver.email}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Secteurs d'activité */}
              {viewingDriver.working_sectors && viewingDriver.working_sectors.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Zones d'activité
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {viewingDriver.working_sectors.map((sector: string, index: number) => (
                      <Badge key={index} variant="secondary">
                        {sector}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Description du service */}
              {driverDetails.service_description && (
                <div className="space-y-3">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Briefcase className="w-4 h-4" />
                    À propos
                  </h4>
                  <div className="p-4 bg-muted rounded-lg text-sm">
                    {driverDetails.service_description}
                  </div>
                </div>
              )}

              {/* Véhicules */}
              {driverDetails.vehicles && driverDetails.vehicles.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Car className="w-4 h-4" />
                    Véhicule{driverDetails.vehicles.length > 1 ? 's' : ''}
                  </h4>
                  <div className="space-y-2">
                    {driverDetails.vehicles.filter((v: any) => v.is_favorite !== false).slice(0, 2).map((vehicle: any) => (
                      <div key={vehicle.id} className="p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium">
                            {vehicle.brand} {vehicle.model}
                          </span>
                          {vehicle.year && (
                            <Badge variant="outline" className="text-xs">
                              {vehicle.year}
                            </Badge>
                          )}
                          {vehicle.category && (
                            <Badge variant="secondary" className="text-xs">
                              {vehicle.category}
                            </Badge>
                          )}
                        </div>
                        {vehicle.max_passengers && (
                          <p className="text-xs text-muted-foreground mb-2">
                            Jusqu'à {vehicle.max_passengers} passagers
                          </p>
                        )}
                        {vehicle.equipment && vehicle.equipment.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {vehicle.equipment.slice(0, 5).map((eq: string) => (
                              <Badge key={eq} variant="outline" className="text-xs">
                                <span className="mr-1">{getEquipmentIcon(eq)}</span>
                                {getEquipmentLabel(eq)}
                              </Badge>
                            ))}
                            {vehicle.equipment.length > 5 && (
                              <Badge variant="outline" className="text-xs">
                                +{vehicle.equipment.length - 5}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Services proposés */}
              {driverDetails.services_offered && driverDetails.services_offered.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Services proposés
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {driverDetails.services_offered.map((service: string) => (
                      <Badge key={service} variant="secondary">
                        <span className="mr-1">{getServiceIcon(service)}</span>
                        {getServiceLabel(service)}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setProfileDialogOpen(false)} className="flex-1">
                  Fermer
                </Button>
                {viewingDriver.show_phone !== false && viewingDriver.phone && (
                  <Button variant="secondary" asChild className="flex-1">
                    <a href={`tel:${viewingDriver.phone}`}>
                      <Phone className="w-4 h-4 mr-2" />
                      Appeler
                    </a>
                  </Button>
                )}
                <Button 
                  className="flex-1"
                  onClick={() => {
                    setProfileDialogOpen(false);
                    setSelectedDriver(viewingDriver);
                    setProposalDialogOpen(true);
                  }}
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Proposer un partenariat
                </Button>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              Impossible de charger les informations du chauffeur
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
