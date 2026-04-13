import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
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
import { PioneerBadge } from "@/components/ui/PioneerBadge";
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
  show_rating_partners?: boolean;
  is_pioneer?: boolean;
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

export function PartnerSearchInline({ driverId }: Props) {
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

  // IDs des chauffeurs trouvés pour vérifier les statuts
  const driverIds = useMemo(() => drivers.map(d => d.id), [drivers]);
  
  // Hook pour récupérer les statuts des demandes de partenariat
  const { getStatus, refresh: refreshStatuses } = useDriverPartnershipStatus(driverId, driverIds);

  useEffect(() => {
    if (driverId) {
      searchDrivers();
    }
  }, [driverId, selectedDepartment, minRating]);

  const searchDrivers = async () => {
    if (!driverId) return;
    setSearching(true);

    try {
      const { data, error } = await supabase.rpc('search_available_partners', {
        _driver_id: driverId,
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
        if (found.id === driverId) {
          toast.error('Vous ne pouvez pas vous rechercher vous-même');
          return;
        }
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
    if (!selectedDriver || !driverId) return;

    // Vérifier le statut de la demande avant d'envoyer
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
        .or(`and(driver_a_id.eq.${driverId},driver_b_id.eq.${selectedDriver.id}),and(driver_a_id.eq.${selectedDriver.id},driver_b_id.eq.${driverId})`)
        .in('status', ['pending', 'accepted', 'active'])
        .maybeSingle();

      if (existing) {
        if (existing.status === 'pending') {
          if (existing.proposed_by === driverId) {
            toast.error('Vous avez déjà envoyé une demande à ce chauffeur. En attente de réponse.');
          } else {
            toast.error('Ce chauffeur vous a déjà envoyé une demande. Consultez vos demandes reçues.');
          }
        } else {
          toast.error('Un partenariat existe déjà avec ce chauffeur');
        }
        setProposalDialogOpen(false);
        refreshStatuses();
        return;
      }

      const { error } = await supabase.from('driver_partnerships').insert({
        driver_a_id: driverId,
        driver_b_id: selectedDriver.id,
        commission_percentage: proposedCommission,
        proposed_by: driverId,
        status: 'pending',
        payment_schedule: proposedPaymentSchedule,
      });

      if (error) throw error;

      toast.success(`Demande de partenariat envoyée à ${selectedDriver.full_name} !`);
      setProposalDialogOpen(false);
      setSelectedDriver(null);
      setProposedCommission(10);
      refreshStatuses();
    } catch (error: any) {
      console.error('Error proposing partnership:', error);
      if (error.code === '23505') {
        toast.error('Un partenariat existe déjà avec ce chauffeur');
      } else {
        toast.error('Erreur lors de l\'envoi de la demande');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const openProposalDialog = (driver: AvailableDriver) => {
    // Vérifier le statut avant d'ouvrir le dialogue
    const status = getStatus(driver.id);
    if (status.status === 'outgoing_pending') {
      toast.info('Vous avez déjà envoyé une demande à ce chauffeur. En attente de réponse.');
      return;
    }
    if (status.status === 'incoming_pending') {
      toast.info('Ce chauffeur vous a déjà envoyé une demande. Consultez vos demandes reçues.');
      return;
    }
    if (status.status === 'active') {
      toast.info('Vous avez déjà un partenariat actif avec ce chauffeur.');
      return;
    }
    setSelectedDriver(driver);
    setProposalDialogOpen(true);
  };

  // Helper pour le rendu du bouton d'action selon le statut
  const renderActionButton = (driver: AvailableDriver) => {
    const status = getStatus(driver.id);
    
    if (status.status === 'outgoing_pending') {
      return (
        <PartnershipStatusBadge status="outgoing_pending" compact />
      );
    }
    
    if (status.status === 'incoming_pending') {
      return (
        <Button 
          size="sm"
          variant="outline"
          className="border-orange-300 text-orange-700 hover:bg-orange-50"
          onClick={() => toast.info('Consultez vos demandes reçues pour répondre')}
        >
          <ArrowRight className="h-4 w-4" />
        </Button>
      );
    }
    
    if (status.status === 'active') {
      return (
        <PartnershipStatusBadge status="active" compact />
      );
    }
    
    return (
      <Button 
        size="sm"
        onClick={() => openProposalDialog(driver)}
      >
        <UserPlus className="h-4 w-4" />
      </Button>
    );
  };

  return (
    <div className="space-y-4">
      {/* Toggle de disponibilité */}
      <SharingAvailabilityToggle />

      {/* Recherche par numéro */}
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
                  <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                    <SelectTrigger>
                      <SelectValue placeholder="Tous" />
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
                    <Button variant="outline" size="icon" onClick={searchDrivers}>
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
                        {driver.is_pioneer && (
                          <PioneerBadge size="xs" />
                        )}
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {driver.formatted_sharing_number}
                        </Badge>
                        {/* Afficher le statut de partenariat inline */}
                        <PartnershipStatusBadge status={getStatus(driver.id).status} compact />
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

                      {driver.phone && (
                        <a 
                          href={`tel:${driver.phone}`} 
                          className="flex items-center gap-1 mt-1 text-xs text-blue-600"
                        >
                          <Phone className="h-3 w-3" />
                          {driver.phone}
                        </a>
                      )}
                    </div>

                    {renderActionButton(driver)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Dialog proposition partenariat */}
      <Dialog open={proposalDialogOpen} onOpenChange={setProposalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Proposer un partenariat</DialogTitle>
            <DialogDescription>
              Définissez les termes du partenariat avec {selectedDriver?.full_name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Rétribution : {proposedCommission}%</Label>
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
            <Button onClick={proposePartnership} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Envoyer la demande
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
