import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Users, Search, Handshake, Copy, AlertTriangle, Inbox, Send, 
  Heart, ChevronRight, Loader2, Globe
} from 'lucide-react';

// Sub-components
import { FavoriteDriversList } from './FavoriteDriversList';
import { ReceivedPartnerCourses } from '../partnership/ReceivedPartnerCourses';
import { SentPartnerCourses } from '../partnership/SentPartnerCourses';
import { PartnerCoursePool } from './PartnerCoursePool';
import { useDriverPremium } from '@/hooks/useDriverPremium';
import { PremiumGate } from '@/components/premium/PremiumGate';

type TabType = 'favorites' | 'pool' | 'received' | 'sent';

interface DriverCourseSharingProps {
  initialTab?: TabType;
}

export function DriverCourseSharing({ initialTab }: DriverCourseSharingProps) {
  const { user } = useAuth();
  const { isPremium, loading: premiumLoading } = useDriverPremium();
  const [driverInfo, setDriverInfo] = useState<{ id: string; sharing_number: number | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>(initialTab || 'pool');
  const [canShare, setCanShare] = useState(true);
  
  // Stats
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [poolCount, setPoolCount] = useState(0);
  const [receivedCount, setReceivedCount] = useState(0);
  const [sentCount, setSentCount] = useState(0);

  useEffect(() => {
    if (user?.id) loadDriverInfo();
  }, [user?.id]);

  useEffect(() => {
    if (driverInfo?.id) {
      checkSharingAccess();
      loadStats();
    }
  }, [driverInfo?.id]);

  const loadDriverInfo = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('drivers')
      .select('id, sharing_number')
      .eq('user_id', user?.id)
      .single();

    if (data) setDriverInfo(data);
    setLoading(false);
  };

  const checkSharingAccess = async () => {
    if (!driverInfo?.id) return;
    const { data } = await supabase.rpc('can_share_courses', { _driver_id: driverInfo.id });
    setCanShare(data ?? true);
  };

  const loadStats = async () => {
    if (!driverInfo?.id) return;

    const { count: favCount } = await supabase
      .from('driver_favorites')
      .select('*', { count: 'exact', head: true })
      .eq('driver_id', driverInfo.id);

    const { count: poolAvailable } = await supabase
      .from('partner_course_pool')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'available')
      .neq('sender_driver_id', driverInfo.id);

    const { count: directPending } = await supabase
      .from('shared_courses')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_driver_id', driverInfo.id)
      .eq('status', 'pending');

    const { count: sentActive } = await supabase
      .from('shared_courses')
      .select('*', { count: 'exact', head: true })
      .eq('sender_driver_id', driverInfo.id)
      .in('status', ['pending', 'accepted']);

    setFavoritesCount(favCount || 0);
    setPoolCount((poolAvailable || 0) + (directPending || 0));
    setReceivedCount(directPending || 0);
    setSentCount(sentActive || 0);
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

  if (loading || premiumLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  // Free users can see pool & received courses, but not favorites or sent
  const tabs: { id: TabType; label: string; icon: React.ReactNode; count?: number }[] = isPremium
    ? [
        { id: 'pool', label: 'Disponibles', icon: <Globe className="h-4 w-4" />, count: poolCount },
        { id: 'favorites', label: 'Favoris', icon: <Heart className="h-4 w-4" />, count: favoritesCount },
        { id: 'received', label: 'Reçues', icon: <Inbox className="h-4 w-4" />, count: receivedCount },
        { id: 'sent', label: 'Envoyées', icon: <Send className="h-4 w-4" />, count: sentCount },
      ]
    : [
        { id: 'pool', label: 'Disponibles', icon: <Globe className="h-4 w-4" />, count: poolCount },
        { id: 'received', label: 'Reçues', icon: <Inbox className="h-4 w-4" />, count: receivedCount },
      ];

  return (
    <div className="space-y-4 pb-20">
      {!canShare && (
        <Alert variant="destructive" className="mx-1">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            Le partage est actuellement bloqué pour votre compte. Contactez l'administration.
          </AlertDescription>
        </Alert>
      )}

      {/* Info banner for free users */}
      {!isPremium && (
        <Alert className="mx-1 border-primary/30 bg-primary/5">
          <Globe className="h-4 w-4 text-primary" />
          <AlertDescription className="text-sm">
            <strong>Vous pouvez recevoir et accepter des courses partagées.</strong> Pour partager vos propres courses et gagner des rétributions, passez en Premium.
          </AlertDescription>
        </Alert>
      )}

      {/* Sharing Number Card - only for premium */}
      {isPremium && (
        <Card className="mx-1 bg-gradient-to-br from-primary/10 via-background to-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10">
                <Handshake className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">Votre N° de Partage</p>
                <p className="text-xs text-muted-foreground truncate">Partagez-le pour être ajouté en favori</p>
              </div>
            </div>
            
            <div className="mt-3 flex items-center gap-2">
              <div className="flex-1 bg-background/80 backdrop-blur rounded-lg px-4 py-2.5 border border-border/50">
                <span className="font-mono text-xl font-bold tracking-wider text-primary">
                  {formattedSharingNumber || '---'}
                </span>
              </div>
              <Button variant="outline" size="icon" onClick={copyToClipboard} className="h-11 w-11 shrink-0">
                <Copy className="h-4 w-4" />
              </Button>
            </div>

            {/* Commission info */}
            <div className="mt-3 p-2 bg-background/60 rounded-lg border border-border/30">
              <p className="text-xs text-muted-foreground">
                <strong>Commissions :</strong> 15% (&lt;30€) / 20% (≥30€) • Frais : 0.25€/course
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation Tabs */}
      <div className="mx-1">
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium
                whitespace-nowrap transition-all shrink-0
                ${activeTab === tab.id
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                }
              `}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <Badge 
                  variant={activeTab === tab.id ? 'secondary' : 'outline'} 
                  className={`h-5 min-w-5 px-1.5 text-xs ${activeTab === tab.id ? 'bg-primary-foreground/20 text-primary-foreground' : ''}`}
                >
                  {tab.count}
                </Badge>
              )}
            </button>
          ))}
        </div>
      </div>

      <Separator className="mx-1" />

      {/* Tab Content */}
      <div className="mx-1">
        {activeTab === 'pool' && <PartnerCoursePool driverId={driverInfo?.id || ''} />}
        {activeTab === 'favorites' && <FavoriteDriversList />}
        {activeTab === 'received' && <ReceivedPartnerCourses driverId={driverInfo?.id || null} />}
        {activeTab === 'sent' && <SentPartnerCourses driverId={driverInfo?.id || null} />}
      </div>
    </div>
  );
}
