import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  UserSearch, 
  Wallet,
  CarFront,
  SendHorizontal,
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
            <Users className="h-5 w-5 text-primary" />
            Partenariats Chauffeurs
          </CardTitle>
          <CardDescription>
            Gérez vos partenariats avec d'autres chauffeurs VTC indépendants
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
            <TabsList className="grid grid-cols-3 w-full h-auto gap-1.5 p-1.5 bg-muted/50 rounded-xl">
              {/* Ligne 1 */}
              <TabsTrigger value="received" className="relative flex flex-col items-center gap-1 py-2.5 px-1.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">
                <div className="p-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                  <CarFront className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <span className="text-[10px] font-medium text-center leading-tight">Courses reçues</span>
                {receivedCount > 0 && (
                  <Badge className="absolute -top-0.5 -right-0.5 h-4 min-w-4 p-0 flex items-center justify-center text-[9px] bg-red-500 text-white border-2 border-background">
                    {receivedCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="search" className="flex flex-col items-center gap-1 py-2.5 px-1.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">
                <div className="p-1.5 rounded-full bg-blue-100 dark:bg-blue-900/30">
                  <UserSearch className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="text-[10px] font-medium text-center leading-tight">Trouver partenaire</span>
              </TabsTrigger>
              <TabsTrigger value="sent" className="flex flex-col items-center gap-1 py-2.5 px-1.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">
                <div className="p-1.5 rounded-full bg-orange-100 dark:bg-orange-900/30">
                  <SendHorizontal className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                </div>
                <span className="text-[10px] font-medium text-center leading-tight">Envoyées</span>
              </TabsTrigger>
              
              {/* Ligne 2 */}
              <TabsTrigger value="list" className="flex flex-col items-center gap-1 py-2.5 px-1.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">
                <div className="p-1.5 rounded-full bg-violet-100 dark:bg-violet-900/30">
                  <Users className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                </div>
                <span className="text-[10px] font-medium text-center leading-tight">Partenaires</span>
              </TabsTrigger>
              <TabsTrigger value="payments" className="flex flex-col items-center gap-1 py-2.5 px-1.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">
                <div className="p-1.5 rounded-full bg-amber-100 dark:bg-amber-900/30">
                  <Wallet className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <span className="text-[10px] font-medium text-center leading-tight">Paiements</span>
              </TabsTrigger>
              <TabsTrigger value="invoices" className="flex flex-col items-center gap-1 py-2.5 px-1.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">
                <div className="p-1.5 rounded-full bg-cyan-100 dark:bg-cyan-900/30">
                  <Receipt className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                </div>
                <span className="text-[10px] font-medium text-center leading-tight">Factures</span>
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
                  <CarFront className="h-4 w-4 text-primary" />
                  Courses disponibles des partenaires
                </h3>
                <PartnerCoursePool driverId={driverId} />
              </div>
              
              <div className="border-t pt-4">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <CarFront className="h-4 w-4 text-green-600" />
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
