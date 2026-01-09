import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Briefcase, Handshake, CreditCard, Inbox } from 'lucide-react';
import { DriverFleetPartnerships } from '../DriverFleetPartnerships';
import { DriverFleetCommissions } from '../DriverFleetCommissions';
import { FleetPartnerCoursesReceived } from '../FleetPartnerCoursesReceived';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface FleetPartnershipsTabProps {
  driverId: string;
}

export function FleetPartnershipsTab({ driverId }: FleetPartnershipsTabProps) {
  const [activeTab, setActiveTab] = useState<'courses' | 'partnerships' | 'commissions'>('courses');
  const [pendingCoursesCount, setPendingCoursesCount] = useState(0);

  useEffect(() => {
    const fetchPendingCount = async () => {
      const { count } = await supabase
        .from('fleet_partner_courses')
        .select('*', { count: 'exact', head: true })
        .eq('driver_id', driverId)
        .eq('status', 'pending');
      
      setPendingCoursesCount(count || 0);
    };

    fetchPendingCount();

    // Realtime subscription
    const channel = supabase
      .channel('fleet_courses_count')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'fleet_partner_courses',
          filter: `driver_id=eq.${driverId}`
        },
        () => fetchPendingCount()
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
            <Briefcase className="h-5 w-5 text-amber-500" />
            Partenariats Flottes
          </CardTitle>
          <CardDescription>
            Gérez vos partenariats et commissions avec les gestionnaires de flotte
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
            <TabsList className="grid grid-cols-3 w-full h-auto">
              <TabsTrigger value="courses" className="relative gap-1.5 py-2.5 text-xs sm:text-sm">
                <Inbox className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span>Courses</span>
                {pendingCoursesCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 min-w-5 p-0 flex items-center justify-center text-[10px] bg-red-500 text-white animate-pulse">
                    {pendingCoursesCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="partnerships" className="gap-1.5 py-2.5 text-xs sm:text-sm">
                <Handshake className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span>Partenariats</span>
              </TabsTrigger>
              <TabsTrigger value="commissions" className="gap-1.5 py-2.5 text-xs sm:text-sm">
                <CreditCard className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span>Commissions</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="courses" className="mt-4">
              <FleetPartnerCoursesReceived driverId={driverId} />
            </TabsContent>

            <TabsContent value="partnerships" className="mt-4">
              <DriverFleetPartnerships driverId={driverId} />
            </TabsContent>

            <TabsContent value="commissions" className="mt-4">
              <DriverFleetCommissions driverId={driverId} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
