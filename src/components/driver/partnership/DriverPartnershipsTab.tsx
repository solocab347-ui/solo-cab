import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Handshake, 
  Search, 
  Wallet,
  Inbox,
  Send
} from 'lucide-react';

// Import sub-components
import { MyPartnersList } from '../MyPartnersList';
import { PartnerCoursePool } from '../PartnerCoursePool';
import { PushCourseToPartners } from '../PushCourseToPartners';
import { DriverPartnerSearch } from '../DriverPartnerSearch';
import { PartnershipBalances } from '../PartnershipBalances';
import { ReceivedPartnerCourses } from './ReceivedPartnerCourses';
import { SentPartnerCourses } from './SentPartnerCourses';

interface DriverPartnershipsTabProps {
  driverId: string;
  initialSubTab?: 'list' | 'search' | 'received' | 'sent' | 'balances';
}

export function DriverPartnershipsTab({ driverId, initialSubTab = 'list' }: DriverPartnershipsTabProps) {
  const [activeTab, setActiveTab] = useState<'list' | 'search' | 'received' | 'sent' | 'balances'>(initialSubTab);

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
            <TabsList className="grid grid-cols-5 w-full">
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
              <TabsTrigger value="received" className="text-xs gap-1 px-2">
                <Inbox className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Reçues</span>
                <span className="sm:hidden">Reçu</span>
              </TabsTrigger>
              <TabsTrigger value="sent" className="text-xs gap-1 px-2">
                <Send className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Envoyées</span>
                <span className="sm:hidden">Env.</span>
              </TabsTrigger>
              <TabsTrigger value="balances" className="text-xs gap-1 px-2">
                <Wallet className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Soldes</span>
                <span className="sm:hidden">Sold.</span>
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
                <PartnerCoursePool />
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

            <TabsContent value="balances" className="mt-4">
              <PartnershipBalances driverId={driverId} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
