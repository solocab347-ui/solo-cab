import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Search, 
  Building2,
  MapPin,
  Users,
  Filter,
  Loader2,
  Send,
  Phone,
  Mail
} from 'lucide-react';
import { notificationService } from '@/lib/notificationService';

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

const PAYMENT_FREQUENCIES = [
  { value: 'per_course', label: 'À chaque course' },
  { value: 'weekly', label: 'Hebdomadaire' },
  { value: 'monthly', label: 'Mensuel' },
];

const PAYMENT_METHODS = [
  { value: 'virement', label: 'Virement bancaire' },
  { value: 'cheque', label: 'Chèque' },
  { value: 'especes', label: 'Espèces' },
];

interface Props {
  driverId: string;
}

export function CompanyPartnerSearch({ driverId }: Props) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  // Partnership proposal
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [proposalDialogOpen, setProposalDialogOpen] = useState(false);
  const [paymentFrequency, setPaymentFrequency] = useState('monthly');
  const [paymentMethods, setPaymentMethods] = useState<string[]>(['virement']);
  const [presentation, setPresentation] = useState('');
  const [servicesOffered, setServicesOffered] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    searchCompanies();
  }, []);

  const searchCompanies = async () => {
    setSearching(true);
    try {
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
      setCompanies(data || []);
    } catch (error) {
      console.error('Error searching companies:', error);
      toast.error('Erreur lors de la recherche');
    } finally {
      setSearching(false);
      setLoading(false);
    }
  };

  const proposePartnership = async () => {
    if (!selectedCompany || !driverId) return;

    setSubmitting(true);
    try {
      // Check if agreement already exists
      const { data: existing } = await supabase
        .from('company_driver_agreements')
        .select('id')
        .eq('driver_id', driverId)
        .eq('company_id', selectedCompany.id)
        .not('status', 'in', '("rejected","terminated")')
        .maybeSingle();

      if (existing) {
        toast.error('Un partenariat existe déjà avec cette entreprise');
        return;
      }

      const { error } = await supabase.from('company_driver_agreements').insert({
        driver_id: driverId,
        company_id: selectedCompany.id,
        payment_frequency: paymentFrequency,
        payment_methods: paymentMethods,
        driver_presentation: presentation,
        driver_services_offered: servicesOffered.split(',').map(s => s.trim()).filter(Boolean),
        proposed_by: 'driver',
        status: 'pending',
      });

      if (error) throw error;

      // Notifier l'entreprise de la demande de partenariat
      const { data: companyUser } = await supabase
        .from("companies")
        .select("user_id")
        .eq("id", selectedCompany.id)
        .single();

      if (companyUser?.user_id) {
        const { data: driverData } = await supabase
          .from("drivers")
          .select("profiles:user_id(full_name)")
          .eq("id", driverId)
          .single();
        
        await notificationService.notifyCompanyAgreementRequest(
          companyUser.user_id,
          driverData?.profiles?.full_name || 'Un chauffeur'
        );
      }

      toast.success(`Proposition envoyée à ${selectedCompany.company_name} !`);
      setProposalDialogOpen(false);
      setSelectedCompany(null);
      setPresentation('');
      setServicesOffered('');
    } catch (error: any) {
      console.error('Error proposing partnership:', error);
      toast.error('Erreur lors de l\'envoi de la proposition');
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
            <Button onClick={searchCompanies} disabled={searching}>
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
                    {/* Logo / Icône */}
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
                        <Badge variant="secondary" className="text-[10px] whitespace-nowrap">
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

                      {/* Description */}
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

                      {/* Actions de contact */}
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
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Proposer un partenariat</DialogTitle>
            <DialogDescription>
              Envoyez une proposition à {selectedCompany?.company_name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Votre présentation</Label>
              <Textarea
                placeholder="Présentez-vous brièvement à l'entreprise..."
                value={presentation}
                onChange={(e) => setPresentation(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Services proposés</Label>
              <Input
                placeholder="Transferts aéroport, mises à disposition, etc."
                value={servicesOffered}
                onChange={(e) => setServicesOffered(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Séparez les services par des virgules</p>
            </div>

            <div className="space-y-2">
              <Label>Fréquence de facturation</Label>
              <Select value={paymentFrequency} onValueChange={setPaymentFrequency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_FREQUENCIES.map((freq) => (
                    <SelectItem key={freq.value} value={freq.value}>
                      {freq.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Modes de paiement acceptés</Label>
              <div className="flex flex-wrap gap-2">
                {PAYMENT_METHODS.map((method) => (
                  <Badge
                    key={method.value}
                    variant={paymentMethods.includes(method.value) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => togglePaymentMethod(method.value)}
                  >
                    {method.label}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setProposalDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={proposePartnership} disabled={submitting || !presentation.trim()}>
              {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Envoyer la proposition
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
