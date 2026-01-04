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
            <TabsList className="grid grid-cols-3 w-full h-auto gap-2 p-2 bg-muted/20 rounded-2xl">
              {/* Ligne 1 */}
              <TabsTrigger value="received" className="relative flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl bg-gradient-to-b from-emerald-500/10 to-emerald-600/5 data-[state=active]:from-emerald-500 data-[state=active]:to-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-emerald-500/30 transition-all duration-300">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/20 data-[state=active]:bg-white/20 flex items-center justify-center">
                  <ArrowDownToLine className="h-5 w-5 text-emerald-500 group-data-[state=active]:text-white" />
                </div>
                <span className="text-[10px] font-bold text-center leading-tight">Courses reçues</span>
                {receivedCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 min-w-5 p-0 flex items-center justify-center text-[10px] bg-red-500 text-white animate-pulse shadow-lg">
                    {receivedCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="search" className="flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl bg-gradient-to-b from-blue-500/10 to-blue-600/5 data-[state=active]:from-blue-500 data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-blue-500/30 transition-all duration-300">
                <div className="h-10 w-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <Radar className="h-5 w-5 text-blue-500" />
                </div>
                <span className="text-[10px] font-bold text-center leading-tight">Trouver partenaire</span>
              </TabsTrigger>
              <TabsTrigger value="sent" className="flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl bg-gradient-to-b from-orange-500/10 to-orange-600/5 data-[state=active]:from-orange-500 data-[state=active]:to-orange-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-orange-500/30 transition-all duration-300">
                <div className="h-10 w-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
                  <ArrowUpFromLine className="h-5 w-5 text-orange-500" />
                </div>
                <span className="text-[10px] font-bold text-center leading-tight">Mes envois</span>
              </TabsTrigger>
              
              {/* Ligne 2 */}
              <TabsTrigger value="list" className="flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl bg-gradient-to-b from-violet-500/10 to-violet-600/5 data-[state=active]:from-violet-500 data-[state=active]:to-violet-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-violet-500/30 transition-all duration-300">
                <div className="h-10 w-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
                  <UsersRound className="h-5 w-5 text-violet-500" />
                </div>
                <span className="text-[10px] font-bold text-center leading-tight">Partenaires</span>
              </TabsTrigger>
              <TabsTrigger value="payments" className="flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl bg-gradient-to-b from-amber-500/10 to-amber-600/5 data-[state=active]:from-amber-500 data-[state=active]:to-amber-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-amber-500/30 transition-all duration-300">
                <div className="h-10 w-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                  <Banknote className="h-5 w-5 text-amber-500" />
                </div>
                <span className="text-[10px] font-bold text-center leading-tight">Paiements</span>
              </TabsTrigger>
              <TabsTrigger value="invoices" className="flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl bg-gradient-to-b from-cyan-500/10 to-cyan-600/5 data-[state=active]:from-cyan-500 data-[state=active]:to-cyan-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-cyan-500/30 transition-all duration-300">
                <div className="h-10 w-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                  <FileStack className="h-5 w-5 text-cyan-500" />
                </div>
                <span className="text-[10px] font-bold text-center leading-tight">Factures</span>
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
