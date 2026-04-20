/**
 * Hub Performance unifié - Regroupe Statistiques, Objectifs, Rentabilité et Mes Notes
 */

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Target, PieChart, Star } from "lucide-react";
import { PremiumGate } from "@/components/premium/PremiumGate";
import { DriverStatisticsComplete } from "@/components/driver/stats/DriverStatisticsComplete";
import { ObjectivesDashboard } from "@/components/driver/objectives/ObjectivesDashboard";
import { ProfitabilityCalculator } from "@/components/driver/profitability/ProfitabilityCalculator";
import DriverRatingsView from "@/components/driver/DriverRatingsView";

interface UnifiedPerformanceHubProps {
  driverProfile: any;
  driverId: string;
  isPremium: boolean;
  defaultTab?: string;
}

export const UnifiedPerformanceHub = ({ driverProfile, driverId, isPremium, defaultTab = "stats" }: UnifiedPerformanceHubProps) => {
  const [activeTab, setActiveTab] = useState(defaultTab);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl flex items-center justify-center">
          <BarChart3 className="w-5 h-5 text-purple-500" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Performance</h2>
          <p className="text-sm text-muted-foreground">Analysez et optimisez votre activité</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full grid grid-cols-4 bg-muted/30 backdrop-blur-sm border border-border/50">
          <TabsTrigger value="stats" className="gap-1.5 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <BarChart3 className="w-3.5 h-3.5" />
            Stats
          </TabsTrigger>
          <TabsTrigger value="ratings" className="gap-1.5 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Star className="w-3.5 h-3.5" />
            Mes notes
          </TabsTrigger>
          <TabsTrigger value="objectives" className="gap-1.5 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Target className="w-3.5 h-3.5" />
            Objectifs
          </TabsTrigger>
          <TabsTrigger value="profitability" className="gap-1.5 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <PieChart className="w-3.5 h-3.5" />
            Rentabilité
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stats" className="mt-4">
          <DriverStatisticsComplete driverProfile={driverProfile} />
        </TabsContent>

        <TabsContent value="ratings" className="mt-4">
          <DriverRatingsView />
        </TabsContent>

        <TabsContent value="objectives" className="mt-4">
          {isPremium ? (
            <ObjectivesDashboard driverId={driverId} />
          ) : (
            <PremiumGate isPremium={false} featureName="Objectifs & Coaching IA" featureDescription="Définissez vos objectifs de revenus et recevez un coaching IA personnalisé." />
          )}
        </TabsContent>

        <TabsContent value="profitability" className="mt-4">
          {isPremium ? (
            <ProfitabilityCalculator />
          ) : (
            <PremiumGate isPremium={false} featureName="Calcul de rentabilité" featureDescription="Analysez la rentabilité de votre activité avec des outils de calcul avancés." />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
