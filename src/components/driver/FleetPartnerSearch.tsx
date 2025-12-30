import { useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Search, 
  Briefcase,
  MapPin,
  Users,
  Loader2,
  Send,
  Phone,
  Mail,
  Euro,
  FileText,
  Building2,
  CheckCircle2,
  ChevronDown,
  Filter,
  X
} from 'lucide-react';
import { useVisibleFleets, useFleetProfileRealtime } from '@/hooks/usePublicFleetProfile';
import { DRIVER_SERVICES } from '@/lib/vehicleEquipment';
import { FRENCH_SECTORS } from '@/lib/frenchSectors';

interface FleetManagerPublic {
  id: string;
  user_id: string;
  company_name: string;
  contact_name: string | null;
  description: string | null;
  address: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  visible_to_drivers: boolean;
  visible_to_companies: boolean;
  logo_url: string | null;
  show_contact_name: boolean;
  show_address: boolean;
  show_phone: boolean;
  show_email: boolean;
  show_drivers_in_public_storefront: boolean;
  show_driver_count_public?: boolean;
  show_client_count_public?: boolean;
  default_partnership_commission: number | null;
  partnership_terms: string | null;
  services_offered: string[] | null;
}

const PAYMENT_SCHEDULES = [
  { value: 'per_course', label: 'À chaque course' },
  { value: 'weekly', label: 'Hebdomadaire' },
  { value: 'monthly', label: 'Mensuel' },
];

interface Props {
  driverId: string;
}

// Extraire le département d'une adresse
const extractDepartment = (address: string | null): string | null => {
  if (!address) return null;
  const match = address.match(/\b(\d{2})\d{3}\b/);
  if (match) {
    return match[1];
  }
  return null;
};

// Obtenir le label d'un service
const getServiceLabel = (serviceId: string): string => {
  const service = DRIVER_SERVICES.find(s => s.id === serviceId);
  return service?.label || serviceId;
};

// Obtenir le label du département
const getDepartmentLabel = (code: string): string => {
  const dept = FRENCH_SECTORS.find(d => d.id === code);
  return dept?.label || code;
};

