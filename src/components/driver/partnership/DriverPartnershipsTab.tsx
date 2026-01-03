import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Handshake, 
  Search, 
  CreditCard,
  Inbox,
  Send,
  FileText
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

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

  // Sync with initialSubTab when it changes (e.g., from URL params)
  useEffect(() => {
    if (initialSubTab) {
      setActiveTab(initialSubTab);
    }
  }, [initialSubTab]);

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
            <Handshake className="h-5 w-5 text-primary" />
            Partenariats Chauffeurs
          </CardTitle>
          <CardDescription>
            Gérez vos partenariats avec d'autres chauffeurs VTC indépendants
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
            <TabsList className="grid grid-cols-6 w-full">
              <TabsTrigger value="list" className="text-xs gap-1 px-2">
                <Handshake className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Partenaires</span>
                <span className="sm:hidden">Part.</span>
              </TabsTrigger>
              <TabsTrigger value="search" className="text-xs gap-1 px-2">
                <Search className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Rechercher</span>
                <span className="sm:hidden">Rech.</span>
              </TabsTrigger>
              <TabsTrigger value="received" className="text-xs gap-1 px-2 relative">
                <Inbox className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Reçues</span>
                <span className="sm:hidden">Reçu</span>
                {receivedCount > 0 && (
                  <Badge className="absolute -top-1.5 -right-1.5 h-4 min-w-4 p-0 flex items-center justify-center text-[10px] bg-red-500 text-white">
                    {receivedCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="sent" className="text-xs gap-1 px-2">
                <Send className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Envoyées</span>
                <span className="sm:hidden">Env.</span>
              </TabsTrigger>
              <TabsTrigger value="payments" className="text-xs gap-1 px-2">
                <CreditCard className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Paiements</span>
                <span className="sm:hidden">Paie.</span>
              </TabsTrigger>
              <TabsTrigger value="invoices" className="text-xs gap-1 px-2">
                <FileText className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Factures</span>
                <span className="sm:hidden">Fact.</span>
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
