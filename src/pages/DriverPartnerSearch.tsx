import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useDriverPremium } from '@/hooks/useDriverPremium';
import { PremiumGate } from '@/components/premium/PremiumGate';
import { useDriverProfileRealtime, PUBLIC_DRIVERS_QUERY_KEY } from '@/hooks/usePublicDriverProfile';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PartnershipSignatureConfirmation } from '@/components/shared/PartnershipSignatureConfirmation';
import { 
  ArrowLeft, 
  Search, 
  UserPlus, 
  Star, 
  Car, 
  MapPin, 
  Filter,
  Loader2,
  Users,
  Building2,
  Phone,
  ArrowRight
} from 'lucide-react';
import { SharingAvailabilityToggle } from '@/components/driver/sharing/SharingAvailabilityToggle';
import { useDriverPartnershipStatus } from '@/hooks/usePartnershipRequestStatus';
import { PartnershipStatusBadge, PartnershipStatusMessage } from '@/components/driver/partnership/PartnershipStatusBadge';

interface AvailableDriver {
  id: string;
  user_id: string;
  sharing_number: number;
  formatted_sharing_number: string;
  working_sectors: string[];
  rating: number;
  total_rides: number;
  company_name: string | null;
  vehicle_brand: string | null;
  vehicle_model: string | null;
  full_name: string;
  profile_photo_url: string | null;
  phone: string | null;
  display_driver_name?: boolean;
  display_company_name?: boolean;
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

export default function DriverPartnerSearch() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { isPremium } = useDriverPremium();
  
  // Active realtime pour synchronisation instantanée
  useDriverProfileRealtime();
  
  const [driverInfo, setDriverInfo] = useState<{ id: string; is_fleet_driver: boolean } | null>(null);
  const [drivers, setDrivers] = useState<AvailableDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  
  // Filtres
  const [searchNumber, setSearchNumber] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [citySearch, setCitySearch] = useState('');
  const [minRating, setMinRating] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  
  // Proposition de partenariat
  const [selectedDriver, setSelectedDriver] = useState<AvailableDriver | null>(null);
  const [proposalDialogOpen, setProposalDialogOpen] = useState(false);
  const [proposedCommission, setProposedCommission] = useState(10);
  const [proposedPaymentSchedule, setProposedPaymentSchedule] = useState('per_course');
  const [submitting, setSubmitting] = useState(false);
  const [showSignatureConfirmation, setShowSignatureConfirmation] = useState(false);

  // IDs des chauffeurs trouvés pour vérifier les statuts
  const driverIds = useMemo(() => drivers.map(d => d.id), [drivers]);
  
  // Hook pour récupérer les statuts des demandes de partenariat
  const { getStatus, refresh: refreshStatuses } = useDriverPartnershipStatus(driverInfo?.id || null, driverIds);

  useEffect(() => {
    if (user?.id) {
      loadDriverInfo();
    }
  }, [user?.id]);

  useEffect(() => {
    if (driverInfo?.id && !driverInfo.is_fleet_driver) {
      searchDrivers();
    }
  }, [driverInfo, selectedDepartment, minRating]);

  // Gate Premium access
  if (!isPremium) {
    return (
      <div className="container max-w-2xl mx-auto p-4 pt-8">
        <PremiumGate 
          isPremium={false} 
          featureName="Recherche de partenaires" 
          featureDescription="Trouvez des chauffeurs partenaires pour échanger vos courses et développer votre réseau."
        />
      </div>
    );
  }

  const loadDriverInfo = async () => {
    try {
      const { data, error } = await supabase
        .from('drivers')
        .select('id, is_fleet_driver, fleet_manager_id')
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;

      const isFleet = data.is_fleet_driver || data.fleet_manager_id !== null;
      setDriverInfo({ id: data.id, is_fleet_driver: isFleet });

      if (isFleet) {
        toast.error('Cette page est réservée aux chauffeurs indépendants');
        navigate('/driver-dashboard');
      }
    } catch (error) {
      console.error('Error loading driver info:', error);
      setLoading(false);
    }
  };

