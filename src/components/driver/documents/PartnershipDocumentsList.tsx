import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText, 
  Search, 
  Calendar,
  Euro,
  MapPin,
  Clock,
  AlertCircle,
  Loader2,
  Users,
  Building2,
  Briefcase,
  Handshake,
  Eye
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface PartnershipDocumentsListProps {
  driverId: string;
  partnershipType: 'driver' | 'company' | 'fleet';
}

interface DocumentItem {
  id: string;
  type: 'devis' | 'facture';
  number: string;
  amount: number;
  status: string;
  createdAt: string;
  partnerName: string;
  partnerId: string;
  pickupAddress?: string;
  destinationAddress?: string;
  scheduledDate?: string;
}

export function PartnershipDocumentsList({ driverId, partnershipType }: PartnershipDocumentsListProps) {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSubTab, setActiveSubTab] = useState<'devis' | 'factures' | 'contracts'>('devis');
  
  // Contracts for this partnership type
  const [contracts, setContracts] = useState<any[]>([]);

  useEffect(() => {
    loadDocuments();
    loadContracts();
  }, [driverId, partnershipType]);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const allDocs: DocumentItem[] = [];

      if (partnershipType === 'driver') {
        // Load shared courses from partner_course_pool
        const { data: sharedCourses } = await supabase
          .from('partner_course_pool')
          .select('id, course_id, sender_driver_id, claimed_by_driver_id, status')
          .or(`sender_driver_id.eq.${driverId},claimed_by_driver_id.eq.${driverId}`)
          .eq('status', 'completed');

        if (sharedCourses && sharedCourses.length > 0) {
          for (const sc of sharedCourses) {
            const isOriginalDriver = sc.sender_driver_id === driverId;
            const partnerId = isOriginalDriver ? sc.claimed_by_driver_id : sc.sender_driver_id;
            
            if (!partnerId) continue;

            // Get partner name
            const { data: partnerData } = await supabase
              .from('drivers')
              .select('profiles:user_id(full_name)')
              .eq('id', partnerId)
              .single();

            // Get course details
            const { data: courseData } = await supabase
              .from('courses')
              .select('pickup_address, destination_address, scheduled_date')
              .eq('id', sc.course_id)
              .single();

            // Get devis for this course
            const { data: devisData } = await supabase
              .from('devis')
              .select('*')
              .eq('course_id', sc.course_id)
              .maybeSingle();

            if (devisData) {
              allDocs.push({
                id: devisData.id,
                type: 'devis',
                number: devisData.quote_number,
                amount: devisData.amount,
                status: devisData.status,
                createdAt: devisData.created_at,
                partnerName: (partnerData?.profiles as any)?.full_name || 'Partenaire',
                partnerId: partnerId,
                pickupAddress: courseData?.pickup_address,
                destinationAddress: courseData?.destination_address,
                scheduledDate: courseData?.scheduled_date
              });
            }

            // Get factures for this course
            const { data: facturesData } = await supabase
              .from('factures')
              .select('*')
              .eq('course_id', sc.course_id);

            if (facturesData) {
              for (const f of facturesData) {
                allDocs.push({
                  id: f.id,
                  type: 'facture',
                  number: f.invoice_number_generated || f.invoice_number,
                  amount: f.amount,
                  status: f.payment_status,
                  createdAt: f.created_at,
                  partnerName: (partnerData?.profiles as any)?.full_name || 'Partenaire',
                  partnerId: partnerId,
                  pickupAddress: courseData?.pickup_address,
                  destinationAddress: courseData?.destination_address,
                  scheduledDate: courseData?.scheduled_date
                });
              }
            }
          }
        }
      } else if (partnershipType === 'company') {
        // Get company agreements
        const { data: agreements } = await supabase
          .from('company_driver_agreements')
          .select('id, company_id')
          .eq('driver_id', driverId)
          .eq('status', 'accepted');

        if (agreements && agreements.length > 0) {
          const companyIds = agreements.map(a => a.company_id);

          // Get companies info
          const { data: companiesData } = await supabase
            .from('companies')
            .select('id, company_name')
            .in('id', companyIds);

          const companyMap = new Map(companiesData?.map(c => [c.id, c.company_name]) || []);

          // Get company courses
          const { data: companyCourses } = await supabase
            .from('company_courses')
            .select('course_id, company_id')
            .in('company_id', companyIds);

          if (companyCourses && companyCourses.length > 0) {
            for (const cc of companyCourses) {
              // Check if driver owns this course
              const { data: courseData } = await supabase
                .from('courses')
                .select('id, driver_id, pickup_address, destination_address, scheduled_date')
                .eq('id', cc.course_id)
                .eq('driver_id', driverId)
                .maybeSingle();

              if (!courseData) continue;

              // Get devis
              const { data: devisData } = await supabase
                .from('devis')
                .select('*')
                .eq('course_id', cc.course_id)
                .maybeSingle();

              if (devisData) {
                allDocs.push({
                  id: devisData.id,
                  type: 'devis',
                  number: devisData.quote_number,
                  amount: devisData.amount,
                  status: devisData.status,
                  createdAt: devisData.created_at,
                  partnerName: companyMap.get(cc.company_id) || 'Entreprise',
                  partnerId: cc.company_id,
                  pickupAddress: courseData.pickup_address,
                  destinationAddress: courseData.destination_address,
                  scheduledDate: courseData.scheduled_date
                });
              }

              // Get factures
              const { data: facturesData } = await supabase
                .from('factures')
                .select('*')
                .eq('course_id', cc.course_id);

              if (facturesData) {
                for (const f of facturesData) {
                  allDocs.push({
                    id: f.id,
                    type: 'facture',
                    number: f.invoice_number_generated || f.invoice_number,
                    amount: f.amount,
                    status: f.payment_status,
                    createdAt: f.created_at,
                    partnerName: companyMap.get(cc.company_id) || 'Entreprise',
                    partnerId: cc.company_id,
                    pickupAddress: courseData.pickup_address,
                    destinationAddress: courseData.destination_address,
                    scheduledDate: courseData.scheduled_date
                  });
                }
              }
            }
          }
        }
      } else if (partnershipType === 'fleet') {
        // Get fleet partnerships
        const { data: partnerships } = await supabase
          .from('fleet_driver_partnerships')
          .select('id, fleet_manager_id')
          .eq('driver_id', driverId)
          .eq('status', 'accepted');

        if (partnerships && partnerships.length > 0) {
          const fleetIds = partnerships.map(p => p.fleet_manager_id);

          // Get fleet managers info
          const { data: fleetsData } = await supabase
            .from('fleet_managers')
            .select('id, company_name')
            .in('id', fleetIds);

          const fleetMap = new Map(fleetsData?.map(f => [f.id, f.company_name]) || []);

          // For fleet partnerships, we'll show a simplified view
          // since devis/factures don't have fleet_manager_id directly
          // This can be enhanced later with proper fleet course tracking
        }
      }

      // Remove duplicates and sort by date
      const uniqueDocs = allDocs.filter((doc, index, self) => 
        index === self.findIndex(d => d.id === doc.id)
      );
      uniqueDocs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setDocuments(uniqueDocs);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadContracts = async () => {
    try {
      if (partnershipType === 'driver') {
        const { data } = await supabase
          .from('driver_partnerships')
          .select('id, status, commission_percentage, payment_schedule, created_at, driver_a_id, driver_b_id')
          .or(`driver_a_id.eq.${driverId},driver_b_id.eq.${driverId}`)
          .in('status', ['active', 'pending']);

        if (data) {
          const enrichedContracts = await Promise.all(data.map(async (c) => {
            const partnerId = c.driver_a_id === driverId ? c.driver_b_id : c.driver_a_id;
            const { data: partnerData } = await supabase
              .from('drivers')
              .select('profiles:user_id(full_name)')
              .eq('id', partnerId)
              .single();
            
            return {
              ...c,
              partnerName: (partnerData?.profiles as any)?.full_name || 'Partenaire'
            };
          }));
          setContracts(enrichedContracts);
        }
      } else if (partnershipType === 'company') {
        const { data } = await supabase
          .from('company_driver_agreements')
          .select('id, status, payment_frequency, created_at, company_id')
          .eq('driver_id', driverId)
          .in('status', ['accepted', 'pending']);

        if (data) {
          const { data: companiesData } = await supabase
            .from('companies')
            .select('id, company_name')
            .in('id', data.map(d => d.company_id));

          const companyMap = new Map(companiesData?.map(c => [c.id, c.company_name]) || []);

          setContracts(data.map(c => ({
            ...c,
            partnerName: companyMap.get(c.company_id) || 'Entreprise'
          })));
        }
      } else if (partnershipType === 'fleet') {
        const { data } = await supabase
          .from('fleet_driver_partnerships')
          .select('id, status, commission_percentage, payment_schedule, created_at, fleet_manager_id')
          .eq('driver_id', driverId)
          .in('status', ['accepted', 'pending']);

        if (data) {
          const { data: fleetsData } = await supabase
            .from('fleet_managers')
            .select('id, company_name')
            .in('id', data.map(d => d.fleet_manager_id));

          const fleetMap = new Map(fleetsData?.map(f => [f.id, f.company_name]) || []);

          setContracts(data.map(c => ({
            ...c,
            partnerName: fleetMap.get(c.fleet_manager_id) || 'Gestionnaire'
          })));
        }
      }
    } catch (error) {
      console.error('Error loading contracts:', error);
    }
  };

  const getPartnerTypeLabel = () => {
    switch (partnershipType) {
      case 'driver': return 'Chauffeurs';
      case 'company': return 'Entreprises';
      case 'fleet': return 'Gestionnaires de Flotte';
    }
  };

  const getPartnerIcon = () => {
    switch (partnershipType) {
      case 'driver': return <Users className="h-5 w-5" />;
      case 'company': return <Building2 className="h-5 w-5" />;
      case 'fleet': return <Briefcase className="h-5 w-5" />;
    }
  };

  const getStatusBadge = (status: string, type: 'devis' | 'facture') => {
    if (type === 'devis') {
      const styles: Record<string, string> = {
        pending: 'bg-warning/20 text-warning border-warning/30',
        accepted: 'bg-success/20 text-success border-success/30',
        rejected: 'bg-destructive/20 text-destructive border-destructive/30',
        expired: 'bg-muted text-muted-foreground'
      };
      const labels: Record<string, string> = {
        pending: 'En attente',
        accepted: 'Accepté',
        rejected: 'Refusé',
        expired: 'Expiré'
      };
      return <Badge variant="outline" className={styles[status] || ''}>{labels[status] || status}</Badge>;
    } else {
      const styles: Record<string, string> = {
        pending: 'bg-warning/20 text-warning border-warning/30',
        paid: 'bg-success/20 text-success border-success/30',
        overdue: 'bg-destructive/20 text-destructive border-destructive/30'
      };
      const labels: Record<string, string> = {
        pending: 'En attente',
        paid: 'Payé',
        overdue: 'En retard'
      };
      return <Badge variant="outline" className={styles[status] || ''}>{labels[status] || status}</Badge>;
    }
  };

  // Filter documents
  const filteredDocs = documents.filter(doc => {
    const matchesSearch = !searchTerm || 
      doc.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.partnerName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const devisDocs = filteredDocs.filter(d => d.type === 'devis');
  const factureDocs = filteredDocs.filter(d => d.type === 'facture');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        {getPartnerIcon()}
        <h3 className="font-semibold">Documents Partenariat {getPartnerTypeLabel()}</h3>
      </div>

      <Tabs value={activeSubTab} onValueChange={(v) => setActiveSubTab(v as any)}>
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="devis" className="gap-1 text-xs">
            <FileText className="h-3.5 w-3.5" />
            Devis ({devisDocs.length})
          </TabsTrigger>
          <TabsTrigger value="factures" className="gap-1 text-xs">
            <Euro className="h-3.5 w-3.5" />
            Factures ({factureDocs.length})
          </TabsTrigger>
          <TabsTrigger value="contracts" className="gap-1 text-xs">
            <Handshake className="h-3.5 w-3.5" />
            Contrats ({contracts.length})
          </TabsTrigger>
        </TabsList>

        {/* Devis */}
        <TabsContent value="devis" className="mt-4">
          {devisDocs.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Aucun devis lié à vos partenariats {getPartnerTypeLabel().toLowerCase()}.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Rechercher..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {devisDocs.map((doc) => (
                <Card key={doc.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                            Devis
                          </Badge>
                          <span className="font-mono text-sm font-medium">{doc.number}</span>
                          {getStatusBadge(doc.status, 'devis')}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Partenaire: <span className="font-medium text-foreground">{doc.partnerName}</span>
                        </p>
                        {doc.pickupAddress && (
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {doc.pickupAddress.substring(0, 40)}...
                          </p>
                        )}
                        {doc.scheduledDate && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(doc.scheduledDate), 'dd/MM/yyyy HH:mm', { locale: fr })}
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-lg font-bold">{doc.amount.toFixed(2)} €</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(doc.createdAt), 'dd/MM/yyyy', { locale: fr })}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Factures */}
        <TabsContent value="factures" className="mt-4">
          {factureDocs.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Aucune facture liée à vos partenariats {getPartnerTypeLabel().toLowerCase()}.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Rechercher..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {factureDocs.map((doc) => (
                <Card key={doc.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="bg-success/10 text-success border-success/30">
                            Facture
                          </Badge>
                          <span className="font-mono text-sm font-medium">{doc.number}</span>
                          {getStatusBadge(doc.status, 'facture')}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Partenaire: <span className="font-medium text-foreground">{doc.partnerName}</span>
                        </p>
                        {doc.pickupAddress && (
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {doc.pickupAddress.substring(0, 40)}...
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-lg font-bold text-success">{doc.amount.toFixed(2)} €</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(doc.createdAt), 'dd/MM/yyyy', { locale: fr })}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Contracts */}
        <TabsContent value="contracts" className="mt-4">
          {contracts.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Aucun contrat de partenariat actif avec des {getPartnerTypeLabel().toLowerCase()}.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-3">
              {contracts.map((contract) => (
                <Card key={contract.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Handshake className="h-4 w-4 text-primary" />
                          <span className="font-medium">{contract.partnerName}</span>
                          <Badge 
                            variant="outline" 
                            className={contract.status === 'active' || contract.status === 'accepted' 
                              ? 'bg-success/10 text-success border-success/30' 
                              : 'bg-warning/10 text-warning border-warning/30'
                            }
                          >
                            {contract.status === 'active' || contract.status === 'accepted' ? 'Actif' : 'En attente'}
                          </Badge>
                        </div>
                        <div className="mt-2 text-sm text-muted-foreground space-y-1">
                          {contract.commission_percentage && (
                            <p>Commission: <span className="font-medium text-foreground">{contract.commission_percentage}%</span></p>
                          )}
                          {(contract.payment_schedule || contract.payment_frequency) && (
                            <p>Paiement: <span className="font-medium text-foreground">
                              {contract.payment_schedule || contract.payment_frequency}
                            </span></p>
                          )}
                          <p className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Depuis le {format(new Date(contract.created_at), 'dd/MM/yyyy', { locale: fr })}
                          </p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
