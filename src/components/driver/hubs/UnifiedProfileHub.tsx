/**
 * Hub Mon Profil unifié - Regroupe Profil public, Réglages (tarifs/véhicule) et Documents
 */

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserCircle, Settings, FolderOpen } from "lucide-react";
import { DriverPublicProfileSimplified } from "@/components/driver/profile/DriverPublicProfileSimplified";
import { DriverSettingsSimplified } from "@/components/driver/settings/DriverSettingsSimplified";
import { UnifiedDocumentsHub } from "@/components/driver/documents/UnifiedDocumentsHub";

interface UnifiedProfileHubProps {
  driverProfile: any;
  userId: string;
  driverId: string;
  isFleetDriver: boolean;
  defaultTab?: string;
  // Profile props passthrough
  profileProps: any;
  settingsProps: any;
}

export const UnifiedProfileHub = ({ 
  driverProfile, userId, driverId, isFleetDriver, defaultTab = "identity",
  profileProps, settingsProps
}: UnifiedProfileHubProps) => {
  const [activeTab, setActiveTab] = useState(defaultTab);

  const tabs = [
    { value: "identity", label: "Identité", icon: UserCircle },
    { value: "settings", label: "Tarifs & Réglages", icon: Settings },
    ...(!isFleetDriver ? [{ value: "documents", label: "Documents", icon: FolderOpen }] : []),
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl flex items-center justify-center">
          <UserCircle className="w-5 h-5 text-blue-500" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Mon Profil</h2>
          <p className="text-sm text-muted-foreground">Identité, tarification et documents</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className={cn("w-full bg-muted/30 backdrop-blur-sm border border-border/50", 
          isFleetDriver ? "grid grid-cols-2" : "grid grid-cols-3"
        )}>
          {tabs.map(tab => (
            <TabsTrigger key={tab.value} value={tab.value} className="gap-1.5 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="identity" className="mt-4">
          {driverProfile ? (
            <DriverPublicProfileSimplified {...profileProps} />
          ) : (
            <div className="text-center py-8 text-muted-foreground">Chargement...</div>
          )}
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          <DriverSettingsSimplified {...settingsProps} />
        </TabsContent>

        {!isFleetDriver && (
          <TabsContent value="documents" className="mt-4">
            <UnifiedDocumentsHub driverId={driverId} userId={userId} isFleetDriver={isFleetDriver} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

import { cn } from "@/lib/utils";
