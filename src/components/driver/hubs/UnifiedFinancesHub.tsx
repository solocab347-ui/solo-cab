/**
 * Hub Finances unifié - Regroupe Devis, Factures, Finances Stripe et Encaisser
 */

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, CreditCard, Wallet, Zap } from "lucide-react";
import { PremiumGate } from "@/components/premium/PremiumGate";
import DriverDevisList from "@/components/driver/payments/DriverDevisList";
import DriverFacturesList from "@/components/driver/payments/DriverFacturesList";
import { DriverFinancePage } from "@/components/driver/finance/DriverFinancePage";
import { SpontaneousPayment } from "@/components/driver/finance/SpontaneousPayment";

interface UnifiedFinancesHubProps {
  driverId: string;
  isPremium: boolean;
  stripeEnabled: boolean;
  defaultTab?: string;
}

export const UnifiedFinancesHub = ({ driverId, isPremium, stripeEnabled, defaultTab = "overview" }: UnifiedFinancesHubProps) => {
  const [activeTab, setActiveTab] = useState(defaultTab);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-xl flex items-center justify-center">
          <Wallet className="w-5 h-5 text-amber-500" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Finances</h2>
          <p className="text-sm text-muted-foreground">Gérez vos revenus, devis et factures</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full grid grid-cols-4 bg-muted/30 backdrop-blur-sm border border-border/50">
          <TabsTrigger value="overview" className="gap-1.5 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Wallet className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Vue</span> générale
          </TabsTrigger>
          <TabsTrigger value="devis" className="gap-1.5 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <FileText className="w-3.5 h-3.5" />
            Devis
          </TabsTrigger>
          <TabsTrigger value="factures" className="gap-1.5 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <CreditCard className="w-3.5 h-3.5" />
            Factures
          </TabsTrigger>
          <TabsTrigger value="encaisser" className="gap-1.5 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Zap className="w-3.5 h-3.5" />
            Encaisser
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <DriverFinancePage driverId={driverId} />
        </TabsContent>

        <TabsContent value="devis" className="mt-4">
          <DriverDevisList driverId={driverId} />
        </TabsContent>

        <TabsContent value="factures" className="mt-4">
          <DriverFacturesList driverId={driverId} />
        </TabsContent>

        <TabsContent value="encaisser" className="mt-4">
          {isPremium ? (
            <SpontaneousPayment driverId={driverId} stripeEnabled={stripeEnabled} />
          ) : (
            <PremiumGate isPremium={false} featureName="Encaissement spontané" featureDescription="Encaissez vos clients directement via Stripe Connect." />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
