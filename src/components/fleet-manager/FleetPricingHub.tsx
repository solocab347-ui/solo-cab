import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FleetPricingSettings } from "./FleetPricingSettings";
import { FleetPriceCalculator } from "./FleetPriceCalculator";
import { CityPricingManager } from "../shared/CityPricingManager";
import { Euro, MapPin, Calculator } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

interface FleetPricingHubProps {
  fleetManagerId: string;
}

export const FleetPricingHub = ({ fleetManagerId }: FleetPricingHubProps) => {
  const [activeSection, setActiveSection] = useState("general");

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-br from-warning/5 via-warning/10 to-accent/5 border-warning/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-warning/10">
              <Calculator className="w-6 h-6 text-warning" />
            </div>
            Tarification
          </CardTitle>
          <CardDescription>
            Configurez vos tarifs généraux et vos tarifs spécifiques par ville
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="border-info/30 bg-info/5">
            <Info className="w-4 h-4 text-info" />
            <AlertDescription className="text-sm">
              <strong>Comment ça fonctionne :</strong> La tarification par ville s'applique en priorité 
              lorsque le départ et la destination sont dans la même ville configurée. Sinon, 
              la tarification générale s'applique.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Sub-tabs for sections */}
      <Tabs value={activeSection} onValueChange={setActiveSection} className="space-y-6">
        <div className="bg-muted/30 p-2 rounded-xl">
          <TabsList className="grid w-full grid-cols-3 gap-2 h-auto bg-transparent p-0">
            <TabsTrigger 
              value="general" 
              className="flex items-center gap-2 py-3 px-4 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-md transition-all"
            >
              <Euro className="w-4 h-4" />
              <span className="hidden sm:inline">Tarifs Généraux</span>
              <span className="sm:hidden">Général</span>
            </TabsTrigger>
            <TabsTrigger 
              value="city" 
              className="flex items-center gap-2 py-3 px-4 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-md transition-all"
            >
              <MapPin className="w-4 h-4" />
              <span className="hidden sm:inline">Tarifs par Ville</span>
              <span className="sm:hidden">Villes</span>
            </TabsTrigger>
            <TabsTrigger 
              value="calculator" 
              className="flex items-center gap-2 py-3 px-4 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-md transition-all"
            >
              <Calculator className="w-4 h-4" />
              <span className="hidden sm:inline">Calculateur</span>
              <span className="sm:hidden">Calcul</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* General Pricing Section */}
        <TabsContent value="general" className="space-y-6 mt-0">
          <FleetPricingSettings fleetManagerId={fleetManagerId} />
        </TabsContent>

        {/* City Pricing Section */}
        <TabsContent value="city" className="space-y-6 mt-0">
          <CityPricingManager fleetManagerId={fleetManagerId} />
        </TabsContent>

        {/* Price Calculator Section */}
        <TabsContent value="calculator" className="space-y-6 mt-0">
          <FleetPriceCalculator fleetManagerId={fleetManagerId} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
