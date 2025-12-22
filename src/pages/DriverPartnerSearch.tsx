import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
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
  Building2
} from 'lucide-react';
import { SharingAvailabilityToggle } from '@/components/driver/SharingAvailabilityToggle';

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
        _department: selectedDepartment || null,
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

    setSubmitting(true);
    try {
      // Vérifier si un partenariat existe déjà
      const { data: existing } = await supabase
        .from('driver_partnerships')
        .select('id')
        .or(`and(driver_a_id.eq.${driverInfo.id},driver_b_id.eq.${selectedDriver.id}),and(driver_a_id.eq.${selectedDriver.id},driver_b_id.eq.${driverInfo.id})`)
        .maybeSingle();

      if (existing) {
        toast.error('Un partenariat existe déjà avec ce chauffeur');
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

      toast.success(`Demande de partenariat envoyée à ${selectedDriver.full_name} !`);
      setProposalDialogOpen(false);
      setSelectedDriver(null);
      setProposedCommission(10);
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
    setSelectedDriver(driver);
    setProposalDialogOpen(true);
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
              Entrez le numéro de partage d'un chauffeur (ex: SOL-0001) ou utilisez les filtres
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="SOL-0001"
                value={searchNumber}
                onChange={(e) => setSearchNumber(e.target.value.toUpperCase())}
                className="flex-1"
              />
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
                        <SelectItem value="">Tous les départements</SelectItem>
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
                          <h3 className="font-semibold truncate">{driver.full_name}</h3>
                          <Badge variant="outline" className="font-mono text-xs">
                            {driver.formatted_sharing_number}
                          </Badge>
                        </div>
                        
                        {driver.company_name && (
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

                    <Button 
                      className="w-full mt-4" 
                      onClick={() => openProposalDialog(driver)}
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Proposer un partenariat
                    </Button>
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
              <Label>Commission proposée : {proposedCommission}%</Label>
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
            <Button onClick={proposePartnership} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Envoyer la demande
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
