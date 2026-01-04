import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Users, 
  Building2, 
  Briefcase,
  Settings,
  AlertTriangle,
  Loader2
} from 'lucide-react';

// Sub-components
import { DriverPartnershipsTab } from './partnership/DriverPartnershipsTab';
import { CompanyPartnershipsTab } from './partnership/CompanyPartnershipsTab';
import { FleetPartnershipsTab } from './partnership/FleetPartnershipsTab';
import { PartnershipSettings } from './partnership/PartnershipSettings';

type MainTab = 'drivers' | 'companies' | 'fleets' | 'settings';

interface UnifiedPartnershipHubProps {
  initialDriverSubTab?: 'list' | 'search' | 'received' | 'sent' | 'payments' | 'invoices';
}

export function UnifiedPartnershipHub({ initialDriverSubTab }: UnifiedPartnershipHubProps = {}) {
  const { user } = useAuth();
  const [driverInfo, setDriverInfo] = useState<{ id: string; sharing_number: number | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [mainTab, setMainTab] = useState<MainTab>('drivers');
  const [canShare, setCanShare] = useState(true);
  const [isFleetDriver, setIsFleetDriver] = useState(false);
  
  // Stats for badges
  const [driverPartnersCount, setDriverPartnersCount] = useState(0);
  const [companyAgreementsCount, setCompanyAgreementsCount] = useState(0);
  const [fleetPartnershipsCount, setFleetPartnershipsCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);

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
      .select('id, sharing_number, is_fleet_driver, fleet_manager_id')
      .eq('user_id', user?.id)
      .single();

    if (error) {
      console.error('Error loading driver info:', error);
      setLoading(false);
      return;
    }
    setDriverInfo(data);
    setIsFleetDriver(data.is_fleet_driver || data.fleet_manager_id !== null);
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
      .eq('status', 'accepted');

    // Count fleet partnerships  
    const { count: fleetCount } = await supabase
      .from('fleet_driver_partnerships')
      .select('*', { count: 'exact', head: true })
      .eq('driver_id', driverInfo.id)
      .eq('status', 'accepted');

    // Pending requests across all types
    const { count: driverPending } = await supabase
      .from('driver_partnerships')
      .select('*', { count: 'exact', head: true })
      .or(`driver_a_id.eq.${driverInfo.id},driver_b_id.eq.${driverInfo.id}`)
      .eq('status', 'pending');

    const { count: companyPending } = await supabase
      .from('company_driver_agreements')
      .select('*', { count: 'exact', head: true })
      .eq('driver_id', driverInfo.id)
      .eq('status', 'pending');

    const { count: fleetPending } = await supabase
      .from('fleet_driver_partnerships')
      .select('*', { count: 'exact', head: true })
      .eq('driver_id', driverInfo.id)
      .eq('status', 'pending');

    setDriverPartnersCount(driverCount || 0);
    setCompanyAgreementsCount(companyCount || 0);
    setFleetPartnershipsCount(fleetCount || 0);
    setPendingCount((driverPending || 0) + (companyPending || 0) + (fleetPending || 0));
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
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            Le partage est actuellement bloqué pour votre compte. Contactez l'administration.
          </AlertDescription>
        </Alert>
      )}

      {/* Pending requests notification */}
      {pendingCount > 0 && (
        <Card className="bg-warning/10 border-warning/30">
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-warning rounded-full animate-pulse" />
              <span className="text-sm font-medium text-warning">
                {pendingCount} demande{pendingCount > 1 ? 's' : ''} en attente de réponse
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Navigation - Grid 2x2 for better visibility */}
      <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as MainTab)}>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-3">
            <TabsList className="grid grid-cols-2 gap-3 w-full h-auto bg-transparent">
              {/* Row 1 */}
              <TabsTrigger 
                value="drivers" 
                className="relative flex flex-col items-center gap-2 py-4 px-3 rounded-xl bg-muted/50 hover:bg-muted data-[state=active]:bg-primary/10 data-[state=active]:border-primary/50 border border-transparent transition-all"
                disabled={isFleetDriver}
              >
                <div className="relative">
                  <Users className="h-7 w-7 text-primary" />
                  {driverPartnersCount > 0 && (
                    <Badge 
                      variant="default" 
                      className="absolute -top-2 -right-3 h-5 min-w-5 px-1.5 text-[10px] bg-orange-500 hover:bg-orange-500"
                    >
                      {driverPartnersCount}
                    </Badge>
                  )}
                </div>
                <span className="text-sm font-medium">Chauffeurs</span>
              </TabsTrigger>
              
              <TabsTrigger 
                value="companies" 
                className="relative flex flex-col items-center gap-2 py-4 px-3 rounded-xl bg-muted/50 hover:bg-muted data-[state=active]:bg-primary/10 data-[state=active]:border-primary/50 border border-transparent transition-all"
                disabled={isFleetDriver}
              >
                <div className="relative">
                  <Building2 className="h-7 w-7 text-blue-400" />
                  {companyAgreementsCount > 0 && (
                    <Badge 
                      variant="default" 
                      className="absolute -top-2 -right-3 h-5 min-w-5 px-1.5 text-[10px] bg-blue-500 hover:bg-blue-500"
                    >
                      {companyAgreementsCount}
                    </Badge>
                  )}
                </div>
                <span className="text-sm font-medium">Entreprises</span>
              </TabsTrigger>

              {/* Row 2 */}
              <TabsTrigger 
                value="fleets" 
                className="relative flex flex-col items-center gap-2 py-4 px-3 rounded-xl bg-muted/50 hover:bg-muted data-[state=active]:bg-primary/10 data-[state=active]:border-primary/50 border border-transparent transition-all"
                disabled={isFleetDriver}
              >
                <div className="relative">
                  <Briefcase className="h-7 w-7 text-emerald-400" />
                  {fleetPartnershipsCount > 0 && (
                    <Badge 
                      variant="default" 
                      className="absolute -top-2 -right-3 h-5 min-w-5 px-1.5 text-[10px] bg-emerald-500 hover:bg-emerald-500"
                    >
                      {fleetPartnershipsCount}
                    </Badge>
                  )}
                </div>
                <span className="text-sm font-medium">Flottes</span>
              </TabsTrigger>
              
              <TabsTrigger 
                value="settings" 
                className="relative flex flex-col items-center gap-2 py-4 px-3 rounded-xl bg-muted/50 hover:bg-muted data-[state=active]:bg-primary/10 data-[state=active]:border-primary/50 border border-transparent transition-all"
              >
                <Settings className="h-7 w-7 text-muted-foreground" />
                <span className="text-sm font-medium">Paramètres</span>
              </TabsTrigger>
            </TabsList>
          </CardContent>
        </Card>

        {/* Driver Partnerships */}
        <TabsContent value="drivers" className="mt-4">
          {driverInfo?.id && (
            <DriverPartnershipsTab 
              driverId={driverInfo.id} 
              initialSubTab={initialDriverSubTab}
            />
          )}
        </TabsContent>

        {/* Company Partnerships */}
        <TabsContent value="companies" className="mt-4">
          {driverInfo?.id && (
            <CompanyPartnershipsTab driverId={driverInfo.id} />
          )}
        </TabsContent>

        {/* Fleet Partnerships */}
        <TabsContent value="fleets" className="mt-4">
          {driverInfo?.id && (
            <FleetPartnershipsTab driverId={driverInfo.id} />
          )}
        </TabsContent>

        {/* Settings */}
        <TabsContent value="settings" className="mt-4">
          <PartnershipSettings driverId={driverInfo?.id || null} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
