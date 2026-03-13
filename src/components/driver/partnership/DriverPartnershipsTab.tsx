import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  UsersRound, Inbox, Send, Handshake, CreditCard, Receipt, Bell, ArrowRight, Heart, Globe
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { usePartnershipNotificationCount } from '@/hooks/usePartnershipNotificationCount';

// Sub-components
import { FavoriteDriversList } from '../sharing/FavoriteDriversList';
import { PartnerCoursePool } from '../sharing/PartnerCoursePool';
import { ReceivedPartnerCourses } from './ReceivedPartnerCourses';
import { SentPartnerCourses } from './SentPartnerCourses';
import { PartnerInvoicesList } from './PartnerInvoicesList';
import { PartnerPaymentsManager } from './PartnerPaymentsManager';

interface DriverPartnershipsTabProps {
  driverId: string;
  initialSubTab?: string;
}

type TabId = 'pool' | 'favorites' | 'received' | 'sent' | 'payments' | 'invoices';

export function DriverPartnershipsTab({ driverId, initialSubTab = 'pool' }: DriverPartnershipsTabProps) {
  const [activeTab, setActiveTab] = useState<TabId>((initialSubTab as TabId) || 'pool');
  const [receivedCount, setReceivedCount] = useState(0);
  
  const { markPartnershipNotificationsAsRead } = usePartnershipNotificationCount(driverId);

  useEffect(() => {
    if (initialSubTab) setActiveTab(initialSubTab as TabId);
  }, [initialSubTab]);

  useEffect(() => {
    if (activeTab === 'payments') markPartnershipNotificationsAsRead();
  }, [activeTab, markPartnershipNotificationsAsRead]);

  // Count pending received courses
  useEffect(() => {
    if (!driverId) return;
    const loadCount = async () => {
      const { count } = await supabase
        .from('shared_courses')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_driver_id', driverId)
        .eq('status', 'pending')
        .is('cancelled_at', null);
      setReceivedCount(count || 0);
    };
    loadCount();
    const channel = supabase.channel('received-count').on('postgres_changes', { event: '*', schema: 'public', table: 'shared_courses' }, () => loadCount()).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [driverId]);

  const tabs: { id: TabId; label: string; icon: React.ReactNode; color: string; count?: number }[] = [
    { id: 'pool', label: 'Disponibles', icon: <Globe className="h-6 w-6 text-white" strokeWidth={2.5} />, color: 'from-blue-400 to-blue-600' },
    { id: 'favorites', label: 'Favoris', icon: <Heart className="h-6 w-6 text-white" strokeWidth={2.5} />, color: 'from-pink-400 to-pink-600' },
    { id: 'received', label: 'Reçues', icon: <Inbox className="h-6 w-6 text-white" strokeWidth={2.5} />, color: 'from-emerald-400 to-emerald-600', count: receivedCount },
    { id: 'sent', label: 'Envoyées', icon: <Send className="h-6 w-6 text-white" strokeWidth={2.5} />, color: 'from-orange-400 to-orange-600' },
    { id: 'payments', label: 'Paiements', icon: <CreditCard className="h-6 w-6 text-white" strokeWidth={2.5} />, color: 'from-amber-400 to-amber-600' },
    { id: 'invoices', label: 'Factures', icon: <Receipt className="h-6 w-6 text-white" strokeWidth={2.5} />, color: 'from-cyan-400 to-cyan-600' },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Handshake className="h-5 w-5 text-primary" />
            Réseau de Partage
          </CardTitle>
          <CardDescription>
            Partagez vos courses avec le réseau SoloCab ou vos chauffeurs favoris
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Navigation Grid */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  relative flex flex-col items-center justify-center gap-2 p-4 rounded-2xl
                  border-2 transition-all duration-300 h-auto group
                  ${activeTab === tab.id
                    ? 'border-primary shadow-lg scale-[1.02] bg-primary/5'
                    : 'border-transparent bg-card/80 hover:bg-muted/50 hover:scale-[1.01]'
                  }
                `}
              >
                {tab.count !== undefined && tab.count > 0 && (
                  <Badge className="absolute -top-2 -right-2 h-5 min-w-5 p-0 flex items-center justify-center text-[10px] bg-red-500 text-white animate-pulse shadow-lg z-50 border-2 border-background">
                    {tab.count}
                  </Badge>
                )}
                <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${tab.color} flex items-center justify-center shadow-md group-hover:scale-110 transition-transform`}>
                  {tab.icon}
                </div>
                <span className={`text-[11px] font-semibold text-center ${activeTab === tab.id ? 'text-primary' : 'text-foreground'}`}>
                  {tab.label}
                </span>
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="mt-4">
            {activeTab === 'pool' && <PartnerCoursePool driverId={driverId} />}
            {activeTab === 'favorites' && <FavoriteDriversList />}
            {activeTab === 'received' && <ReceivedPartnerCourses driverId={driverId} />}
            {activeTab === 'sent' && <SentPartnerCourses driverId={driverId} />}
            {activeTab === 'payments' && <PartnerPaymentsManager driverId={driverId} />}
            {activeTab === 'invoices' && <PartnerInvoicesList driverId={driverId} />}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
