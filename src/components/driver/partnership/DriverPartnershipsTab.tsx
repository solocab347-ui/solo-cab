import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  UsersRound, 
  Search, 
  Wallet,
  Inbox,
  Send,
  FileText,
  Handshake,
  CreditCard,
  Receipt
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { usePartnershipNotificationCount } from '@/hooks/usePartnershipNotificationCount';

// Import sub-components
import { MyPartnersList } from '../MyPartnersList';
import { PartnerCoursePool } from '../PartnerCoursePool';
import { DriverPartnerSearch } from '../DriverPartnerSearch';
import { ReceivedPartnerCourses } from './ReceivedPartnerCourses';
import { SentPartnerCourses } from './SentPartnerCourses';
import { PartnerInvoicesList } from './PartnerInvoicesList';
import { PartnerPaymentsManager } from './PartnerPaymentsManager';

interface DriverPartnershipsTabProps {
  driverId: string;
  initialSubTab?: 'list' | 'search' | 'received' | 'sent' | 'payments' | 'invoices';
}

export function DriverPartnershipsTab({ driverId, initialSubTab = 'received' }: DriverPartnershipsTabProps) {
  const [activeTab, setActiveTab] = useState<'list' | 'search' | 'received' | 'sent' | 'payments' | 'invoices'>(initialSubTab);
  const [receivedCount, setReceivedCount] = useState(0);
  
  // Get the function to mark notifications as read
  const { markPartnershipNotificationsAsRead } = usePartnershipNotificationCount(driverId);

  // Sync with initialSubTab when it changes (e.g., from URL params)
  useEffect(() => {
    if (initialSubTab) {
      setActiveTab(initialSubTab);
    }
  }, [initialSubTab]);

  // Mark partnership notifications as read when user navigates to payments tab
  useEffect(() => {
    if (activeTab === 'payments') {
      markPartnershipNotificationsAsRead();
    }
  }, [activeTab, markPartnershipNotificationsAsRead]);

  // Count pending received courses
  useEffect(() => {
    if (!driverId) return;

    const loadReceivedCount = async () => {
      try {
        const { count } = await supabase
          .from('shared_courses')
          .select('*', { count: 'exact', head: true })
          .eq('receiver_driver_id', driverId)
          .eq('status', 'pending')
          .is('cancelled_at', null);
        
        setReceivedCount(count || 0);
      } catch (error) {
        console.error('Error loading received count:', error);
      }
    };

    loadReceivedCount();

    // Realtime subscription
    const channel = supabase
      .channel('received-count-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shared_courses' },
        () => loadReceivedCount()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [driverId]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <UsersRound className="h-5 w-5 text-primary" />
            Partenariats Chauffeurs
          </CardTitle>
          <CardDescription>
            Gérez vos partenariats avec d'autres chauffeurs VTC indépendants
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
            <TabsList className="grid grid-cols-3 w-full h-auto gap-3 p-0 bg-transparent">
              {/* Ligne 1 */}
              <TabsTrigger value="received" className="relative overflow-visible flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-gradient-to-br from-card/80 via-card/60 to-card/80 backdrop-blur-xl border-2 border-transparent shadow-[0_8px_30px_rgb(16,185,129,0.2)] hover:scale-[1.02] data-[state=active]:scale-[1.02] data-[state=active]:shadow-[0_8px_30px_rgb(16,185,129,0.6)] data-[state=active]:border-emerald-500 data-[state=active]:bg-gradient-to-br data-[state=active]:from-emerald-950/80 data-[state=active]:via-emerald-900/60 data-[state=active]:to-emerald-950/80 transition-all duration-300 h-auto group">
                {receivedCount > 0 && (
                  <Badge className="absolute -top-2 -right-2 h-5 min-w-5 p-0 flex items-center justify-center text-[10px] bg-red-500 text-white animate-pulse shadow-lg z-50 border-2 border-background">
                    {receivedCount}
                  </Badge>
                )}
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 group-hover:from-emerald-500/20 group-hover:to-emerald-600/10 group-data-[state=active]:from-emerald-500/30 group-data-[state=active]:to-emerald-600/20 transition-all rounded-2xl"></div>
                <div className="relative z-10 h-12 w-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-[0_4px_20px_rgb(16,185,129,0.5)] group-hover:scale-110 group-data-[state=active]:scale-110 group-data-[state=active]:shadow-[0_4px_25px_rgb(16,185,129,0.7)] transition-transform">
                  <Inbox className="h-6 w-6 text-white" strokeWidth={2.5} />
                </div>
                <span className="relative z-10 text-[11px] font-semibold text-foreground text-center group-data-[state=active]:text-emerald-400">Courses reçues</span>
              </TabsTrigger>
              
              <TabsTrigger value="search" className="relative overflow-hidden flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-gradient-to-br from-card/80 via-card/60 to-card/80 backdrop-blur-xl border-2 border-transparent shadow-[0_8px_30px_rgb(59,130,246,0.2)] hover:scale-[1.02] data-[state=active]:scale-[1.02] data-[state=active]:shadow-[0_8px_30px_rgb(59,130,246,0.6)] data-[state=active]:border-blue-500 data-[state=active]:bg-gradient-to-br data-[state=active]:from-blue-950/80 data-[state=active]:via-blue-900/60 data-[state=active]:to-blue-950/80 transition-all duration-300 h-auto group">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-blue-600/5 group-hover:from-blue-500/20 group-hover:to-blue-600/10 group-data-[state=active]:from-blue-500/30 group-data-[state=active]:to-blue-600/20 transition-all"></div>
                <div className="relative z-10 h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-[0_4px_20px_rgb(59,130,246,0.5)] group-hover:scale-110 group-data-[state=active]:scale-110 group-data-[state=active]:shadow-[0_4px_25px_rgb(59,130,246,0.7)] transition-transform">
                  <Search className="h-6 w-6 text-white" strokeWidth={2.5} />
                </div>
                <span className="relative z-10 text-[11px] font-semibold text-foreground text-center group-data-[state=active]:text-blue-400">Trouver partenaire</span>
              </TabsTrigger>
              
              <TabsTrigger value="sent" className="relative overflow-hidden flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-gradient-to-br from-card/80 via-card/60 to-card/80 backdrop-blur-xl border-2 border-transparent shadow-[0_8px_30px_rgb(249,115,22,0.2)] hover:scale-[1.02] data-[state=active]:scale-[1.02] data-[state=active]:shadow-[0_8px_30px_rgb(249,115,22,0.6)] data-[state=active]:border-orange-500 data-[state=active]:bg-gradient-to-br data-[state=active]:from-orange-950/80 data-[state=active]:via-orange-900/60 data-[state=active]:to-orange-950/80 transition-all duration-300 h-auto group">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-orange-600/5 group-hover:from-orange-500/20 group-hover:to-orange-600/10 group-data-[state=active]:from-orange-500/30 group-data-[state=active]:to-orange-600/20 transition-all"></div>
                <div className="relative z-10 h-12 w-12 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-[0_4px_20px_rgb(249,115,22,0.5)] group-hover:scale-110 group-data-[state=active]:scale-110 group-data-[state=active]:shadow-[0_4px_25px_rgb(249,115,22,0.7)] transition-transform">
                  <Send className="h-6 w-6 text-white" strokeWidth={2.5} />
                </div>
                <span className="relative z-10 text-[11px] font-semibold text-foreground text-center group-data-[state=active]:text-orange-400">Mes envois</span>
              </TabsTrigger>
              
              {/* Ligne 2 */}
              <TabsTrigger value="list" className="relative overflow-hidden flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-gradient-to-br from-card/80 via-card/60 to-card/80 backdrop-blur-xl border-2 border-transparent shadow-[0_8px_30px_rgb(139,92,246,0.2)] hover:scale-[1.02] data-[state=active]:scale-[1.02] data-[state=active]:shadow-[0_8px_30px_rgb(139,92,246,0.6)] data-[state=active]:border-violet-500 data-[state=active]:bg-gradient-to-br data-[state=active]:from-violet-950/80 data-[state=active]:via-violet-900/60 data-[state=active]:to-violet-950/80 transition-all duration-300 h-auto group">
                <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-violet-600/5 group-hover:from-violet-500/20 group-hover:to-violet-600/10 group-data-[state=active]:from-violet-500/30 group-data-[state=active]:to-violet-600/20 transition-all"></div>
                <div className="relative z-10 h-12 w-12 rounded-2xl bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center shadow-[0_4px_20px_rgb(139,92,246,0.5)] group-hover:scale-110 group-data-[state=active]:scale-110 group-data-[state=active]:shadow-[0_4px_25px_rgb(139,92,246,0.7)] transition-transform">
                  <Handshake className="h-6 w-6 text-white" strokeWidth={2.5} />
                </div>
                <span className="relative z-10 text-[11px] font-semibold text-foreground text-center group-data-[state=active]:text-violet-400">Partenaires</span>
              </TabsTrigger>
              
              <TabsTrigger value="payments" className="relative overflow-hidden flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-gradient-to-br from-card/80 via-card/60 to-card/80 backdrop-blur-xl border-2 border-transparent shadow-[0_8px_30px_rgb(245,158,11,0.2)] hover:scale-[1.02] data-[state=active]:scale-[1.02] data-[state=active]:shadow-[0_8px_30px_rgb(245,158,11,0.6)] data-[state=active]:border-amber-500 data-[state=active]:bg-gradient-to-br data-[state=active]:from-amber-950/80 data-[state=active]:via-amber-900/60 data-[state=active]:to-amber-950/80 transition-all duration-300 h-auto group">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-amber-600/5 group-hover:from-amber-500/20 group-hover:to-amber-600/10 group-data-[state=active]:from-amber-500/30 group-data-[state=active]:to-amber-600/20 transition-all"></div>
                <div className="relative z-10 h-12 w-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-[0_4px_20px_rgb(245,158,11,0.5)] group-hover:scale-110 group-data-[state=active]:scale-110 group-data-[state=active]:shadow-[0_4px_25px_rgb(245,158,11,0.7)] transition-transform">
                  <CreditCard className="h-6 w-6 text-white" strokeWidth={2.5} />
                </div>
                <span className="relative z-10 text-[11px] font-semibold text-foreground text-center group-data-[state=active]:text-amber-400">Paiements</span>
              </TabsTrigger>
              
              <TabsTrigger value="invoices" className="relative overflow-hidden flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-gradient-to-br from-card/80 via-card/60 to-card/80 backdrop-blur-xl border-2 border-transparent shadow-[0_8px_30px_rgb(6,182,212,0.2)] hover:scale-[1.02] data-[state=active]:scale-[1.02] data-[state=active]:shadow-[0_8px_30px_rgb(6,182,212,0.6)] data-[state=active]:border-cyan-500 data-[state=active]:bg-gradient-to-br data-[state=active]:from-cyan-950/80 data-[state=active]:via-cyan-900/60 data-[state=active]:to-cyan-950/80 transition-all duration-300 h-auto group">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 group-hover:from-cyan-500/20 group-hover:to-cyan-600/10 group-data-[state=active]:from-cyan-500/30 group-data-[state=active]:to-cyan-600/20 transition-all"></div>
                <div className="relative z-10 h-12 w-12 rounded-2xl bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center shadow-[0_4px_20px_rgb(6,182,212,0.5)] group-hover:scale-110 group-data-[state=active]:scale-110 group-data-[state=active]:shadow-[0_4px_25px_rgb(6,182,212,0.7)] transition-transform">
                  <Receipt className="h-6 w-6 text-white" strokeWidth={2.5} />
                </div>
                <span className="relative z-10 text-[11px] font-semibold text-foreground text-center group-data-[state=active]:text-cyan-400">Factures</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="list" className="mt-4">
              <MyPartnersList />
            </TabsContent>

            <TabsContent value="search" className="mt-4">
              <DriverPartnerSearch driverId={driverId} />
            </TabsContent>

            <TabsContent value="received" className="mt-4 space-y-4">
              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Inbox className="h-4 w-4 text-primary" />
                  Courses disponibles des partenaires
                </h3>
                <PartnerCoursePool driverId={driverId} />
              </div>
              
              <div className="border-t pt-4">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Inbox className="h-4 w-4 text-green-600" />
                  Courses acceptées
                </h3>
                <ReceivedPartnerCourses driverId={driverId} />
              </div>
            </TabsContent>

            <TabsContent value="sent" className="mt-4">
              <SentPartnerCourses driverId={driverId} />
            </TabsContent>

            <TabsContent value="payments" className="mt-4">
              <PartnerPaymentsManager driverId={driverId} />
            </TabsContent>

            <TabsContent value="invoices" className="mt-4">
              <PartnerInvoicesList driverId={driverId} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
