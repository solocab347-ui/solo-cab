/**
 * Hub Outils unifié - Regroupe Calculateur, QR Code et Prospection
 */

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wrench, Calculator, QrCode, Sparkles, Calendar } from "lucide-react";
import { PremiumGate } from "@/components/premium/PremiumGate";
import { PriceCalculator } from "@/components/driver/courses/PriceCalculator";
import QRCodeDisplay from "@/components/driver/QRCodeDisplay";
import DriverProspectionFlyer from "@/components/driver/DriverProspectionFlyer";
import DriverPlanning from "@/components/driver/planning/DriverPlanning";
import { OutOfScheduleAlerts } from "@/components/driver/planning/OutOfScheduleAlerts";

interface UnifiedToolsHubProps {
  driverProfile: any;
  driverId: string;
  isPremium: boolean;
  qrCode: any;
  loadingQR: boolean;
  defaultTab?: string;
}

export const UnifiedToolsHub = ({ driverProfile, driverId, isPremium, qrCode, loadingQR, defaultTab = "calculator" }: UnifiedToolsHubProps) => {
  const [activeTab, setActiveTab] = useState(defaultTab);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 bg-gradient-to-br from-pink-500/20 to-rose-500/20 rounded-xl flex items-center justify-center">
          <Wrench className="w-5 h-5 text-pink-500" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Outils</h2>
          <p className="text-sm text-muted-foreground">Calculateur, QR Code, planning & prospection</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full grid grid-cols-4 bg-muted/30 backdrop-blur-sm border border-border/50">
          <TabsTrigger value="calculator" className="gap-1 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Calculator className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Calcul</span>
          </TabsTrigger>
          <TabsTrigger value="planning" className="gap-1 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Calendar className="w-3.5 h-3.5" />
            Planning
          </TabsTrigger>
          <TabsTrigger value="qrcode" className="gap-1 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <QrCode className="w-3.5 h-3.5" />
            QR Code
          </TabsTrigger>
          <TabsTrigger value="prospection" className="gap-1 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Sparkles className="w-3.5 h-3.5" />
            Flyers
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calculator" className="mt-4">
          <PriceCalculator driverProfile={driverProfile} />
        </TabsContent>

        <TabsContent value="planning" className="mt-4">
          {isPremium ? (
            <>
              <OutOfScheduleAlerts driverId={driverId} />
              <DriverPlanning driverId={driverId} />
            </>
          ) : (
            <PremiumGate isPremium={false} featureName="Planning des courses" featureDescription="Visualisez et gérez votre planning de courses." />
          )}
        </TabsContent>

        <TabsContent value="qrcode" className="mt-4">
          <QRCodeDisplay qrCode={qrCode} loadingQR={loadingQR} driverProfile={driverProfile} />
        </TabsContent>

        <TabsContent value="prospection" className="mt-4">
          {isPremium ? (
            <DriverProspectionFlyer qrCode={qrCode} driverProfile={driverProfile} />
          ) : (
            <PremiumGate isPremium={false} featureName="Prospection avancée" featureDescription="Générez des flyers personnalisés pour développer votre clientèle." />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
