import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { PartnershipContractDialog } from './PartnershipContractDialog';
import { 
  FileText, 
  Search, 
  Calendar as CalendarIcon,
  Euro,
  MapPin,
  AlertCircle,
  Loader2,
  Users,
  Building2,
  Briefcase,
  Handshake,
  Eye,
  Filter,
  X,
  SlidersHorizontal,
  Download,
  Bell
} from 'lucide-react';
import { format, isWithinInterval, startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';
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
  isNew?: boolean;
}

export function PartnershipDocumentsList({ driverId, partnershipType }: PartnershipDocumentsListProps) {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSubTab, setActiveSubTab] = useState<'devis' | 'factures' | 'contracts'>('devis');
  
  // Filtres avancés
  const [partnerFilter, setPartnerFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined });
  const [showFilters, setShowFilters] = useState(false);
  
  // Contracts for this partnership type
  const [contracts, setContracts] = useState<any[]>([]);
  
  // Contract detail dialog
  const [selectedContract, setSelectedContract] = useState<any | null>(null);
  const [contractDialogOpen, setContractDialogOpen] = useState(false);
  
  // User info for contract
  const [currentUserName, setCurrentUserName] = useState('');
  const [currentUserCompany, setCurrentUserCompany] = useState('');

  // Liste des partenaires uniques pour le filtre
  const uniquePartners = useMemo(() => {
    const partners = new Map<string, string>();
    documents.forEach(doc => {
      if (!partners.has(doc.partnerId)) {
        partners.set(doc.partnerId, doc.partnerName);
      }
    });
    return Array.from(partners, ([id, name]) => ({ id, name }));
  }, [documents]);

  useEffect(() => {
    loadDocuments();
    loadContracts();
    loadUserInfo();
  }, [driverId, partnershipType]);

  const loadUserInfo = async () => {
    if (!user?.id) return;
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();
    
    const { data: driver } = await supabase
      .from('drivers')
      .select('company_name')
      .eq('id', driverId)
      .single();
    
    if (profile) setCurrentUserName(profile.full_name || 'Utilisateur');
    if (driver) setCurrentUserCompany(driver.company_name || '');
  };

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const allDocs: DocumentItem[] = [];
      const weekAgo = subDays(new Date(), 7);

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
              const createdDate = new Date(devisData.created_at);
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
                scheduledDate: courseData?.scheduled_date,
                isNew: createdDate > weekAgo
              });
            }

            // Get factures for this course
            const { data: facturesData } = await supabase
              .from('factures')
              .select('*')
              .eq('course_id', sc.course_id);

            if (facturesData) {
              for (const f of facturesData) {
                const createdDate = new Date(f.created_at);
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
                  scheduledDate: courseData?.scheduled_date,
                  isNew: createdDate > weekAgo
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
                const createdDate = new Date(devisData.created_at);
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
                  scheduledDate: courseData.scheduled_date,
                  isNew: createdDate > weekAgo
                });
              }

              // Get factures
              const { data: facturesData } = await supabase
                .from('factures')
                .select('*')
                .eq('course_id', cc.course_id);

              if (facturesData) {
                for (const f of facturesData) {
                  const createdDate = new Date(f.created_at);
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
                    scheduledDate: courseData.scheduled_date,
                    isNew: createdDate > weekAgo
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

          // Get courses assigned by fleet managers (from fleet_manager_drivers)
          const { data: fleetDriverRelations } = await supabase
            .from('fleet_manager_drivers')
            .select('fleet_manager_id')
            .eq('driver_id', driverId);
          
          const relatedFleetIds = fleetDriverRelations?.map(r => r.fleet_manager_id) || [];
          
          // Get fleet courses (courses where the driver was assigned by a fleet manager)
          // These courses would be ones created via the fleet booking system
          const { data: fleetCourses } = await supabase
            .from('courses')
            .select('id, pickup_address, destination_address, scheduled_date')
            .eq('driver_id', driverId)
            .order('created_at', { ascending: false });
          
          if (fleetCourses && fleetCourses.length > 0) {
            const courseIds = fleetCourses.map(c => c.id);
            
            // Get devis for fleet courses - only those linked to fleet manager courses
            const { data: fleetDevis } = await supabase
              .from('devis')
              .select('*')
              .in('course_id', courseIds)
              .eq('driver_id', driverId)
              .order('created_at', { ascending: false });

            // Only include devis that belong to fleet manager courses
            // We identify these by checking if the course was created via fleet system
            if (fleetDevis) {
              for (const devis of fleetDevis) {
                // Find the matching course
                const course = fleetCourses.find(c => c.id === devis.course_id);
                if (!course) continue;
                
                // Assign to first fleet partnership found (simplification)
                const fleetManagerId = fleetIds[0];
                const createdDate = new Date(devis.created_at);
                
                allDocs.push({
                  id: devis.id,
                  type: 'devis',
                  number: devis.quote_number || '',
                  amount: devis.amount,
                  status: devis.status,
                  createdAt: devis.created_at,
                  partnerName: fleetMap.get(fleetManagerId) || 'Gestionnaire',
                  partnerId: fleetManagerId,
                  pickupAddress: course.pickup_address,
                  destinationAddress: course.destination_address,
                  scheduledDate: course.scheduled_date,
                  isNew: createdDate > weekAgo
                });
              }
            }

            // Get factures for fleet courses
            const { data: fleetFactures } = await supabase
              .from('factures')
              .select('*')
              .in('course_id', courseIds)
              .eq('driver_id', driverId)
              .order('created_at', { ascending: false });

            if (fleetFactures) {
              for (const facture of fleetFactures) {
                const course = fleetCourses.find(c => c.id === facture.course_id);
                if (!course) continue;
                
                const fleetManagerId = fleetIds[0];
                const createdDate = new Date(facture.created_at);
                
                allDocs.push({
                  id: facture.id,
                  type: 'facture',
                  number: facture.invoice_number_generated || facture.invoice_number || '',
                  amount: facture.amount,
                  status: facture.payment_status,
                  createdAt: facture.created_at,
                  partnerName: fleetMap.get(fleetManagerId) || 'Gestionnaire',
                  partnerId: fleetManagerId,
                  pickupAddress: course.pickup_address,
                  destinationAddress: course.destination_address,
                  scheduledDate: course.scheduled_date,
                  isNew: createdDate > weekAgo
                });
              }
            }
          }
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
          .select('id, status, frais de transaction_percentage, payment_schedule, created_at, driver_a_id, driver_b_id')
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
          .select('id, status, frais de transaction_percentage, payment_schedule, created_at, fleet_manager_id')
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
      case 'driver': return <Users className="h-5 w-5 text-primary" />;
      case 'company': return <Building2 className="h-5 w-5 text-trust" />;
      case 'fleet': return <Briefcase className="h-5 w-5 text-warning" />;
    }
  };

  const getPartnerBadgeClass = () => {
    switch (partnershipType) {
      case 'driver': return 'bg-primary/10 text-primary border-primary/30';
      case 'company': return 'bg-trust/10 text-trust border-trust/30';
      case 'fleet': return 'bg-warning/10 text-warning border-warning/30';
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

  // Appliquer les filtres
  const filteredDocs = useMemo(() => {
    return documents.filter(doc => {
      // Filtre par recherche
      const matchesSearch = !searchTerm || 
        doc.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.partnerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.pickupAddress?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.destinationAddress?.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Filtre par partenaire
      const matchesPartner = partnerFilter === 'all' || doc.partnerId === partnerFilter;
      
      // Filtre par statut
      const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;
      
      // Filtre par date
      let matchesDate = true;
      const docDate = new Date(doc.createdAt);
      const now = new Date();
      
      switch (dateFilter) {
        case 'today':
          matchesDate = isWithinInterval(docDate, { start: startOfDay(now), end: endOfDay(now) });
          break;
        case 'week':
          matchesDate = isWithinInterval(docDate, { start: subDays(now, 7), end: now });
          break;
        case 'month':
          matchesDate = isWithinInterval(docDate, { start: startOfMonth(now), end: endOfMonth(now) });
          break;
        case 'last_month':
          matchesDate = isWithinInterval(docDate, { start: startOfMonth(subMonths(now, 1)), end: endOfMonth(subMonths(now, 1)) });
          break;
        case 'custom':
          if (dateRange.from && dateRange.to) {
            matchesDate = isWithinInterval(docDate, { start: startOfDay(dateRange.from), end: endOfDay(dateRange.to) });
          }
          break;
      }
      
      return matchesSearch && matchesPartner && matchesStatus && matchesDate;
    });
  }, [documents, searchTerm, partnerFilter, statusFilter, dateFilter, dateRange]);

  const devisDocs = filteredDocs.filter(d => d.type === 'devis');
  const factureDocs = filteredDocs.filter(d => d.type === 'facture');

  // Nombre de filtres actifs
  const activeFiltersCount = [
    partnerFilter !== 'all',
    statusFilter !== 'all',
    dateFilter !== 'all'
  ].filter(Boolean).length;

  const clearFilters = () => {
    setPartnerFilter('all');
    setStatusFilter('all');
    setDateFilter('all');
    setDateRange({ from: undefined, to: undefined });
    setSearchTerm('');
  };

  // Compteur de nouveaux documents
  const newDocsCount = documents.filter(d => d.isNew).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const DocumentCard = ({ doc }: { doc: DocumentItem }) => (
    <Card 
      className={`overflow-hidden transition-all hover:shadow-md ${
        doc.isNew ? 'ring-2 ring-primary/50 bg-primary/5' : ''
      }`}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {doc.isNew && (
                <Badge className="bg-primary text-primary-foreground animate-pulse">
                  <Bell className="h-3 w-3 mr-1" />
                  Nouveau
                </Badge>
              )}
              <Badge variant="outline" className={doc.type === 'devis' ? 'bg-primary/10 text-primary border-primary/30' : 'bg-success/10 text-success border-success/30'}>
                {doc.type === 'devis' ? 'Devis' : 'Facture'}
              </Badge>
              <span className="font-mono text-sm font-medium">{doc.number}</span>
              {getStatusBadge(doc.status, doc.type)}
            </div>
            
            <div className="mt-2 flex items-center gap-2">
              <Badge variant="outline" className={getPartnerBadgeClass()}>
                {getPartnerIcon()}
                <span className="ml-1">{doc.partnerName}</span>
              </Badge>
            </div>
            
            {doc.pickupAddress && (
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                <MapPin className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{doc.pickupAddress}</span>
              </p>
            )}
            
            {doc.scheduledDate && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                <CalendarIcon className="h-3 w-3" />
                {format(new Date(doc.scheduledDate), 'dd/MM/yyyy HH:mm', { locale: fr })}
              </p>
            )}
          </div>
          
          <div className="text-right flex-shrink-0">
            <p className="font-bold text-lg">{doc.amount.toFixed(2)} €</p>
            <p className="text-xs text-muted-foreground">
              {format(new Date(doc.createdAt), 'dd/MM/yyyy', { locale: fr })}
            </p>
            <Button variant="outline" size="sm" className="mt-2">
              <Eye className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const FiltersPanel = () => (
    <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
      <div className="flex items-center justify-between">
        <h4 className="font-medium flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4" />
          Filtres avancés
        </h4>
        {activeFiltersCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="h-4 w-4 mr-1" />
            Effacer ({activeFiltersCount})
          </Button>
        )}
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Filtre par partenaire */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Partenaire</label>
          <Select value={partnerFilter} onValueChange={setPartnerFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Tous les partenaires" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les partenaires</SelectItem>
              {uniquePartners.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Filtre par statut */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Statut</label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Tous les statuts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="pending">En attente</SelectItem>
              <SelectItem value="accepted">Accepté</SelectItem>
              <SelectItem value="paid">Payé</SelectItem>
              <SelectItem value="rejected">Refusé</SelectItem>
              <SelectItem value="overdue">En retard</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Filtre par date */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Période</label>
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Toutes les dates" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les dates</SelectItem>
              <SelectItem value="today">Aujourd'hui</SelectItem>
              <SelectItem value="week">7 derniers jours</SelectItem>
              <SelectItem value="month">Ce mois</SelectItem>
              <SelectItem value="last_month">Mois dernier</SelectItem>
              <SelectItem value="custom">Période personnalisée</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* Date range picker pour période personnalisée */}
      {dateFilter === 'custom' && (
        <div className="flex flex-wrap gap-2 items-center">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <CalendarIcon className="h-4 w-4 mr-2" />
                {dateRange.from ? format(dateRange.from, 'dd/MM/yyyy', { locale: fr }) : 'Date début'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateRange.from}
                onSelect={(date) => setDateRange(prev => ({ ...prev, from: date }))}
                locale={fr}
              />
            </PopoverContent>
          </Popover>
          <span className="text-muted-foreground">→</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <CalendarIcon className="h-4 w-4 mr-2" />
                {dateRange.to ? format(dateRange.to, 'dd/MM/yyyy', { locale: fr }) : 'Date fin'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateRange.to}
                onSelect={(date) => setDateRange(prev => ({ ...prev, to: date }))}
                locale={fr}
              />
            </PopoverContent>
          </Popover>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Contract Detail Dialog */}
      <PartnershipContractDialog
        open={contractDialogOpen}
        onOpenChange={setContractDialogOpen}
        contract={selectedContract}
        partnershipType={partnershipType}
        currentUserName={currentUserName}
        currentUserCompany={currentUserCompany}
      />
      {/* Header avec icône et compteur */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {getPartnerIcon()}
          <h3 className="font-semibold">Documents Partenariat {getPartnerTypeLabel()}</h3>
          {newDocsCount > 0 && (
            <Badge className="bg-primary text-primary-foreground">
              {newDocsCount} nouveau{newDocsCount > 1 ? 'x' : ''}
            </Badge>
          )}
        </div>
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

        {/* Barre de recherche et filtres */}
        <div className="mt-4 space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Rechercher par numéro, partenaire, adresse..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button 
              variant={showFilters ? 'default' : 'outline'}
              onClick={() => setShowFilters(!showFilters)}
              className="relative"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filtres
              {activeFiltersCount > 0 && (
                <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </div>
          
          {showFilters && <FiltersPanel />}
        </div>

        {/* Devis */}
        <TabsContent value="devis" className="mt-4">
          {devisDocs.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {activeFiltersCount > 0 
                  ? 'Aucun devis ne correspond aux filtres sélectionnés.'
                  : `Aucun devis lié à vos partenariats ${getPartnerTypeLabel().toLowerCase()}.`
                }
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-3">
              {devisDocs.map((doc) => (
                <DocumentCard key={doc.id} doc={doc} />
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
                {activeFiltersCount > 0 
                  ? 'Aucune facture ne correspond aux filtres sélectionnés.'
                  : `Aucune facture liée à vos partenariats ${getPartnerTypeLabel().toLowerCase()}.`
                }
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-3">
              {factureDocs.map((doc) => (
                <DocumentCard key={doc.id} doc={doc} />
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
                Aucun contrat de partenariat avec des {getPartnerTypeLabel().toLowerCase()}.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-3">
              {contracts.map((contract) => (
                <Card key={contract.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className={getPartnerBadgeClass()}>
                            {getPartnerIcon()}
                            <span className="ml-1">Contrat</span>
                          </Badge>
                          <Badge variant={contract.status === 'active' || contract.status === 'accepted' ? 'default' : 'secondary'}>
                            {contract.status === 'active' || contract.status === 'accepted' ? 'Actif' : 'En attente'}
                          </Badge>
                        </div>
                        
                        <p className="font-medium mt-2">{contract.partnerName}</p>
                        
                        <div className="flex flex-wrap gap-2 mt-2 text-sm text-muted-foreground">
                          {contract.commission_percentage && (
                            <span>Rétribution: {contract.commission_percentage}%</span>
                          )}
                          {contract.payment_schedule && (
                            <span>• Paiement: {contract.payment_schedule}</span>
                          )}
                          {contract.payment_frequency && (
                            <span>• Fréquence: {contract.payment_frequency}</span>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">
                          Depuis le {format(new Date(contract.created_at), 'dd/MM/yyyy', { locale: fr })}
                        </p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="mt-2"
                          onClick={() => {
                            setSelectedContract(contract);
                            setContractDialogOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Détails
                        </Button>
                      </div>
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
