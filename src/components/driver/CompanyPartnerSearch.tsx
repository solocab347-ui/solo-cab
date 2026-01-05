import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Search, 
  Building2,
  MapPin,
  Users,
  Loader2,
  Send,
  Phone,
  Mail,
  Car,
  Star,
  Briefcase,
  CreditCard,
  Link,
  Banknote,
  Building,
  CalendarDays,
  Info,
  Palette,
  Calendar,
  UserCheck,
  Sparkles
} from 'lucide-react';
import { notificationService } from '@/lib/notificationService';
import { useCompanyProfileRealtime, PUBLIC_COMPANIES_QUERY_KEY } from '@/hooks/usePublicCompanyProfile';
import { useQuery } from '@tanstack/react-query';
import { getServiceLabel, getServiceIcon } from '@/lib/serviceLabels';

interface Company {
  id: string;
  company_name: string;
  address: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  show_phone?: boolean;
  employee_count: number | null;
  preferred_vehicle_types: string[] | null;
  accepting_proposals: boolean;
  visible_to_drivers: boolean;
  logo_url?: string | null;
  notes?: string | null;
}

interface DriverInfo {
  vehicle_model: string | null;
  vehicle_brand: string | null;
  vehicle_year: number | null;
  vehicle_color: string | null;
  vehicle_equipment: string[] | null;
  max_passengers: number | null;
  services_offered: string[] | null;
  rating: number | null;
  total_rides: number | null;
  show_rating_for_sharing: boolean | null;
  show_rides_for_sharing: boolean | null;
  card_photo_url: string | null;
  bio: string | null;
  profiles?: { full_name: string | null };
}

const PAYMENT_FREQUENCIES = [
  { value: 'adapt_company', label: "Je m'adapte à l'entreprise", description: 'Maximum 1 mois', icon: Building },
  { value: 'per_course', label: 'À chaque course', description: 'Paiement immédiat', icon: Briefcase },
  { value: 'weekly', label: 'Hebdomadaire', description: 'Paiement chaque semaine', icon: CalendarDays },
  { value: 'monthly', label: 'Mensuel', description: 'Paiement chaque mois', icon: Calendar },
];

const PAYMENT_METHODS = [
  { value: 'carte', label: 'Carte bancaire', icon: CreditCard, emoji: '💳' },
  { value: 'lien', label: 'Lien de paiement', icon: Link, emoji: '🔗' },
  { value: 'especes', label: 'Espèces', icon: Banknote, emoji: '💵' },
  { value: 'virement', label: 'Virement bancaire', icon: Building, emoji: '🏦' },
];

const DAYS_OF_WEEK = [
  { value: 1, label: 'Lundi' },
  { value: 2, label: 'Mardi' },
  { value: 3, label: 'Mercredi' },
  { value: 4, label: 'Jeudi' },
  { value: 5, label: 'Vendredi' },
  { value: 6, label: 'Samedi' },
  { value: 0, label: 'Dimanche' },
];

interface Props {
  driverId: string;
}

