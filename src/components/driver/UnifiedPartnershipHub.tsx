import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Users, 
  Settings,
  AlertTriangle,
  Loader2
} from 'lucide-react';

// Sub-components
import { DriverPartnershipsTab } from './partnership/DriverPartnershipsTab';
import { PartnershipSettings } from './partnership/PartnershipSettings';
import { PartnershipStripeGate } from './partnership/PartnershipStripeGate';
import { useStripeConnectStatus } from '@/hooks/useStripeConnectStatus';
import { useDriverPremium } from '@/hooks/useDriverPremium';
import { PremiumGate } from '@/components/premium/PremiumGate';

type MainTab = 'drivers' | 'settings';

interface UnifiedPartnershipHubProps {
  initialDriverSubTab?: 'list' | 'search' | 'received' | 'sent' | 'payments' | 'invoices';
}

export function UnifiedPartnershipHub({ initialDriverSubTab }: UnifiedPartnershipHubProps = {}) {
  const { user } = useAuth();
  const { isPremium, loading: premiumLoading } = useDriverPremium();
  const [driverInfo, setDriverInfo] = useState<{ id: string; sharing_number: number | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [mainTab, setMainTab] = useState<MainTab>('drivers');
  const [canShare, setCanShare] = useState(true);
  
  // Stats for badges
  const [driverPartnersCount, setDriverPartnersCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);

  // Stripe Connect status check
  const { status: stripeStatus, loading: stripeLoading, isReady: stripeReady, isPending: stripePending, refresh: refreshStripe } = useStripeConnectStatus(driverInfo?.id);

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

    const { count: driverPending } = await supabase
      .from('driver_partnerships')
      .select('*', { count: 'exact', head: true })
      .or(`driver_a_id.eq.${driverInfo.id},driver_b_id.eq.${driverInfo.id}`)
      .eq('status', 'pending');

    setDriverPartnersCount(driverPending || 0);
    setPendingCount(driverPending || 0);
  };

  if (loading || stripeLoading || premiumLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isPremium) {
    return (
      <PremiumGate 
        isPremium={false} 
        featureName="Partenariats & Partage de courses" 
        featureDescription="Échangez des courses avec d'autres chauffeurs, gérez vos partenariats et gagnez des frais de transaction."
      />
    );
  }

  // Stripe Connect gate: show onboarding page if not connected
  if (!stripeReady) {
    const gateStatus = stripePending ? 'pending' : 'not_connected';
    return (
      <div className="space-y-4 pb-20">
        <PartnershipStripeGate 
          driverId={driverInfo?.id || ''} 
          stripeStatus={gateStatus}
          onRefresh={refreshStripe}
        />
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
        <Card 
          className="bg-warning/10 border-warning/30 cursor-pointer hover:bg-warning/20 transition-colors"
          onClick={() => setMainTab('drivers')}
        >
          <CardContent className="py-3 px-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-warning rounded-full animate-pulse" />
                <span className="text-sm font-medium text-warning">
                  {pendingCount} demande{pendingCount > 1 ? 's' : ''} en attente de réponse
                </span>
              </div>
              <span className="text-xs text-warning/80 underline hover:text-warning">
                Voir les demandes →
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Navigation */}
      <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as MainTab)}>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-2">
            <TabsList className="flex w-full h-auto bg-transparent gap-1">
              <TabsTrigger 
                value="drivers" 
                className="relative flex-1 min-w-0 flex flex-col items-center gap-1 py-2 px-2 rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:border-primary/50 border border-transparent transition-all"
              >
                <Users className="h-5 w-5 text-primary" />
                <span className="text-xs font-medium truncate">Réseau de Partage</span>
                {driverPartnersCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 min-w-5 px-1 text-[10px] bg-orange-500 hover:bg-orange-500">
                    {driverPartnersCount}
                  </Badge>
                )}
              </TabsTrigger>
              
              <TabsTrigger 
                value="settings" 
                className="relative flex-1 min-w-0 flex flex-col items-center gap-1 py-2 px-2 rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:border-primary/50 border border-transparent transition-all"
              >
                <Settings className="h-5 w-5 text-muted-foreground" />
                <span className="text-xs font-medium truncate">Paramètres</span>
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

        {/* Settings */}
        <TabsContent value="settings" className="mt-4">
          <PartnershipSettings driverId={driverInfo?.id || null} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