  const searchDrivers = async () => {
    if (!driverInfo?.id) return;
    setSearching(true);

    try {
      const { data, error } = await supabase.rpc('search_available_partners', {
        _driver_id: driverInfo.id,
        _department: selectedDepartment === 'all' ? null : (selectedDepartment || null),
        _city: citySearch || null,
        _min_rating: minRating > 0 ? minRating : null,
      });

      if (error) throw error;
      setDrivers(data || []);
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
        if (found.id === driverInfo?.id) {
          toast.error('Vous ne pouvez pas vous rechercher vous-même');
          return;
        }
        // Convertir en format AvailableDriver
        setDrivers([{
          id: found.id,
          user_id: '',
          sharing_number: found.sharing_number,
          formatted_sharing_number: found.formatted_sharing_number,
          working_sectors: [],
          rating: found.rating || 0,
          total_rides: found.total_rides || 0,
          company_name: found.company_name,
          vehicle_brand: null,
          vehicle_model: null,
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
    if (!selectedDriver || !driverInfo?.id) return;

    // Vérifier le statut avant d'envoyer
    const status = getStatus(selectedDriver.id);
    if (status.status !== 'none') {
      if (status.status === 'outgoing_pending') {
        toast.error('Vous avez déjà envoyé une demande à ce chauffeur');
      } else if (status.status === 'incoming_pending') {
        toast.error('Ce chauffeur vous a déjà envoyé une demande. Consultez vos demandes reçues.');
      } else if (status.status === 'active') {
        toast.error('Vous avez déjà un partenariat actif avec ce chauffeur');
      }
      setProposalDialogOpen(false);
      return;
    }

    setSubmitting(true);
    try {
      const { data: existing } = await supabase
        .from('driver_partnerships')
        .select('id, status, proposed_by')
        .or(`and(driver_a_id.eq.${driverInfo.id},driver_b_id.eq.${selectedDriver.id}),and(driver_a_id.eq.${selectedDriver.id},driver_b_id.eq.${driverInfo.id})`)
        .in('status', ['pending', 'accepted', 'active'])
        .maybeSingle();

      if (existing) {
        if (existing.status === 'pending') {
          if (existing.proposed_by === driverInfo.id) {
            toast.error('Vous avez déjà envoyé une demande. En attente de réponse.');
          } else {
            toast.error('Ce chauffeur vous a déjà envoyé une demande.');
          }
        } else {
          toast.error('Un partenariat existe déjà avec ce chauffeur');
        }
        setProposalDialogOpen(false);
        refreshStatuses();
        return;
      }

      const { error } = await supabase.from('driver_partnerships').insert({
        driver_a_id: driverInfo.id,
        driver_b_id: selectedDriver.id,
        commission_percentage: proposedCommission,
        proposed_by: driverInfo.id,
        status: 'pending',
        payment_schedule: proposedPaymentSchedule,
      });

      if (error) throw error;

      toast.success(`Demande envoyée à ${selectedDriver.full_name} !`);
      setProposalDialogOpen(false);
      setSelectedDriver(null);
      refreshStatuses();
    } catch (error: any) {
      console.error('Error proposing partnership:', error);
      toast.error('\'Erreur lors de lenvoi');
    } finally {
      setSubmitting(false);
    }
  };

  const openProposalDialog = (driver: AvailableDriver) => {
    const status = getStatus(driver.id);
    if (status.status === 'outgoing_pending') {
      toast.info('Demande déjà envoyée. En attente de réponse.');
      return;
    }
    if (status.status === 'incoming_pending') {
      toast.info('Ce chauffeur vous a envoyé une demande. Consultez vos demandes reçues.');
      return;
    }
    if (status.status === 'active') {
      toast.info('Partenariat déjà actif.');
      return;
    }
    setSelectedDriver(driver);
    setProposalDialogOpen(true);
  };

  const renderActionButton = (driver: AvailableDriver) => {
    const status = getStatus(driver.id);
    
    if (status.status === 'outgoing_pending') {
      return <PartnershipStatusBadge status="outgoing_pending" compact />;
    }
    if (status.status === 'incoming_pending') {
      return <PartnershipStatusBadge status="incoming_pending" compact />;
    }
    if (status.status === 'active') {
      return <PartnershipStatusBadge status="active" compact />;
    }
    
    return (
      <Button className="w-full mt-4" onClick={() => openProposalDialog(driver)}>
        <UserPlus className="h-4 w-4 mr-2" />
        Proposer un partenariat
      </Button>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (driverInfo?.is_fleet_driver) {
    return null; // Redirect handled in useEffect
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/driver-dashboard')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Recherche de Partenaires</h1>
            <p className="text-sm opacity-80">Trouvez des chauffeurs pour partager vos courses</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Toggle de disponibilité */}
        <SharingAvailabilityToggle />

        {/* Recherche par numéro */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Rechercher un chauffeur
            </CardTitle>
            <CardDescription>
              Entrez le numéro de partage d'un chauffeur (ex: SOLO-123456) ou utilisez les filtres
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
              {showFilters ? 'Masquer les filtres' : 'Afficher les filtres avancés'}
            </Button>

            {showFilters && (
              <div className="space-y-4 pt-4 border-t">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Département</Label>
                    <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                      <SelectTrigger>
                        <SelectValue placeholder="Tous les départements" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous les départements</SelectItem>
                        {FRENCH_DEPARTMENTS.map((dept) => (
                          <SelectItem key={dept.code} value={dept.code}>
                            {dept.code} - {dept.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Ville / Secteur</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Paris, Lyon..."
                        value={citySearch}
                        onChange={(e) => setCitySearch(e.target.value)}
                      />
                      <Button variant="outline" onClick={searchDrivers}>
                        <Search className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Note minimum : {minRating > 0 ? `${minRating}/5` : 'Aucune'}</Label>
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

        {/* Résultats */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              Chauffeurs disponibles ({drivers.length})
            </h2>
            {searching && <Loader2 className="h-4 w-4 animate-spin" />}
          </div>

          {drivers.length === 0 && !searching ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Aucun chauffeur disponible avec ces critères</p>
                <p className="text-sm mt-2">Essayez de modifier vos filtres</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {drivers.map((driver) => (
                <Card key={driver.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-14 w-14">
                        <AvatarImage src={driver.profile_photo_url || undefined} />
                        <AvatarFallback>
                          {driver.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'CH'}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold truncate">
                            {/* Afficher selon les préférences du chauffeur */}
                            {driver.display_driver_name !== false && driver.display_company_name !== false
                              ? `${driver.full_name}${driver.company_name ? ` - ${driver.company_name}` : ''}`
                              : driver.display_driver_name !== false
                              ? driver.full_name
                              : driver.display_company_name !== false && driver.company_name
                              ? driver.company_name
                              : driver.full_name}
                          </h3>
                          <Badge variant="outline" className="font-mono text-xs">
                            {driver.formatted_sharing_number}
                          </Badge>
                        </div>
                        
                        {driver.display_company_name !== false && driver.company_name && driver.display_driver_name !== false && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {driver.company_name}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                            {driver.rating?.toFixed(1) || 'N/A'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Car className="h-3 w-3" />
                            {driver.total_rides || 0} courses
                          </span>
                        </div>

                        {driver.vehicle_brand && driver.vehicle_model && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {driver.vehicle_brand} {driver.vehicle_model}
                          </p>
                        )}

                        {driver.phone && (
                          <div className="flex items-center gap-2 mt-2 p-2 bg-blue-50 rounded-lg">
                            <Phone className="h-4 w-4 text-blue-600" />
                            <a 
                              href={`tel:${driver.phone}`} 
                              className="text-sm text-blue-600 font-medium hover:underline"
                            >
                              {driver.phone}
                            </a>
                          </div>
                        )}

                        {driver.working_sectors && driver.working_sectors.length > 0 && (
                          <div className="flex items-center gap-1 mt-2 flex-wrap">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            {driver.working_sectors.slice(0, 2).map((sector, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {sector}
                              </Badge>
                            ))}
                            {driver.working_sectors.length > 2 && (
                              <span className="text-xs text-muted-foreground">
                                +{driver.working_sectors.length - 2}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {renderActionButton(driver)}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Dialog de proposition */}
      <Dialog open={proposalDialogOpen} onOpenChange={setProposalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Proposer un partenariat</DialogTitle>
            <DialogDescription>
              Définissez les conditions de votre partenariat avec {selectedDriver?.full_name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {selectedDriver && (
              <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                <Avatar>
                  <AvatarImage src={selectedDriver.profile_photo_url || undefined} />
                  <AvatarFallback>
                    {selectedDriver.full_name?.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{selectedDriver.full_name}</p>
                  <p className="text-sm text-muted-foreground font-mono">
                    {selectedDriver.formatted_sharing_number}
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Rétribution proposée : {proposedCommission}%</Label>
              <p className="text-sm text-muted-foreground">
                Pourcentage que vous vous engagez à reverser pour chaque course transférée
              </p>
              <Slider
                value={[proposedCommission]}
                onValueChange={(v) => setProposedCommission(v[0])}
                min={5}
                max={30}
                step={1}
              />
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
    </div>
  );
}
