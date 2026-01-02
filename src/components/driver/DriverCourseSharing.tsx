import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Users, 
  Search, 
  Handshake, 
  Copy,
  AlertTriangle,
  Inbox,
  Send,
  Wallet,
  ChevronRight,
  Loader2
} from 'lucide-react';

// Sub-components
import { MyPartnersList } from './MyPartnersList';
import { ReceivedPartnerCourses } from './partnership/ReceivedPartnerCourses';
import { SentPartnerCourses } from './partnership/SentPartnerCourses';
import { PartnerCoursePool } from './PartnerCoursePool';
import { PushCourseToPartners } from './PushCourseToPartners';
import { PartnerSearchInline } from './PartnerSearchInline';

type TabType = 'partners' | 'search' | 'received' | 'sent' | 'balances';

interface DriverCourseSharingProps {
  initialTab?: TabType;
}

export function DriverCourseSharing({ initialTab }: DriverCourseSharingProps) {
  const { user } = useAuth();
  const [driverInfo, setDriverInfo] = useState<{ id: string; sharing_number: number | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>(initialTab || 'partners');
  const [canShare, setCanShare] = useState(true);
  
  // Stats
  const [activePartnersCount, setActivePartnersCount] = useState(0);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [receivedCoursesCount, setReceivedCoursesCount] = useState(0);
  const [sentCoursesCount, setSentCoursesCount] = useState(0);

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

    // Count active partnerships
    const { count: activeCount } = await supabase
      .from('driver_partnerships')
      .select('*', { count: 'exact', head: true })
      .or(`driver_a_id.eq.${driverInfo.id},driver_b_id.eq.${driverInfo.id}`)
      .eq('status', 'active');

    // Count pending requests (received)
    const { data: pendingData } = await supabase
      .from('driver_partnerships')
      .select('id, proposed_by')
      .or(`driver_a_id.eq.${driverInfo.id},driver_b_id.eq.${driverInfo.id}`)
      .eq('status', 'pending');

    const pendingCount = pendingData?.filter(p => p.proposed_by !== driverInfo?.id).length || 0;

    // Count received courses (pending to accept from pool + direct)
    const { count: poolCount } = await supabase
      .from('partner_course_pool')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'available')
      .gt('expires_at', new Date().toISOString());

    const { count: directPendingCount } = await supabase
      .from('shared_courses')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_driver_id', driverInfo.id)
      .eq('status', 'pending');

    // Count sent courses (pending or accepted)
    const { count: sentCount } = await supabase
      .from('shared_courses')
      .select('*', { count: 'exact', head: true })
      .eq('sender_driver_id', driverInfo.id)
      .in('status', ['pending', 'accepted']);

    setActivePartnersCount(activeCount || 0);
    setPendingRequestsCount(pendingCount);
    setReceivedCoursesCount((poolCount || 0) + (directPendingCount || 0));
    setSentCoursesCount(sentCount || 0);
  };

  // Format sharing number (6 chiffres pour sécurité)
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

  const tabs: { id: TabType; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'partners', label: 'Partenaires', icon: <Users className="h-4 w-4" />, count: activePartnersCount },
    { id: 'search', label: 'Rechercher', icon: <Search className="h-4 w-4" /> },
    { id: 'received', label: 'Reçues', icon: <Inbox className="h-4 w-4" />, count: receivedCoursesCount },
    { id: 'sent', label: 'Envoyées', icon: <Send className="h-4 w-4" />, count: sentCoursesCount },
    { id: 'balances', label: 'Soldes', icon: <Wallet className="h-4 w-4" /> },
  ];

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

      {/* Sharing Number Card - Compact mobile design */}
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

      {/* Pending requests notification */}
      {pendingRequestsCount > 0 && (
        <div 
          className="mx-1 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg cursor-pointer"
          onClick={() => setActiveTab('partners')}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
                {pendingRequestsCount} demande{pendingRequestsCount > 1 ? 's' : ''} en attente
              </span>
            </div>
            <ChevronRight className="h-4 w-4 text-amber-500" />
          </div>
        </div>
      )}

      {/* Navigation Tabs - Horizontal scroll on mobile */}
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
        {activeTab === 'partners' && <MyPartnersList />}
        {activeTab === 'search' && <PartnerSearchInline driverId={driverInfo?.id || ''} />}
        {activeTab === 'received' && (
          <ReceivedCoursesTab driverId={driverInfo?.id || null} />
        )}
        {activeTab === 'sent' && <SentPartnerCourses driverId={driverInfo?.id || null} />}
        {activeTab === 'balances' && <BalancesSummary driverId={driverInfo?.id || null} />}
      </div>
    </div>
  );
}

