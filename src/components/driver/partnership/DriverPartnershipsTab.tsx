import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  UsersRound, 
  Radar, 
  Banknote,
  ArrowDownToLine,
  ArrowUpFromLine,
  FileStack
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

export function DriverPartnershipsTab({ driverId, initialSubTab = 'list' }: DriverPartnershipsTabProps) {
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
              <TabsTrigger value="received" className="relative flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-gradient-to-br from-emerald-900/80 to-emerald-950/90 border border-emerald-500/30 data-[state=active]:border-emerald-400 data-[state=active]:shadow-lg data-[state=active]:shadow-emerald-500/20 transition-all duration-300 h-auto">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg">
                  <ArrowDownToLine className="h-6 w-6 text-white" strokeWidth={2.5} />
                </div>
                <span className="text-[11px] font-semibold text-emerald-100 text-center">Courses reçues</span>
                {receivedCount > 0 && (
                  <Badge className="absolute -top-1.5 -right-1.5 h-5 min-w-5 p-0 flex items-center justify-center text-[10px] bg-red-500 text-white animate-pulse shadow-lg">
                    {receivedCount}
                  </Badge>
                )}
              </TabsTrigger>
              
              <TabsTrigger value="search" className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-gradient-to-br from-blue-900/80 to-blue-950/90 border border-blue-500/30 data-[state=active]:border-blue-400 data-[state=active]:shadow-lg data-[state=active]:shadow-blue-500/20 transition-all duration-300 h-auto">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-lg">
                  <Radar className="h-6 w-6 text-white" strokeWidth={2.5} />
                </div>
                <span className="text-[11px] font-semibold text-blue-100 text-center">Trouver partenaire</span>
              </TabsTrigger>
              
              <TabsTrigger value="sent" className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-gradient-to-br from-orange-900/80 to-orange-950/90 border border-orange-500/30 data-[state=active]:border-orange-400 data-[state=active]:shadow-lg data-[state=active]:shadow-orange-500/20 transition-all duration-300 h-auto">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-lg">
                  <ArrowUpFromLine className="h-6 w-6 text-white" strokeWidth={2.5} />
                </div>
                <span className="text-[11px] font-semibold text-orange-100 text-center">Mes envois</span>
              </TabsTrigger>
              
              {/* Ligne 2 */}
              <TabsTrigger value="list" className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-gradient-to-br from-violet-900/80 to-violet-950/90 border border-violet-500/30 data-[state=active]:border-violet-400 data-[state=active]:shadow-lg data-[state=active]:shadow-violet-500/20 transition-all duration-300 h-auto">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center shadow-lg">
                  <UsersRound className="h-6 w-6 text-white" strokeWidth={2.5} />
                </div>
                <span className="text-[11px] font-semibold text-violet-100 text-center">Partenaires</span>
              </TabsTrigger>
              
              <TabsTrigger value="payments" className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-gradient-to-br from-amber-900/80 to-amber-950/90 border border-amber-500/30 data-[state=active]:border-amber-400 data-[state=active]:shadow-lg data-[state=active]:shadow-amber-500/20 transition-all duration-300 h-auto">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg">
                  <Banknote className="h-6 w-6 text-white" strokeWidth={2.5} />
                </div>
                <span className="text-[11px] font-semibold text-amber-100 text-center">Paiements</span>
              </TabsTrigger>
              
              <TabsTrigger value="invoices" className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-gradient-to-br from-cyan-900/80 to-cyan-950/90 border border-cyan-500/30 data-[state=active]:border-cyan-400 data-[state=active]:shadow-lg data-[state=active]:shadow-cyan-500/20 transition-all duration-300 h-auto">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center shadow-lg">
                  <FileStack className="h-6 w-6 text-white" strokeWidth={2.5} />
                </div>
                <span className="text-[11px] font-semibold text-cyan-100 text-center">Factures</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="list" className="mt-4">
              <MyPartnersList />
            </TabsContent>

            <TabsContent value="search" className="mt-4">
              <DriverPartnerSearch driverId={driverId} />
            </TabsContent>

            <TabsContent value="received" className="mt-4 space-y-4">
              {/* Available courses from partners */}
              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <ArrowDownToLine className="h-4 w-4 text-primary" />
                  Courses disponibles des partenaires
                </h3>
                <PartnerCoursePool driverId={driverId} />
              </div>
              
              <div className="border-t pt-4">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <ArrowDownToLine className="h-4 w-4 text-green-600" />
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
