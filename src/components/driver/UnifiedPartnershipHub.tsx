import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Users, 
  Search, 
  Handshake, 
  Copy,
  AlertTriangle,
  Car,
  Send,
  Wallet,
  Building2,
  Briefcase,
  Loader2
} from 'lucide-react';

// Sub-components
import { MyPartnersList } from './MyPartnersList';
import { PartnerCoursePool } from './PartnerCoursePool';
import { PushCourseToPartners } from './PushCourseToPartners';
import { DriverPartnerSearch } from './DriverPartnerSearch';
import { CompanyPartnerSearch } from './CompanyPartnerSearch';
import { FleetPartnerSearch } from './FleetPartnerSearch';
import { PartnershipBalances } from './PartnershipBalances';
import { SharingAvailabilityToggle } from './SharingAvailabilityToggle';

type MainTab = 'partners' | 'search' | 'courses' | 'balances';
type SearchTab = 'drivers' | 'companies' | 'fleets';

export function UnifiedPartnershipHub() {
  const { user } = useAuth();
  const [driverInfo, setDriverInfo] = useState<{ id: string; sharing_number: number | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [mainTab, setMainTab] = useState<MainTab>('partners');
  const [searchTab, setSearchTab] = useState<SearchTab>('drivers');
  const [canShare, setCanShare] = useState(true);
  
  // Stats
  const [activePartnersCount, setActivePartnersCount] = useState(0);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [availableCoursesCount, setAvailableCoursesCount] = useState(0);

  useEffect(() => {
    if (user?.id) {
      loadDriverInfo();
    }
  }, [user?.id]);

  useEffect(() => {
    if (driverInfo?.id) {
      checkSharingAccess();
      loadStats();
    }
  }, [driverInfo?.id]);

  const loadDriverInfo = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('drivers')
      .select('id, sharing_number')
      .eq('user_id', user?.id)
      .single();

    if (error) {
      console.error('Error loading driver info:', error);
      setLoading(false);
      return;
    }
    setDriverInfo(data);
    setLoading(false);
  };

  const checkSharingAccess = async () => {
    if (!driverInfo?.id) return;
    const { data } = await supabase.rpc('can_share_courses', { _driver_id: driverInfo.id });
    setCanShare(data ?? true);
  };

  const loadStats = async () => {
    if (!driverInfo?.id) return;

    // Count active driver partnerships
    const { count: driverCount } = await supabase
      .from('driver_partnerships')
      .select('*', { count: 'exact', head: true })
      .or(`driver_a_id.eq.${driverInfo.id},driver_b_id.eq.${driverInfo.id}`)
      .eq('status', 'active');

    // Count company agreements
    const { count: companyCount } = await supabase
      .from('company_driver_agreements')
      .select('*', { count: 'exact', head: true })
      .eq('driver_id', driverInfo.id)
      .eq('status', 'active');

    // Count fleet partnerships  
    const { count: fleetCount } = await supabase
      .from('fleet_driver_partnerships')
      .select('*', { count: 'exact', head: true })
      .eq('driver_id', driverInfo.id)
      .eq('status', 'active');

    // Pending requests (driver partnerships received)
    const { data: pendingData } = await supabase
      .from('driver_partnerships')
      .select('id, proposed_by')
      .or(`driver_a_id.eq.${driverInfo.id},driver_b_id.eq.${driverInfo.id}`)
      .eq('status', 'pending');

    const pendingCount = pendingData?.filter(p => p.proposed_by !== driverInfo?.id).length || 0;

    // Count available courses in pool
    const { count: poolCount } = await supabase
      .from('partner_course_pool')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'available')
      .gt('expires_at', new Date().toISOString());

    setActivePartnersCount((driverCount || 0) + (companyCount || 0) + (fleetCount || 0));
    setPendingRequestsCount(pendingCount);
    setAvailableCoursesCount(poolCount || 0);
  };

  const formattedSharingNumber = driverInfo?.sharing_number 
    ? `SOLO-${String(driverInfo.sharing_number).padStart(6, '0')}` 
    : null;

  const copyToClipboard = () => {
    if (formattedSharingNumber) {
      navigator.clipboard.writeText(formattedSharingNumber);
      toast.success('Numéro copié !');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20">
      {/* Warning banner if sharing is blocked */}
      {!canShare && (
        <Alert variant="destructive" className="mx-1">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            Le partage est actuellement bloqué pour votre compte. Contactez l'administration.
          </AlertDescription>
        </Alert>
      )}

      {/* Sharing Number Card */}
      <Card className="mx-1 bg-gradient-to-br from-primary/10 via-background to-primary/5 border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <Handshake className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">Votre N° de Partage</p>
              <p className="text-xs text-muted-foreground truncate">Partagez-le pour créer un partenariat</p>
            </div>
          </div>
          
          <div className="mt-3 flex items-center gap-2">
            <div className="flex-1 bg-background/80 backdrop-blur rounded-lg px-4 py-2.5 border border-border/50">
              <span className="font-mono text-xl font-bold tracking-wider text-primary">
                {formattedSharingNumber || '---'}
              </span>
            </div>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={copyToClipboard}
              className="h-11 w-11 shrink-0"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Availability Toggle */}
      <div className="mx-1">
        <SharingAvailabilityToggle />
      </div>

      {/* Pending requests notification */}
      {pendingRequestsCount > 0 && (
        <div 
          className="mx-1 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg cursor-pointer"
          onClick={() => setMainTab('partners')}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
                {pendingRequestsCount} demande{pendingRequestsCount > 1 ? 's' : ''} en attente
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main Navigation Tabs */}
      <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as MainTab)} className="mx-1">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="partners" className="text-xs gap-1">
            <Users className="h-3.5 w-3.5" />
            Partenaires
            {activePartnersCount > 0 && (
              <Badge variant="secondary" className="h-4 min-w-4 px-1 text-[10px]">
                {activePartnersCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="search" className="text-xs gap-1">
            <Search className="h-3.5 w-3.5" />
            Rechercher
          </TabsTrigger>
          <TabsTrigger value="courses" className="text-xs gap-1">
            <Car className="h-3.5 w-3.5" />
            Courses
            {availableCoursesCount > 0 && (
              <Badge variant="secondary" className="h-4 min-w-4 px-1 text-[10px]">
                {availableCoursesCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="balances" className="text-xs gap-1">
            <Wallet className="h-3.5 w-3.5" />
            Soldes
          </TabsTrigger>
        </TabsList>

        {/* Partners Tab */}
        <TabsContent value="partners" className="mt-4">
          <MyPartnersList />
        </TabsContent>

        {/* Search Tab with Sub-tabs */}
        <TabsContent value="search" className="mt-4 space-y-4">
          <Tabs value={searchTab} onValueChange={(v) => setSearchTab(v as SearchTab)}>
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="drivers" className="text-xs gap-1">
                <Users className="h-3.5 w-3.5" />
                Chauffeurs
              </TabsTrigger>
              <TabsTrigger value="companies" className="text-xs gap-1">
                <Building2 className="h-3.5 w-3.5" />
                Entreprises
              </TabsTrigger>
              <TabsTrigger value="fleets" className="text-xs gap-1">
                <Briefcase className="h-3.5 w-3.5" />
                Flottes
              </TabsTrigger>
            </TabsList>

            <TabsContent value="drivers" className="mt-4">
              <DriverPartnerSearch driverId={driverInfo?.id || ''} />
            </TabsContent>

            <TabsContent value="companies" className="mt-4">
              <CompanyPartnerSearch driverId={driverInfo?.id || ''} />
            </TabsContent>

            <TabsContent value="fleets" className="mt-4">
              <FleetPartnerSearch driverId={driverInfo?.id || ''} />
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* Courses Tab */}
        <TabsContent value="courses" className="mt-4 space-y-4">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Send className="h-4 w-4" />
                Proposer une course
              </h3>
              <PushCourseToPartners />
            </div>
            
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Car className="h-4 w-4" />
                Courses disponibles
              </h3>
              <PartnerCoursePool />
            </div>
          </div>
        </TabsContent>

        {/* Balances Tab */}
        <TabsContent value="balances" className="mt-4">
          <PartnershipBalances driverId={driverInfo?.id || null} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
