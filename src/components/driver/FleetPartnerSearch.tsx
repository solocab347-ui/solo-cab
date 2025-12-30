import { useState, useEffect } from 'react';
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Search, 
  Briefcase,
  MapPin,
  Users,
  Filter,
  Loader2,
  Send,
  Star,
  Car
} from 'lucide-react';

interface FleetManager {
  id: string;
  user_id: string;
  company_name: string;
  description: string | null;
  address: string | null;
  service_area: string[] | null;
  partner_commission_percentage: number | null;
  partner_payment_schedule: string | null;
  public_profile_enabled: boolean;
  full_name: string;
  profile_photo_url: string | null;
  driver_count: number;
}

const PAYMENT_SCHEDULES = [
  { value: 'per_course', label: 'À chaque course' },
  { value: 'weekly', label: 'Hebdomadaire' },
  { value: 'monthly', label: 'Mensuel' },
];

interface Props {
  driverId: string;
}

export function FleetPartnerSearch({ driverId }: Props) {
  const [fleets, setFleets] = useState<FleetManager[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  // Partnership proposal
  const [selectedFleet, setSelectedFleet] = useState<FleetManager | null>(null);
  const [proposalDialogOpen, setProposalDialogOpen] = useState(false);
  const [proposedCommission, setProposedCommission] = useState(15);
  const [proposedPaymentSchedule, setProposedPaymentSchedule] = useState('weekly');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    searchFleets();
  }, []);

  const searchFleets = async () => {
    setSearching(true);
    try {
      let query = supabase
        .from('fleet_managers')
        .select('id, user_id, company_name, description, address, public_profile_enabled')
        .eq('public_profile_enabled', true)
        .eq('status', 'active');

      if (searchTerm) {
        query = query.or(`company_name.ilike.%${searchTerm}%,address.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query.order('company_name');

      if (error) throw error;

      const enrichedFleets: FleetManager[] = [];
      for (const fleet of data || []) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, profile_photo_url')
          .eq('id', fleet.user_id)
          .single();

        const { count } = await supabase
          .from('fleet_manager_drivers')
          .select('*', { count: 'exact', head: true })
          .eq('fleet_manager_id', fleet.id)
          .eq('status', 'active');

        enrichedFleets.push({
          id: fleet.id,
          user_id: fleet.user_id,
          company_name: fleet.company_name,
          description: fleet.description,
          address: fleet.address,
          service_area: null,
          partner_commission_percentage: null,
          partner_payment_schedule: null,
          public_profile_enabled: fleet.public_profile_enabled,
          full_name: profile?.full_name || fleet.company_name,
          profile_photo_url: profile?.profile_photo_url || null,
          driver_count: count || 0,
        });
      }

      setFleets(enrichedFleets);
    } catch (error) {
      console.error('Error searching fleets:', error);
      toast.error('Erreur lors de la recherche');
    } finally {
      setSearching(false);
      setLoading(false);
    }
  };

  const proposePartnership = async () => {
    if (!selectedFleet || !driverId) return;

    setSubmitting(true);
    try {
      // For now, show a message that fleet partnerships are coming soon
      toast.info('Les partenariats avec les flottes seront bientôt disponibles');
      setProposalDialogOpen(false);
      setSelectedFleet(null);
    } catch (error: any) {
      console.error('Error proposing partnership:', error);
      toast.error('Erreur lors de l\'envoi de la proposition');
    } finally {
      setSubmitting(false);
    }
  };

  const getPaymentScheduleLabel = (schedule: string | null) => {
    switch (schedule) {
      case 'per_course': return 'Par course';
      case 'weekly': return 'Hebdomadaire';
      case 'monthly': return 'Mensuel';
      default: return 'À définir';
    }
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Rechercher une flotte..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
            <Button onClick={searchFleets} disabled={searching}>
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {fleets.length} flotte{fleets.length !== 1 ? 's' : ''} trouvée{fleets.length !== 1 ? 's' : ''}
          </span>
          {searching && <Loader2 className="h-4 w-4 animate-spin" />}
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : fleets.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <Briefcase className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Aucune flotte disponible</p>
              <p className="text-xs mt-1">Les gestionnaires de flotte avec profil public apparaîtront ici</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {fleets.map((fleet) => (
              <Card key={fleet.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-12 w-12 shrink-0">
                      <AvatarImage src={fleet.profile_photo_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {fleet.company_name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold truncate">{fleet.company_name}</span>
                      </div>
                      
                      {fleet.address && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          <span className="truncate">{fleet.address}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {fleet.driver_count} chauffeurs
                        </span>
                        {fleet.partner_commission_percentage && (
                          <Badge variant="outline" className="text-[10px]">
                            {fleet.partner_commission_percentage}% commission
                          </Badge>
                        )}
                      </div>

                      {fleet.description && (
                        <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                          {fleet.description}
                        </p>
                      )}

                      {fleet.service_area && fleet.service_area.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {fleet.service_area.slice(0, 3).map((area, i) => (
                            <Badge key={i} variant="secondary" className="text-[10px]">
                              {area}
                            </Badge>
                          ))}
                          {fleet.service_area.length > 3 && (
                            <Badge variant="secondary" className="text-[10px]">
                              +{fleet.service_area.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>

                    <Button 
                      size="sm"
                      onClick={() => {
                        setSelectedFleet(fleet);
                        setProposedCommission(fleet.partner_commission_percentage || 15);
                        setProposedPaymentSchedule(fleet.partner_payment_schedule || 'weekly');
                        setProposalDialogOpen(true);
                      }}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
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
                La commission que vous reverserez à la flotte pour chaque course reçue
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

            {selectedFleet?.partner_commission_percentage && (
              <div className="p-3 bg-muted/50 rounded-lg text-xs">
                <p className="font-medium">Conditions suggérées par la flotte :</p>
                <p className="mt-1">Commission : {selectedFleet.partner_commission_percentage}%</p>
                <p>Paiement : {getPaymentScheduleLabel(selectedFleet.partner_payment_schedule)}</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setProposalDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={proposePartnership} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Envoyer la proposition
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
