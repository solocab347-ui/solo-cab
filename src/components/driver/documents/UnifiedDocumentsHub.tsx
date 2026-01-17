import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Upload,
  Users,
  Loader2
} from 'lucide-react';

// Sub-components
import { DriverDocuments } from '../DriverDocuments';
import { PartnershipDocumentsList } from './PartnershipDocumentsList';

type DocumentTab = 'registration' | 'driver-partnerships';

interface UnifiedDocumentsHubProps {
  driverId: string;
  userId: string;
  isFleetDriver?: boolean;
}

export function UnifiedDocumentsHub({ driverId, userId, isFleetDriver = false }: UnifiedDocumentsHubProps) {
  const [activeTab, setActiveTab] = useState<DocumentTab>('registration');
  const [loading, setLoading] = useState(true);
  
  // Stats for badges
  const [driverPartnerDocs, setDriverPartnerDocs] = useState(0);

  useEffect(() => {
    if (driverId) {
      loadStats();
    }
  }, [driverId]);

  const loadStats = async () => {
    setLoading(true);
    try {
      // Count devis & factures with driver partnerships
      const { count: driverDevisCount } = await supabase
        .from('devis')
        .select('*', { count: 'exact', head: true })
        .eq('driver_id', driverId)
        .not('partner_driver_id', 'is', null);

      const { count: driverFacturesCount } = await supabase
        .from('factures')
        .select('*', { count: 'exact', head: true })
        .eq('driver_id', driverId)
        .not('partner_driver_id', 'is', null);

      setDriverPartnerDocs((driverDevisCount || 0) + (driverFacturesCount || 0));
    } catch (error) {
      console.error('Error loading document stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Mes Documents
          </CardTitle>
          <CardDescription>
            Tous vos documents administratifs et partenariats au même endroit
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as DocumentTab)}>
            <TabsList className="grid grid-cols-2 w-full h-auto gap-2 p-2">
              {!isFleetDriver && (
                <TabsTrigger 
                  value="registration" 
                  className="flex flex-col items-center gap-2 py-3 px-2 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
                >
                  <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                    <Upload className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                  </div>
                  <span className="text-xs font-medium">Inscription</span>
                </TabsTrigger>
              )}
              
              <TabsTrigger 
                value="driver-partnerships" 
                className="flex flex-col items-center gap-2 py-3 px-2 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all relative"
              >
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="text-xs font-medium">Partenaires</span>
                {driverPartnerDocs > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 min-w-5 px-1.5 text-[10px] bg-blue-600">
                    {driverPartnerDocs}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Registration Documents */}
            {!isFleetDriver && (
              <TabsContent value="registration" className="mt-4">
                <DriverDocuments driverId={driverId} userId={userId} />
              </TabsContent>
            )}

            {/* Driver Partnership Documents */}
            <TabsContent value="driver-partnerships" className="mt-4">
              <PartnershipDocumentsList 
                driverId={driverId} 
                partnershipType="driver" 
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
