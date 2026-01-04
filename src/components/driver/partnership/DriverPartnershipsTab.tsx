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
            <TabsList className="grid grid-cols-3 w-full h-auto gap-2 p-2 bg-transparent">
              {/* Ligne 1 */}
              <TabsTrigger value="received" className="relative flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 border-emerald-500/30 bg-emerald-500/5 data-[state=active]:border-emerald-500 data-[state=active]:bg-emerald-500 data-[state=active]:text-white shadow-sm transition-all duration-200 hover:border-emerald-500/60">
                <ArrowDownToLine className="h-6 w-6" strokeWidth={2} />
                <span className="text-[11px] font-bold text-center leading-tight">Courses reçues</span>
                {receivedCount > 0 && (
                  <Badge className="absolute -top-2 -right-2 h-5 min-w-5 p-0 flex items-center justify-center text-[10px] bg-red-500 text-white animate-pulse shadow-lg border-2 border-background">
                    {receivedCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="search" className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 border-blue-500/30 bg-blue-500/5 data-[state=active]:border-blue-500 data-[state=active]:bg-blue-500 data-[state=active]:text-white shadow-sm transition-all duration-200 hover:border-blue-500/60">
                <Radar className="h-6 w-6" strokeWidth={2} />
                <span className="text-[11px] font-bold text-center leading-tight">Trouver partenaire</span>
              </TabsTrigger>
              <TabsTrigger value="sent" className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 border-orange-500/30 bg-orange-500/5 data-[state=active]:border-orange-500 data-[state=active]:bg-orange-500 data-[state=active]:text-white shadow-sm transition-all duration-200 hover:border-orange-500/60">
                <ArrowUpFromLine className="h-6 w-6" strokeWidth={2} />
                <span className="text-[11px] font-bold text-center leading-tight">Mes envois</span>
              </TabsTrigger>
              
              {/* Ligne 2 */}
              <TabsTrigger value="list" className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 border-violet-500/30 bg-violet-500/5 data-[state=active]:border-violet-500 data-[state=active]:bg-violet-500 data-[state=active]:text-white shadow-sm transition-all duration-200 hover:border-violet-500/60">
                <UsersRound className="h-6 w-6" strokeWidth={2} />
                <span className="text-[11px] font-bold text-center leading-tight">Partenaires</span>
              </TabsTrigger>
              <TabsTrigger value="payments" className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 border-amber-500/30 bg-amber-500/5 data-[state=active]:border-amber-500 data-[state=active]:bg-amber-500 data-[state=active]:text-white shadow-sm transition-all duration-200 hover:border-amber-500/60">
                <Banknote className="h-6 w-6" strokeWidth={2} />
                <span className="text-[11px] font-bold text-center leading-tight">Paiements</span>
              </TabsTrigger>
              <TabsTrigger value="invoices" className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 border-cyan-500/30 bg-cyan-500/5 data-[state=active]:border-cyan-500 data-[state=active]:bg-cyan-500 data-[state=active]:text-white shadow-sm transition-all duration-200 hover:border-cyan-500/60">
                <FileStack className="h-6 w-6" strokeWidth={2} />
                <span className="text-[11px] font-bold text-center leading-tight">Factures</span>
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
