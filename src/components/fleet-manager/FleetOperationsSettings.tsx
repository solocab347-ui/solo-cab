import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FleetCourseValidation } from "./FleetCourseValidation";
import { FleetDispatchSettings } from "./FleetDispatchSettings";
import { FleetDriverCommissions } from "./FleetDriverCommissions";
import { FleetCommissionTracker } from "./FleetCommissionTracker";
import { CheckCircle, Zap, Percent, Settings2 } from "lucide-react";

interface FleetOperationsSettingsProps {
  fleetManagerId: string;
  autoValidate: boolean;
  onAutoValidateChange: (value: boolean) => void;
}

export const FleetOperationsSettings = ({
  fleetManagerId,
  autoValidate,
  onAutoValidateChange,
}: FleetOperationsSettingsProps) => {
  const [activeSection, setActiveSection] = useState("validation");

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-br from-primary/5 via-primary/10 to-info/5 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <Settings2 className="w-6 h-6 text-primary" />
            </div>
            Opérations & Gestion
          </CardTitle>
          <CardDescription>
            Gérez la validation des courses, le dispatch automatique et les commissions de vos chauffeurs
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Sub-tabs for sections */}
      <Tabs value={activeSection} onValueChange={setActiveSection} className="space-y-6">
        <div className="bg-muted/30 p-2 rounded-xl">
          <TabsList className="grid w-full grid-cols-3 gap-2 h-auto bg-transparent p-0">
            <TabsTrigger 
              value="validation" 
              className="flex items-center gap-2 py-3 px-4 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-md transition-all"
            >
              <CheckCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Validation</span>
              <Badge variant="outline" className="ml-1 hidden md:flex">
                {autoValidate ? "Auto" : "Manuel"}
              </Badge>
            </TabsTrigger>
            <TabsTrigger 
              value="dispatch" 
              className="flex items-center gap-2 py-3 px-4 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-md transition-all"
            >
              <Zap className="w-4 h-4" />
              <span className="hidden sm:inline">Dispatch</span>
            </TabsTrigger>
            <TabsTrigger 
              value="commissions" 
              className="flex items-center gap-2 py-3 px-4 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-md transition-all"
            >
              <Percent className="w-4 h-4" />
              <span className="hidden sm:inline">Commissions</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Validation Section */}
        <TabsContent value="validation" className="space-y-6 mt-0">
          <FleetCourseValidation
            fleetManagerId={fleetManagerId}
            autoValidate={autoValidate}
            onAutoValidateChange={onAutoValidateChange}
          />
        </TabsContent>

        {/* Dispatch Section */}
        <TabsContent value="dispatch" className="space-y-6 mt-0">
          <FleetDispatchSettings fleetManagerId={fleetManagerId} />
        </TabsContent>

        {/* Commissions Section */}
        <TabsContent value="commissions" className="space-y-6 mt-0">
          <FleetDriverCommissions fleetManagerId={fleetManagerId} />
          <FleetCommissionTracker fleetManagerId={fleetManagerId} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
