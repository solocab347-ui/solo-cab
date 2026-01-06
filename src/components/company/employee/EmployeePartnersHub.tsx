import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Car, Building2 } from "lucide-react";
import { EmployeeCompanyDrivers } from "@/components/company/EmployeeCompanyDrivers";
import { EmployeeFleetPartners } from "./EmployeeFleetPartners";

interface EmployeePartnersHubProps {
  companyId: string;
  canInviteDrivers: boolean;
  canCreateCourses: boolean;
}

export function EmployeePartnersHub({ 
  companyId, 
  canInviteDrivers, 
  canCreateCourses 
}: EmployeePartnersHubProps) {
  const [activeTab, setActiveTab] = useState("drivers");

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-lg overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-primary via-accent to-success" />
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-primary" />
          Partenaires de l'entreprise
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-2 gap-2 bg-muted/30 p-1 rounded-xl mb-4">
            <TabsTrigger 
              value="drivers"
              className="flex items-center gap-2 rounded-lg py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary-light data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all"
            >
              <Car className="w-4 h-4" />
              <span>Chauffeurs</span>
            </TabsTrigger>
            <TabsTrigger 
              value="fleets"
              className="flex items-center gap-2 rounded-lg py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-accent data-[state=active]:to-success data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
            >
              <Building2 className="w-4 h-4" />
              <span>Gestionnaires de flotte</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="drivers" className="mt-0">
            <EmployeeCompanyDrivers 
              companyId={companyId}
              canInviteDrivers={canInviteDrivers}
              canCreateCourses={canCreateCourses}
            />
          </TabsContent>

          <TabsContent value="fleets" className="mt-0">
            <EmployeeFleetPartners companyId={companyId} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
