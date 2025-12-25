import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FleetClientInvitations } from "@/components/fleet-manager/FleetClientInvitations";
import { FleetClientsList } from "@/components/fleet-manager/FleetClientsList";
import { FleetStorefrontManager } from "@/components/fleet-manager/FleetStorefrontManager";
import {
  Users,
  Send,
  Store,
  ExternalLink,
  Globe,
} from "lucide-react";

interface FleetClient {
  id: string;
  client_id: string;
  registered_at: string;
  client?: {
    id: string;
    user_id: string;
    total_rides: number;
    profile?: {
      full_name: string;
      email: string;
    };
  };
}

interface FleetClientsTabProps {
  fleetManagerId: string;
  clients: FleetClient[];
  onNavigateToSettings?: () => void;
}

export const FleetClientsTab = ({ fleetManagerId, clients, onNavigateToSettings }: FleetClientsTabProps) => {
  const [activeSubTab, setActiveSubTab] = useState("list");

  return (
    <div className="space-y-6">
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="space-y-6">
        <div className="glass-strong p-3 rounded-2xl">
          <TabsList className="grid w-full grid-cols-3 gap-2 h-auto bg-transparent p-0">
            <TabsTrigger 
              value="list"
              className="flex items-center gap-2 py-3 px-4 rounded-xl transition-all data-[state=active]:bg-gradient-to-br data-[state=active]:from-success data-[state=active]:to-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-success"
            >
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Mes Clients</span>
              <span className="sm:hidden">Clients</span>
            </TabsTrigger>
            <TabsTrigger 
              value="invitations"
              className="flex items-center gap-2 py-3 px-4 rounded-xl transition-all data-[state=active]:bg-gradient-to-br data-[state=active]:from-warning data-[state=active]:to-orange-600 data-[state=active]:text-white data-[state=active]:shadow-warning"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Invitations</span>
              <span className="sm:hidden">Inviter</span>
            </TabsTrigger>
            <TabsTrigger 
              value="storefront"
              className="flex items-center gap-2 py-3 px-4 rounded-xl transition-all data-[state=active]:bg-gradient-to-br data-[state=active]:from-primary data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-trust"
            >
              <Store className="w-4 h-4" />
              <span className="hidden sm:inline">Vitrine</span>
              <span className="sm:hidden">Vitrine</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="list" className="space-y-4">
          <FleetClientsList clients={clients} />
        </TabsContent>

        <TabsContent value="invitations" className="space-y-4">
          <FleetClientInvitations fleetManagerId={fleetManagerId} />
        </TabsContent>

        <TabsContent value="storefront" className="space-y-4">
          <Card className="bg-card/50 backdrop-blur border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="w-5 h-5 text-primary" />
                Gérer ma Vitrine Publique
              </CardTitle>
              <CardDescription>
                Personnalisez votre page publique pour attirer de nouveaux clients
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  variant="default"
                  className="flex-1 gap-2"
                  onClick={() => window.open(`/flotte/${fleetManagerId}`, '_blank')}
                >
                  <ExternalLink className="w-4 h-4" />
                  Voir ma vitrine publique
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={onNavigateToSettings}
                >
                  <Globe className="w-4 h-4" />
                  Paramètres de la vitrine
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Accédez aux paramètres pour personnaliser votre vitrine, ajouter vos services, 
                et configurer l'affichage de vos chauffeurs.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
