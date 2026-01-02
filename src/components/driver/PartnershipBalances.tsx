import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Wallet, Loader2, Search, Filter } from 'lucide-react';

interface Props {
  driverId: string | null;
}

interface BalanceItem {
  partnershipId: string;
  partnerId: string;
  partnerName: string;
  partnerPhoto: string | null;
  companyName: string | null;
  sharingNumber: number | null;
  phone: string | null;
  balance: any;
  commissionPercentage: number;
  paymentSchedule: string;
  type: 'driver' | 'company' | 'fleet';
}

export function PartnershipBalances({ driverId }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [balances, setBalances] = useState<BalanceItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (driverId) {
      loadBalances();
    }
  }, [driverId]);

  const loadBalances = async () => {
    setLoading(true);
    try {
      // Get driver partnerships
      const { data: driverPartnerships } = await supabase
        .from('driver_partnerships')
        .select('*')
        .or(`driver_a_id.eq.${driverId},driver_b_id.eq.${driverId}`)
        .eq('status', 'active');

      const balanceData: BalanceItem[] = [];

      // Process driver partnerships
      for (const p of driverPartnerships || []) {
        const partnerId = p.driver_a_id === driverId ? p.driver_b_id : p.driver_a_id;
        
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
            type: 'driver',
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

  const getPaymentScheduleLabel = (schedule: string) => {
    switch (schedule) {
      case 'per_course': return 'Par course';
      case 'weekly': return 'Hebdomadaire';
      case 'monthly': return 'Mensuel';
      default: return schedule;
    }
  };

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

  // Calculate totals
  const totalOwed = balances.reduce((acc, b) => {
    if (b.balance?.net_balance > 0) return acc + b.balance.net_balance;
    return acc;
  }, 0);

  const totalDue = balances.reduce((acc, b) => {
    if (b.balance?.net_balance < 0) return acc + Math.abs(b.balance.net_balance);
    return acc;
  }, 0);

  const netGlobal = totalOwed - totalDue;

  // Filter balances by search
  const filteredBalances = useMemo(() => {
    if (!searchQuery.trim()) return balances;
    const query = searchQuery.toLowerCase();
    return balances.filter(b => 
      b.partnerName.toLowerCase().includes(query) ||
      b.companyName?.toLowerCase().includes(query) ||
      (b.sharingNumber && `SOLO-${String(b.sharingNumber).padStart(6, '0')}`.toLowerCase().includes(query))
    );
  }, [balances, searchQuery]);

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

      {/* Smart payment explanation */}
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
        {filteredBalances.map((item, index) => (
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
                      <p className="text-xs text-muted-foreground font-medium">Équilibré</p>
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
