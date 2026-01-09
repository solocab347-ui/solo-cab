import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Briefcase, Handshake, CreditCard } from 'lucide-react';
import { DriverFleetPartnerships } from '../DriverFleetPartnerships';
import { DriverFleetCommissions } from '../DriverFleetCommissions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useState } from 'react';

interface FleetPartnershipsTabProps {
  driverId: string;
}

export function FleetPartnershipsTab({ driverId }: FleetPartnershipsTabProps) {
  const [activeTab, setActiveTab] = useState<'partnerships' | 'commissions'>('partnerships');

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
            <TabsList className="grid grid-cols-2 w-full h-auto">
              <TabsTrigger value="partnerships" className="gap-1.5 py-2.5 text-xs sm:text-sm">
                <Handshake className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span>Partenariats</span>
              </TabsTrigger>
              <TabsTrigger value="commissions" className="gap-1.5 py-2.5 text-xs sm:text-sm">
                <CreditCard className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span>Commissions</span>
              </TabsTrigger>
            </TabsList>

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