export function FleetPartnerSearch({ driverId }: Props) {
  useFleetProfileRealtime();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [selectedService, setSelectedService] = useState<string>('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedFleet, setSelectedFleet] = useState<FleetManagerPublic | null>(null);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [proposalDialogOpen, setProposalDialogOpen] = useState(false);
  const [proposedCommission, setProposedCommission] = useState(15);
  const [proposedPaymentSchedule, setProposedPaymentSchedule] = useState('weekly');
  const [proposalMessage, setProposalMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [driverCount, setDriverCount] = useState<Record<string, number>>({});
  const [clientCount, setClientCount] = useState<Record<string, number>>({});

  const { data: fleets = [], isLoading: loading, isFetching: searching } = useVisibleFleets({
    searchTerm: searchTerm || undefined
  });

  // Filtrer les flottes par département et service
  const filteredFleets = useMemo(() => {
    return fleets.filter(fleet => {
      // Filtre département
      if (selectedDepartment) {
        const dept = extractDepartment(fleet.address);
        if (dept !== selectedDepartment) return false;
      }
      // Filtre service
      if (selectedService) {
        if (!fleet.services_offered?.includes(selectedService)) return false;
      }
      return true;
    });
  }, [fleets, selectedDepartment, selectedService]);

  const activeFiltersCount = [selectedDepartment, selectedService].filter(Boolean).length;

  // Charger le nombre de chauffeurs pour chaque flotte
  const loadDriverCount = async (fleetId: string) => {
    if (driverCount[fleetId] !== undefined) return;
    
    const { count } = await supabase
      .from('fleet_manager_drivers')
      .select('*', { count: 'exact', head: true })
      .eq('fleet_manager_id', fleetId)
      .eq('status', 'active');
    
    setDriverCount(prev => ({ ...prev, [fleetId]: count || 0 }));
  };

  const openProfile = (fleet: FleetManagerPublic) => {
    setSelectedFleet(fleet);
    loadDriverCount(fleet.id);
    setProfileDialogOpen(true);
  };

  const openProposal = () => {
    if (!selectedFleet) return;
    setProposedCommission(selectedFleet.default_partnership_commission || 15);
    setProposalMessage(`Bonjour,\n\nJe souhaite proposer un partenariat avec ${selectedFleet.company_name}. Je suis disponible pour discuter des conditions de collaboration.\n\nCordialement`);
    setProfileDialogOpen(false);
    setProposalDialogOpen(true);
  };

  const proposePartnership = async () => {
    if (!selectedFleet || !driverId) return;

    setSubmitting(true);
    try {
      // Vérifier si un partenariat existe déjà
      const { data: existing } = await supabase
        .from('fleet_driver_partnerships')
        .select('id, status')
        .eq('fleet_manager_id', selectedFleet.id)
        .eq('driver_id', driverId)
        .in('status', ['pending', 'accepted'])
        .maybeSingle();

      if (existing) {
        toast.error(existing.status === 'pending' 
          ? 'Une demande de partenariat est déjà en attente'
          : 'Vous avez déjà un partenariat actif avec cette flotte');
        return;
      }

      // Créer la proposition de partenariat
      const { error } = await supabase
        .from('fleet_driver_partnerships')
        .insert({
          fleet_manager_id: selectedFleet.id,
          driver_id: driverId,
          commission_percentage: proposedCommission,
          payment_schedule: proposedPaymentSchedule,
          proposal_message: proposalMessage,
          initiated_by: 'driver',
          status: 'pending'
        });

      if (error) throw error;

      toast.success('Proposition de partenariat envoyée');
      setProposalDialogOpen(false);
      setSelectedFleet(null);
    } catch (error: any) {
      console.error('Error proposing partnership:', error);
      toast.error('Erreur lors de l\'envoi de la proposition');
    } finally {
      setSubmitting(false);
    }
  };

  const clearFilters = () => {
    setSelectedDepartment('');
    setSelectedService('');
  };

  return (
    <div className="space-y-4">
      {/* Search + Filters */}
      <Card>
        <CardContent className="p-3 sm:p-4 space-y-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom ou ville..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filters Collapsible */}
          <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Filtres avancés
                  {activeFiltersCount > 0 && (
                    <Badge variant="secondary" className="text-xs px-1.5">
                      {activeFiltersCount}
                    </Badge>
                  )}
                </span>
                <ChevronDown className={`h-4 w-4 transition-transform ${filtersOpen ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3 space-y-3">
              {/* Département */}
              <div className="space-y-1.5">
                <Label className="text-xs">Département</Label>
                <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Tous les départements" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectItem value="">Tous les départements</SelectItem>
                    {FRENCH_SECTORS.map(dept => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Service */}
              <div className="space-y-1.5">
                <Label className="text-xs">Service proposé</Label>
                <Select value={selectedService} onValueChange={setSelectedService}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Tous les services" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Tous les services</SelectItem>
                    {DRIVER_SERVICES.map(service => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Clear Filters */}
              {activeFiltersCount > 0 && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="w-full text-muted-foreground">
                  <X className="h-4 w-4 mr-2" />
                  Réinitialiser les filtres
                </Button>
              )}
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>

      {/* Results */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {filteredFleets.length} gestionnaire{filteredFleets.length !== 1 ? 's' : ''} disponible{filteredFleets.length !== 1 ? 's' : ''}
          </span>
          {searching && <Loader2 className="h-4 w-4 animate-spin" />}
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : filteredFleets.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <Building2 className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Aucun gestionnaire disponible</p>
              <p className="text-xs mt-1">
                {activeFiltersCount > 0 
                  ? 'Essayez de modifier vos critères de recherche'
                  : 'Les gestionnaires doivent activer leur profil pour les chauffeurs'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredFleets.map((fleet) => {
              const dept = extractDepartment(fleet.address);
              return (
                <Card 
                  key={fleet.id} 
                  className="overflow-hidden cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => openProfile(fleet as FleetManagerPublic)}
                >
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-12 w-12 sm:h-14 sm:w-14 shrink-0 border-2 border-border">
                        <AvatarImage src={fleet.logo_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm sm:text-base">
                          {fleet.company_name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <span className="font-semibold text-sm sm:text-base block truncate">{fleet.company_name}</span>
                            {dept && (
                              <Badge variant="outline" className="text-xs mt-1">
                                <MapPin className="h-3 w-3 mr-1" />
                                {getDepartmentLabel(dept)}
                              </Badge>
                            )}
                          </div>
                        </div>

                        {fleet.description && (
                          <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                            {fleet.description}
                          </p>
                        )}

                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {fleet.default_partnership_commission && (
                            <Badge variant="secondary" className="text-xs">
                              <Euro className="h-3 w-3 mr-1" />
                              {fleet.default_partnership_commission}%
                            </Badge>
                          )}
                          {fleet.services_offered && fleet.services_offered.length > 0 && (
                            <Badge variant="outline" className="text-xs">
                              <Briefcase className="h-3 w-3 mr-1" />
                              {fleet.services_offered.length} service{fleet.services_offered.length > 1 ? 's' : ''}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Fleet Profile Dialog */}
      <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh]">
          <ScrollArea className="max-h-[calc(90vh-100px)]">
            {selectedFleet && (
              <div className="space-y-6 pr-4">
                {/* Header */}
                <div className="flex items-start gap-4">
                  <Avatar className="h-20 w-20 border-4 border-border">
                    <AvatarImage src={selectedFleet.logo_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
                      {selectedFleet.company_name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h2 className="text-xl font-bold">{selectedFleet.company_name}</h2>
                    {selectedFleet.show_contact_name && selectedFleet.contact_name && (
                      <p className="text-sm text-muted-foreground">{selectedFleet.contact_name}</p>
                    )}
                    {extractDepartment(selectedFleet.address) && (
                      <Badge variant="outline" className="mt-2">
                        <MapPin className="h-3 w-3 mr-1" />
                        Département {extractDepartment(selectedFleet.address)}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Description */}
                {selectedFleet.description && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Présentation
                    </h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-line">
                      {selectedFleet.description}
                    </p>
                  </div>
                )}

                {/* Address */}
                {selectedFleet.show_address && selectedFleet.address && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Adresse
                    </h3>
                    <p className="text-sm text-muted-foreground">{selectedFleet.address}</p>
                  </div>
                )}

                {/* Contact */}
                {(selectedFleet.show_phone || selectedFleet.show_email) && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold">Contact</h3>
                    <div className="flex flex-col sm:flex-row gap-2">
                      {selectedFleet.show_phone && selectedFleet.contact_phone && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(`tel:${selectedFleet.contact_phone}`);
                          }}
                        >
                          <Phone className="h-4 w-4 mr-2" />
                          Appeler
                        </Button>
                      )}
                      {selectedFleet.show_email && selectedFleet.contact_email && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="flex-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(`mailto:${selectedFleet.contact_email}`);
                          }}
                        >
                          <Mail className="h-4 w-4 mr-2" />
                          Email
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* Services */}
                {selectedFleet.services_offered && selectedFleet.services_offered.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <Briefcase className="h-4 w-4" />
                      Services proposés
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedFleet.services_offered.map((service, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {getServiceLabel(service)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Partnership Info */}
                <div className="space-y-2 p-4 bg-primary/5 rounded-xl border border-primary/20">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Euro className="h-4 w-4 text-primary" />
                    Conditions de partenariat
                  </h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Commission par défaut</span>
                      <span className="font-medium">{selectedFleet.default_partnership_commission || 10}%</span>
                    </div>
                    {/* N'afficher les chauffeurs actifs que si le gestionnaire l'a rendu public */}
                    {selectedFleet.show_driver_count_public && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Chauffeurs actifs</span>
                        <span className="font-medium">{driverCount[selectedFleet.id] ?? '...'}</span>
                      </div>
                    )}
                    {/* N'afficher les clients que si le gestionnaire l'a rendu public */}
                    {selectedFleet.show_client_count_public && clientCount[selectedFleet.id] !== undefined && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Clients</span>
                        <span className="font-medium">{clientCount[selectedFleet.id]}</span>
                      </div>
                    )}
                  </div>
                  {selectedFleet.partnership_terms && (
                    <p className="text-xs text-muted-foreground mt-2 pt-2 border-t border-primary/10">
                      {selectedFleet.partnership_terms}
                    </p>
                  )}
                </div>

                {/* Action Button */}
                <Button onClick={openProposal} className="w-full" size="lg">
                  <Send className="h-4 w-4 mr-2" />
                  Proposer un partenariat
                </Button>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Partnership proposal dialog */}
      <Dialog open={proposalDialogOpen} onOpenChange={setProposalDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-primary" />
              Proposer un partenariat
            </DialogTitle>
            <DialogDescription>
              Envoyez une proposition à {selectedFleet?.company_name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Commission proposée : {proposedCommission}%</Label>
              <Slider
                value={[proposedCommission]}
                onValueChange={(v) => setProposedCommission(v[0])}
                min={5}
                max={30}
                step={1}
              />
              <p className="text-xs text-muted-foreground">
                Commission que vous reverserez pour chaque course reçue
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

            <div className="space-y-2">
              <Label>Message de proposition</Label>
              <Textarea
                value={proposalMessage}
                onChange={(e) => setProposalMessage(e.target.value)}
                rows={4}
                placeholder="Présentez-vous et expliquez pourquoi vous souhaitez collaborer..."
              />
            </div>

            {selectedFleet?.default_partnership_commission && (
              <div className="p-3 bg-muted/50 rounded-lg text-xs">
                <p className="font-medium flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-primary" />
                  Conditions suggérées par le gestionnaire :
                </p>
                <p className="mt-1">Commission : {selectedFleet.default_partnership_commission}%</p>
              </div>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setProposalDialogOpen(false)} className="flex-1">
              Annuler
            </Button>
            <Button onClick={proposePartnership} disabled={submitting} className="flex-1">
              {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Envoyer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
