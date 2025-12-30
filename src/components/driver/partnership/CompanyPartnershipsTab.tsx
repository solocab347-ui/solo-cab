import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2 } from 'lucide-react';
import { DriverCompanyAgreements } from '../DriverCompanyAgreements';
import { DriverCompanyPayments } from '../DriverCompanyPayments';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Handshake, CreditCard } from 'lucide-react';
import { useState } from 'react';

interface CompanyPartnershipsTabProps {
  driverId: string;
}

export function CompanyPartnershipsTab({ driverId }: CompanyPartnershipsTabProps) {
  const [activeTab, setActiveTab] = useState<'agreements' | 'payments'>('agreements');

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-purple-500" />
            Partenariats Entreprises
          </CardTitle>
          <CardDescription>
            Gérez vos accords et paiements avec les entreprises clientes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="agreements" className="gap-2">
                <Handshake className="h-4 w-4" />
                Accords & Partenariats
              </TabsTrigger>
              <TabsTrigger value="payments" className="gap-2">
                <CreditCard className="h-4 w-4" />
                Paiements
              </TabsTrigger>
            </TabsList>

            <TabsContent value="agreements" className="mt-4">
              <DriverCompanyAgreements driverId={driverId} />
            </TabsContent>

            <TabsContent value="payments" className="mt-4">
              <DriverCompanyPayments driverId={driverId} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