export function CompanyPartnerSearch({ driverId }: Props) {
  useCompanyProfileRealtime();

  const [searchTerm, setSearchTerm] = useState('');
  
  // Partnership proposal
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [proposalDialogOpen, setProposalDialogOpen] = useState(false);
  const [paymentFrequency, setPaymentFrequency] = useState('adapt_company');
  const [paymentDay, setPaymentDay] = useState(1);
  const [paymentMethods, setPaymentMethods] = useState<string[]>(['carte']);
  const [presentation, setPresentation] = useState('');
  const [additionalConditions, setAdditionalConditions] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Fetch driver info for auto-filling
  const { data: driverInfo } = useQuery({
    queryKey: ['driver-info-proposal', driverId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('drivers')
        .select(`
          vehicle_model,
          vehicle_brand,
          vehicle_year,
          vehicle_color,
          vehicle_equipment,
          max_passengers,
          services_offered,
          rating,
          total_rides,
          show_rating_for_sharing,
          show_rides_for_sharing,
          card_photo_url,
          bio,
          profiles:user_id(full_name)
        `)
        .eq('id', driverId)
        .single();
      
      if (error) throw error;
      return data as DriverInfo;
    },
    enabled: !!driverId,
  });

  // Pre-fill presentation with driver bio when dialog opens
  useEffect(() => {
    if (proposalDialogOpen && driverInfo?.bio && !presentation) {
      setPresentation(driverInfo.bio);
    }
  }, [proposalDialogOpen, driverInfo?.bio]);

  // Fetch blocked companies (mutual blocking)
  const { data: blockedCompanyIds = [] } = useQuery({
    queryKey: ['blocked-companies', driverId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_driver_agreements')
        .select('company_id')
        .eq('driver_id', driverId)
        .or('driver_blocked_company.eq.true,company_blocked_driver.eq.true');
      
      if (error) throw error;
      return data?.map(d => d.company_id) || [];
    },
    enabled: !!driverId,
  });

  const { data: allCompanies = [], isLoading: loading, isFetching: searching, refetch: searchCompanies } = useQuery({
    queryKey: [...PUBLIC_COMPANIES_QUERY_KEY, 'partner-search', searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('companies')
        .select('id, company_name, address, contact_name, contact_email, contact_phone, show_phone, employee_count, preferred_vehicle_types, accepting_proposals, visible_to_drivers, logo_url, notes')
        .eq('visible_to_drivers', true)
        .eq('accepting_proposals', true)
        .eq('status', 'active');

      if (searchTerm) {
        query = query.or(`company_name.ilike.%${searchTerm}%,address.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query.order('company_name');

      if (error) throw error;
      return data || [];
    },
    staleTime: 0,
    gcTime: 30000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  // Filter out blocked companies
  const companies = allCompanies.filter(c => !blockedCompanyIds.includes(c.id));

  const proposePartnership = async () => {
    if (!selectedCompany || !driverId) return;

    setSubmitting(true);
    try {
      const { data: existingAgreement } = await supabase
        .from('company_driver_agreements')
        .select('id, status')
        .eq('driver_id', driverId)
        .eq('company_id', selectedCompany.id)
        .maybeSingle();

      if (existingAgreement && !['rejected', 'terminated'].includes(existingAgreement.status)) {
        toast.error('Un partenariat actif ou en attente existe déjà avec cette entreprise');
        setSubmitting(false);
        return;
      }

      // Build vehicle info JSON
      const vehicleInfo = {
        brand: driverInfo?.vehicle_brand,
        model: driverInfo?.vehicle_model,
        year: driverInfo?.vehicle_year,
        color: driverInfo?.vehicle_color,
        max_passengers: driverInfo?.max_passengers,
        equipment: driverInfo?.vehicle_equipment,
      };

      const agreementData = {
        payment_frequency: paymentFrequency === 'adapt_company' ? 'monthly' : paymentFrequency,
        payment_day: paymentFrequency !== 'per_course' ? paymentDay : null,
        payment_methods: paymentMethods,
        driver_presentation: presentation,
        driver_services_offered: driverInfo?.services_offered || [],
        driver_vehicle_info: vehicleInfo,
        proposed_by: 'driver',
        status: 'pending',
        notes: additionalConditions || null,
        rejected_at: null,
        rejection_reason: null,
        terminated_at: null,
        termination_reason: null,
        updated_at: new Date().toISOString(),
      };

      let error;
      if (existingAgreement) {
        const result = await supabase
          .from('company_driver_agreements')
          .update(agreementData)
          .eq('id', existingAgreement.id);
        error = result.error;
      } else {
        const result = await supabase.from('company_driver_agreements').insert({
          driver_id: driverId,
          company_id: selectedCompany.id,
          ...agreementData,
        });
        error = result.error;
      }

      if (error) throw error;

      const { data: companyUser } = await supabase
        .from("companies")
        .select("user_id")
        .eq("id", selectedCompany.id)
        .single();

      if (companyUser?.user_id) {
        await notificationService.notifyCompanyAgreementRequest(
          companyUser.user_id,
          driverInfo?.profiles?.full_name || 'Un chauffeur'
        );
      }

      toast.success(`Proposition envoyée à ${selectedCompany.company_name} !`);
      setProposalDialogOpen(false);
      setSelectedCompany(null);
      setPresentation('');
      setAdditionalConditions('');
    } catch (error: any) {
      console.error('Error proposing partnership:', error);
      toast.error(`Erreur lors de l'envoi: ${error.message || 'Erreur inconnue'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const togglePaymentMethod = (method: string) => {
    setPaymentMethods(prev => 
      prev.includes(method) 
        ? prev.filter(m => m !== method)
        : [...prev, method]
    );
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Rechercher une entreprise..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
            <Button onClick={() => searchCompanies()} disabled={searching}>
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {companies.length} entreprise{companies.length !== 1 ? 's' : ''} trouvée{companies.length !== 1 ? 's' : ''}
          </span>
          {searching && <Loader2 className="h-4 w-4 animate-spin" />}
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : companies.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <Building2 className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Aucune entreprise disponible</p>
              <p className="text-xs mt-1">Les entreprises acceptant des propositions apparaîtront ici</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {companies.map((company) => (
              <Card key={company.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                    <div className="p-2.5 rounded-xl bg-primary/10 shrink-0 self-start">
                      {company.logo_url ? (
                        <img src={company.logo_url} alt={company.company_name} className="w-8 h-8 rounded-lg object-cover" />
                      ) : (
                        <Building2 className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold truncate">{company.company_name}</span>
                        <Badge variant="secondary" className="text-[10px] whitespace-nowrap bg-emerald-500/10 text-emerald-600">
                          <Sparkles className="h-2.5 w-2.5 mr-1" />
                          Accepte les propositions
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{company.address}</span>
                      </div>

                      {company.employee_count && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                          <Users className="h-3 w-3" />
                          <span>{company.employee_count} employés</span>
                        </div>
                      )}

                      {company.notes && (
                        <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                          {company.notes}
                        </p>
                      )}

                      {company.preferred_vehicle_types && company.preferred_vehicle_types.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {company.preferred_vehicle_types.slice(0, 3).map((type, i) => (
                            <Badge key={i} variant="outline" className="text-[10px]">
                              {type}
                            </Badge>
                          ))}
                          {company.preferred_vehicle_types.length > 3 && (
                            <Badge variant="outline" className="text-[10px]">
                              +{company.preferred_vehicle_types.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2 mt-3">
                        {company.show_phone && company.contact_phone && (
                          <a href={`tel:${company.contact_phone}`} className="text-xs text-primary flex items-center gap-1 hover:underline">
                            <Phone className="h-3 w-3" />
                            {company.contact_phone}
                          </a>
                        )}
                        <a href={`mailto:${company.contact_email}`} className="text-xs text-primary flex items-center gap-1 hover:underline">
                          <Mail className="h-3 w-3" />
                          Email
                        </a>
                      </div>
                    </div>

                    <Button 
                      size="sm"
                      className="w-full sm:w-auto mt-2 sm:mt-0"
                      onClick={() => {
                        setSelectedCompany(company);
                        setProposalDialogOpen(true);
                      }}
                    >
                      <Send className="h-4 w-4 mr-1" />
                      <span className="sm:hidden">Proposer mes services</span>
                      <span className="hidden sm:inline">Proposer</span>
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
        <DialogContent className="max-h-[90vh] overflow-y-auto max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Proposer un partenariat
            </DialogTitle>
            <DialogDescription>
              Envoyez une proposition à {selectedCompany?.company_name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-4">
            {/* Vehicle Info Card - Auto-filled */}
            {driverInfo && (
              <Card className="border-dashed border-primary/30 bg-primary/5">
                <CardHeader className="pb-2 pt-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Car className="h-4 w-4 text-primary" />
                    Informations véhicule (auto-renseignées)
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 pb-3">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    {(driverInfo.vehicle_brand || driverInfo.vehicle_model) && (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Véhicule:</span>
                        <span className="font-medium">{[driverInfo.vehicle_brand, driverInfo.vehicle_model].filter(Boolean).join(' ')}</span>
                      </div>
                    )}
                    {driverInfo.vehicle_year && (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Année:</span>
                        <span className="font-medium">{driverInfo.vehicle_year}</span>
                      </div>
                    )}
                    {driverInfo.vehicle_color && (
                      <div className="flex items-center gap-2">
                        <Palette className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Couleur:</span>
                        <span className="font-medium">{driverInfo.vehicle_color}</span>
                      </div>
                    )}
                    {driverInfo.max_passengers && (
                      <div className="flex items-center gap-2">
                        <UserCheck className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Passagers max:</span>
                        <span className="font-medium">{driverInfo.max_passengers}</span>
                      </div>
                    )}
                  </div>

                  {/* Equipment badges */}
                  {driverInfo.vehicle_equipment && driverInfo.vehicle_equipment.length > 0 && (
                    <div className="mt-2">
                      <span className="text-xs text-muted-foreground">Équipements:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {driverInfo.vehicle_equipment.map((eq, i) => (
                          <Badge key={i} variant="secondary" className="text-[10px]">
                            {eq}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Rating and rides - respecting visibility settings */}
                  <div className="flex items-center gap-3 mt-3 pt-2 border-t">
                    {driverInfo.show_rating_for_sharing && driverInfo.rating !== null && driverInfo.rating > 0 && (
                      <Badge className="bg-amber-500/20 text-amber-600 border-0">
                        <Star className="h-3 w-3 fill-current mr-1" />
                        {driverInfo.rating.toFixed(1)}/5
                      </Badge>
                    )}
                    {driverInfo.show_rides_for_sharing && driverInfo.total_rides !== null && driverInfo.total_rides > 0 && (
                      <span className="text-xs text-muted-foreground">
                        ({driverInfo.total_rides} courses)
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Services offered - displayed with icons */}
            {driverInfo?.services_offered && driverInfo.services_offered.length > 0 && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-primary" />
                  Mes services
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {driverInfo.services_offered.map((service, i) => (
                    <Badge key={i} variant="outline" className="text-xs py-1 px-2">
                      <span className="mr-1">{getServiceIcon(service)}</span>
                      {getServiceLabel(service)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Presentation */}
            <div className="space-y-2">
              <Label>Votre présentation</Label>
              <Textarea
                placeholder="Présentez-vous brièvement à l'entreprise..."
                value={presentation}
                onChange={(e) => setPresentation(e.target.value)}
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">Personnalisez ce message pour vous présenter à l'entreprise</p>
            </div>

            {/* Payment Methods */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" />
                Modes de paiement acceptés
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {PAYMENT_METHODS.map((method) => {
                  const isSelected = paymentMethods.includes(method.value);
                  return (
                    <div
                      key={method.value}
                      onClick={() => togglePaymentMethod(method.value)}
                      className={`
                        flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all
                        ${isSelected 
                          ? 'border-primary bg-primary/5 ring-1 ring-primary/30' 
                          : 'border-border hover:border-primary/50'
                        }
                      `}
                    >
                      <Checkbox checked={isSelected} className="pointer-events-none" />
                      <span className="text-lg">{method.emoji}</span>
                      <span className="text-sm">{method.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Payment Frequency */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-primary" />
                Fréquence de paiement souhaitée
              </Label>
              <Select value={paymentFrequency} onValueChange={setPaymentFrequency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_FREQUENCIES.map((freq) => (
                    <SelectItem key={freq.value} value={freq.value}>
                      <div className="flex items-center gap-2">
                        <freq.icon className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <span>{freq.label}</span>
                          <span className="text-xs text-muted-foreground ml-2">- {freq.description}</span>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Info for "adapt to company" */}
              {paymentFrequency === 'adapt_company' && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    Vous acceptez de vous adapter au cycle de paiement de l'entreprise, dans la limite d'un mois maximum.
                  </p>
                </div>
              )}
            </div>

            {/* Payment Day - only show if not per_course and not adapt */}
            {paymentFrequency !== 'per_course' && paymentFrequency !== 'adapt_company' && (
              <div className="space-y-2">
                <Label>Jour de paiement</Label>
                <Select value={String(paymentDay)} onValueChange={(v) => setPaymentDay(Number(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS_OF_WEEK.map((day) => (
                      <SelectItem key={day.value} value={String(day.value)}>
                        {day.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Additional conditions */}
            <div className="space-y-2">
              <Label>Conditions supplémentaires (optionnel)</Label>
              <Textarea
                placeholder="Ex: Disponibilité, zones desservies, tarifs spéciaux..."
                value={additionalConditions}
                onChange={(e) => setAdditionalConditions(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setProposalDialogOpen(false)} className="w-full sm:w-auto">
              Annuler
            </Button>
            <Button 
              onClick={proposePartnership} 
              disabled={submitting || !presentation.trim() || paymentMethods.length === 0}
              className="w-full sm:w-auto"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Envoyer la proposition
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