// New component combining pool + received courses
function ReceivedCoursesTab({ driverId }: { driverId: string | null }) {
  const [activeSubTab, setActiveSubTab] = useState<'pool' | 'received'>('pool');

  return (
    <div className="space-y-4">
      {/* Sub-tabs for pool vs received */}
      <div className="flex gap-2">
        <Button
          variant={activeSubTab === 'pool' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveSubTab('pool')}
          className="flex-1"
        >
          <Inbox className="h-4 w-4 mr-2" />
          Disponibles
        </Button>
        <Button
          variant={activeSubTab === 'received' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveSubTab('received')}
          className="flex-1"
        >
          <Send className="h-4 w-4 mr-2" />
          Acceptées
        </Button>
      </div>

      {activeSubTab === 'pool' && <PartnerCoursePool />}
      {activeSubTab === 'received' && <ReceivedPartnerCourses driverId={driverId} />}
    </div>
  );
}

// Separate component for balances summary with smart payment
function BalancesSummary({ driverId }: { driverId: string | null }) {
  const [balances, setBalances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (driverId) {
      loadBalances();
    }
  }, [driverId]);

  const loadBalances = async () => {
    setLoading(true);
    try {
      // Get all active partnerships
      const { data: partnerships } = await supabase
        .from('driver_partnerships')
        .select('*')
        .or(`driver_a_id.eq.${driverId},driver_b_id.eq.${driverId}`)
        .eq('status', 'active');

      const balanceData = [];
      for (const p of partnerships || []) {
        const partnerId = p.driver_a_id === driverId ? p.driver_b_id : p.driver_a_id;
        
        // Get partner info
        const { data: driverData } = await supabase
          .from('drivers')
          .select('user_id, company_name, sharing_number')
          .eq('id', partnerId)
          .single();

        if (driverData) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, profile_photo_url, phone')
            .eq('id', driverData.user_id)
            .single();

          // Get balance
          const { data: balance } = await supabase.rpc('get_partnership_balance', {
            _partnership_id: p.id,
            _driver_id: driverId
          });

          const displayName = profile?.full_name || driverData.company_name || 'Chauffeur partenaire';
          balanceData.push({
            partnershipId: p.id,
            partnerId,
            partnerName: displayName,
            partnerPhoto: profile?.profile_photo_url,
            companyName: driverData.company_name,
            sharingNumber: driverData.sharing_number,
            phone: profile?.phone,
            balance: balance?.[0] || null,
            commissionPercentage: p.commission_percentage,
            paymentSchedule: p.payment_schedule,
          });
        }
      }
      setBalances(balanceData);
    } catch (error) {
      console.error('Error loading balances:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate totals - must be before any conditional return to maintain hooks order
  const totalOwed = balances.reduce((acc, b) => {
    if (b.balance?.net_balance > 0) return acc + b.balance.net_balance;
    return acc;
  }, 0);

  const totalDue = balances.reduce((acc, b) => {
    if (b.balance?.net_balance < 0) return acc + Math.abs(b.balance.net_balance);
    return acc;
  }, 0);

  // Smart net calculation: what you need to pay or receive globally
  const netGlobal = totalOwed - totalDue;

  // Filter balances by search - must be before conditional returns
  const filteredBalances = useMemo(() => {
    if (!searchQuery.trim()) return balances;
    const query = searchQuery.toLowerCase();
    return balances.filter((b: any) => 
      b.partnerName.toLowerCase().includes(query) ||
      b.companyName?.toLowerCase().includes(query) ||
      (b.sharingNumber && `SOLO-${String(b.sharingNumber).padStart(6, '0')}`.toLowerCase().includes(query))
    );
  }, [balances, searchQuery]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (balances.length === 0) {
    return (
      <Alert>
        <Wallet className="h-4 w-4" />
        <AlertDescription>
          Aucun partenariat actif. Les soldes apparaîtront ici une fois que vous aurez des partenaires.
        </AlertDescription>
      </Alert>
    );
  }

  const getPaymentScheduleLabel = (schedule: string) => {
    switch (schedule) {
      case 'per_course': return 'Par course';
      case 'weekly': return 'Hebdomadaire';
      case 'monthly': return 'Mensuel';
      default: return schedule;
    }
  };

  return (
    <div className="space-y-4">
      {/* Smart net balance card */}
      <Card className={`${netGlobal > 0 ? 'bg-red-500/10 border-red-500/30' : netGlobal < 0 ? 'bg-green-500/10 border-green-500/30' : 'bg-muted/50'}`}>
        <CardContent className="p-4">
          <div className="text-center">
            <p className="text-sm font-medium text-muted-foreground mb-1">Solde net global</p>
            {netGlobal > 0 ? (
              <>
                <p className="text-3xl font-bold text-red-600">-{netGlobal.toFixed(2)} €</p>
                <p className="text-sm text-red-600 mt-1">Vous devez payer ce montant</p>
              </>
            ) : netGlobal < 0 ? (
              <>
                <p className="text-3xl font-bold text-green-600">+{Math.abs(netGlobal).toFixed(2)} €</p>
                <p className="text-sm text-green-600 mt-1">Vous devez recevoir ce montant</p>
              </>
            ) : (
              <>
                <p className="text-3xl font-bold text-muted-foreground">0.00 €</p>
                <p className="text-sm text-muted-foreground mt-1">Tous les comptes sont équilibrés</p>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Individual balances summary */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-red-500/5 border-red-500/20">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-red-600 dark:text-red-400 font-medium">Vous devez</p>
            <p className="text-xl font-bold text-red-600 dark:text-red-400">{totalOwed.toFixed(2)} €</p>
          </CardContent>
        </Card>
        <Card className="bg-green-500/5 border-green-500/20">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-green-600 dark:text-green-400 font-medium">On vous doit</p>
            <p className="text-xl font-bold text-green-600 dark:text-green-400">{totalDue.toFixed(2)} €</p>
          </CardContent>
        </Card>
      </div>

      {/* Explanation of smart payment */}
      <Alert className="bg-blue-500/10 border-blue-500/30">
        <AlertDescription className="text-sm">
          <strong>💡 Paiement intelligent :</strong> Les montants se compensent automatiquement. 
          Seul le solde net final doit être réglé entre partenaires.
        </AlertDescription>
      </Alert>

      {/* Search filter */}
      {balances.length > 2 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un partenaire..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      )}

      {/* Partner balances list */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-muted-foreground">Détail par partenaire</h3>
          {searchQuery && (
            <Badge variant="outline" className="text-xs">
              {filteredBalances.length} / {balances.length}
            </Badge>
          )}
        </div>
        {filteredBalances.map((item: any, index: number) => (
          <Card key={index} className="overflow-hidden">
            <CardContent className="p-0">
              {/* Partner header */}
              <div className="p-3 flex items-center gap-3 border-b bg-muted/30">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={item.partnerPhoto || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {item.partnerName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{item.partnerName}</p>
                  {item.companyName && item.companyName !== item.partnerName && (
                    <p className="text-xs text-muted-foreground truncate">{item.companyName}</p>
                  )}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                    {item.sharingNumber && (
                      <span className="font-mono text-primary">SOLO-{String(item.sharingNumber).padStart(6, '0')}</span>
                    )}
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {item.commissionPercentage}%
                    </Badge>
                    <span className="text-[10px]">{getPaymentScheduleLabel(item.paymentSchedule)}</span>
                  </div>
                </div>
              </div>

              {/* Balance details */}
              {item.balance && (
                <div className="p-3 space-y-2">
                  {/* Courses exchanged */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 bg-green-500/10 rounded">
                      <p className="text-muted-foreground">Courses envoyées</p>
                      <p className="font-semibold">{item.balance.courses_sent || 0}</p>
                      <p className="text-green-600">+{(item.balance.total_sent_commission || 0).toFixed(2)} €</p>
                    </div>
                    <div className="p-2 bg-red-500/10 rounded">
                      <p className="text-muted-foreground">Courses reçues</p>
                      <p className="font-semibold">{item.balance.courses_received || 0}</p>
                      <p className="text-red-600">-{(item.balance.total_received_commission || 0).toFixed(2)} €</p>
                    </div>
                  </div>

                  {/* Net balance for this partner */}
                  <div className={`p-3 rounded-lg text-center ${
                    item.balance.net_balance > 0 
                      ? 'bg-red-500/10' 
                      : item.balance.net_balance < 0 
                      ? 'bg-green-500/10' 
                      : 'bg-muted/50'
                  }`}>
                    {item.balance.net_balance > 0 ? (
                      <>
                        <p className="text-xs text-red-600 font-medium">Vous devez à {item.partnerName.split(' ')[0]}</p>
                        <p className="text-lg font-bold text-red-600">{item.balance.net_balance.toFixed(2)} €</p>
                      </>
                    ) : item.balance.net_balance < 0 ? (
                      <>
                        <p className="text-xs text-green-600 font-medium">{item.partnerName.split(' ')[0]} vous doit</p>
                        <p className="text-lg font-bold text-green-600">{Math.abs(item.balance.net_balance).toFixed(2)} €</p>
                      </>
                    ) : (
                      <>
                        <p className="text-xs text-muted-foreground font-medium">Solde</p>
                        <p className="text-lg font-bold text-muted-foreground">Équilibré</p>
                      </>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
