import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Handshake, 
  Search, 
  Wallet,
  Car,
  Send
} from 'lucide-react';

// Import sub-components
import { MyPartnersList } from '../MyPartnersList';
import { PartnerCoursePool } from '../PartnerCoursePool';
import { PushCourseToPartners } from '../PushCourseToPartners';
import { DriverPartnerSearch } from '../DriverPartnerSearch';
import { PartnershipBalances } from '../PartnershipBalances';

interface DriverPartnershipsTabProps {
  driverId: string;
}

export function DriverPartnershipsTab({ driverId }: DriverPartnershipsTabProps) {
  const [activeTab, setActiveTab] = useState<'list' | 'search' | 'courses' | 'balances'>('list');

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
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="list" className="text-xs gap-1">
                <Handshake className="h-3.5 w-3.5" />
                Mes Partenaires
              </TabsTrigger>
              <TabsTrigger value="search" className="text-xs gap-1">
                <Search className="h-3.5 w-3.5" />
                Rechercher
              </TabsTrigger>
              <TabsTrigger value="courses" className="text-xs gap-1">
                <Car className="h-3.5 w-3.5" />
                Courses
              </TabsTrigger>
              <TabsTrigger value="balances" className="text-xs gap-1">
                <Wallet className="h-3.5 w-3.5" />
                Soldes
              </TabsTrigger>
            </TabsList>

            <TabsContent value="list" className="mt-4">
              <MyPartnersList />
            </TabsContent>

            <TabsContent value="search" className="mt-4">
              <DriverPartnerSearch driverId={driverId} />
            </TabsContent>

            <TabsContent value="courses" className="mt-4 space-y-6">
              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Send className="h-4 w-4" />
                  Proposer une course à un partenaire
                </h3>
                <PushCourseToPartners />
              </div>
              
              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Car className="h-4 w-4" />
                  Courses disponibles des partenaires
                </h3>
                <PartnerCoursePool />
              </div>
            </TabsContent>

            <TabsContent value="balances" className="mt-4">
              <PartnershipBalances driverId={driverId} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
