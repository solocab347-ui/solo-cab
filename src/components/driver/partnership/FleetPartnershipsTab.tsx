import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Briefcase, Handshake, CreditCard, Route } from 'lucide-react';
import { DriverFleetPartnerships } from '../DriverFleetPartnerships';
import { DriverFleetCommissions } from '../DriverFleetCommissions';
import { FleetPartnerCoursesReceived } from '../FleetPartnerCoursesReceived';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';

interface FleetPartnershipsTabProps {
  driverId: string;
}

export function FleetPartnershipsTab({ driverId }: FleetPartnershipsTabProps) {
  const [activeTab, setActiveTab] = useState<'partnerships' | 'courses' | 'commissions'>('partnerships');
  const [pendingCoursesCount, setPendingCoursesCount] = useState(0);

  useEffect(() => {
    const fetchPendingCourses = async () => {
      const { count } = await supabase
        .from('fleet_partner_courses')
        .select('*', { count: 'exact', head: true })
        .eq('driver_id', driverId)
        .eq('status', 'pending');
      setPendingCoursesCount(count || 0);
    };

    fetchPendingCourses();

    // Realtime subscription
    const channel = supabase
      .channel(`fleet-partner-courses-count-${driverId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'fleet_partner_courses',
        filter: `driver_id=eq.${driverId}`
      }, () => fetchPendingCourses())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
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
            Gérez vos partenariats, missions reçues et commissions avec les gestionnaires de flotte
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
            <TabsList className="grid grid-cols-3 w-full h-auto">
              <TabsTrigger value="partnerships" className="gap-1.5 py-2.5 text-xs sm:text-sm">
                <Handshake className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span>Partenariats</span>
              </TabsTrigger>
              <TabsTrigger value="courses" className="gap-1.5 py-2.5 text-xs sm:text-sm relative">
                <Route className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span>Missions</span>
                {pendingCoursesCount > 0 && (
                  <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 min-w-5 text-xs animate-pulse">
                    {pendingCoursesCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="commissions" className="gap-1.5 py-2.5 text-xs sm:text-sm">
                <CreditCard className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span>Commissions</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="partnerships" className="mt-4">
              <DriverFleetPartnerships driverId={driverId} />
            </TabsContent>

            <TabsContent value="courses" className="mt-4">
              <FleetPartnerCoursesReceived driverId={driverId} />
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
