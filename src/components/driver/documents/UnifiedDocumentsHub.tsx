import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  FileText, 
  Upload,
  Users,
  Building2,
  Briefcase,
  Loader2,
  AlertTriangle
} from 'lucide-react';

// Sub-components
import { DriverDocuments } from '../DriverDocuments';
import { PartnershipDocumentsList } from './PartnershipDocumentsList';

type DocumentTab = 'registration' | 'driver-partnerships' | 'company-partnerships' | 'fleet-partnerships';

interface UnifiedDocumentsHubProps {
  driverId: string;
  userId: string;
  isFleetDriver?: boolean;
}

export function UnifiedDocumentsHub({ driverId, userId, isFleetDriver = false }: UnifiedDocumentsHubProps) {
  const [activeTab, setActiveTab] = useState<DocumentTab>('registration');
  const [loading, setLoading] = useState(true);
  
  // Stats for badges
  const [registrationDocsCount, setRegistrationDocsCount] = useState<{ uploaded: number; total: number }>({ uploaded: 0, total: 6 });
  const [driverPartnerDocs, setDriverPartnerDocs] = useState(0);
  const [companyPartnerDocs, setCompanyPartnerDocs] = useState(0);
  const [fleetPartnerDocs, setFleetPartnerDocs] = useState(0);

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

      // Count devis & factures with company agreements
      const { data: companyAgreements } = await supabase
        .from('company_driver_agreements')
        .select('company_id')
        .eq('driver_id', driverId)
        .eq('status', 'accepted');

      let companyDocsCount = 0;
      if (companyAgreements && companyAgreements.length > 0) {
        const companyIds = companyAgreements.map(a => a.company_id);
        
        // Get clients from these companies via company_courses
        const { count: companyDevisCount } = await supabase
          .from('devis')
          .select('*, courses!inner(*)', { count: 'exact', head: true })
          .eq('driver_id', driverId);
          
        companyDocsCount = (companyDevisCount || 0);
      }

      // Count devis & factures with fleet partnerships
      const { data: fleetPartnerships } = await supabase
        .from('fleet_driver_partnerships')
        .select('fleet_manager_id')
        .eq('driver_id', driverId)
        .eq('status', 'accepted');

      let fleetDocsCount = 0;
      if (fleetPartnerships && fleetPartnerships.length > 0) {
        const { count: fleetDevisCount } = await supabase
          .from('devis')
          .select('*', { count: 'exact', head: true })
          .eq('driver_id', driverId)
          .not('fleet_manager_id', 'is', null);
          
        const { count: fleetFacturesCount } = await supabase
          .from('factures')
          .select('*', { count: 'exact', head: true })
          .eq('driver_id', driverId)
          .not('fleet_manager_id', 'is', null);
          
        fleetDocsCount = (fleetDevisCount || 0) + (fleetFacturesCount || 0);
      }

      setDriverPartnerDocs((driverDevisCount || 0) + (driverFacturesCount || 0));
      setCompanyPartnerDocs(companyDocsCount);
      setFleetPartnerDocs(fleetDocsCount);
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
            <TabsList className="grid grid-cols-3 w-full h-auto gap-2 p-2">
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
                <span className="text-xs font-medium">Chauffeurs</span>
                {driverPartnerDocs > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 min-w-5 px-1.5 text-[10px] bg-blue-600">
                    {driverPartnerDocs}
                  </Badge>
                )}
              </TabsTrigger>
              
              <TabsTrigger 
                value="company-partnerships" 
                className="flex flex-col items-center gap-2 py-3 px-2 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all relative"
              >
                <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                  <Building2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <span className="text-xs font-medium">Entreprises</span>
                {companyPartnerDocs > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 min-w-5 px-1.5 text-[10px] bg-emerald-600">
                    {companyPartnerDocs}
                  </Badge>
                )}
              </TabsTrigger>
              
              <TabsTrigger 
                value="fleet-partnerships" 
                className="flex flex-col items-center gap-2 py-3 px-2 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all relative"
              >
                <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                  <Briefcase className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <span className="text-xs font-medium">Flottes</span>
                {fleetPartnerDocs > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 min-w-5 px-1.5 text-[10px] bg-purple-600">
                    {fleetPartnerDocs}
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

            {/* Company Partnership Documents */}
            <TabsContent value="company-partnerships" className="mt-4">
              <PartnershipDocumentsList 
                driverId={driverId} 
                partnershipType="company" 
              />
            </TabsContent>

            {/* Fleet Partnership Documents */}
            <TabsContent value="fleet-partnerships" className="mt-4">
              <PartnershipDocumentsList 
                driverId={driverId} 
                partnershipType="fleet" 
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
