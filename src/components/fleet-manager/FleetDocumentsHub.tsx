import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Building2, 
  Users, 
  FolderArchive, 
  Settings,
  FileCheck,
  ClipboardList,
  Shield
} from "lucide-react";
import { FleetManagerDocuments } from "./FleetManagerDocuments";
import { FleetRequiredDocumentsManager } from "./FleetRequiredDocumentsManager";
import { FleetDriversDocumentsReview } from "./FleetDriversDocumentsReview";
import { FleetDriverDocumentsArchive } from "./FleetDriverDocumentsArchive";

interface FleetDocumentsHubProps {
  fleetManagerId: string;
  userId: string;
  onDocumentsSubmitted?: () => void;
}

export const FleetDocumentsHub = ({ 
  fleetManagerId, 
  userId, 
  onDocumentsSubmitted 
}: FleetDocumentsHubProps) => {
  const [activeTab, setActiveTab] = useState("mes-documents");

  const tabs = [
    {
      id: "mes-documents",
      label: "Mes Documents",
      shortLabel: "Mes Docs",
      icon: Building2,
      description: "Documents obligatoires de votre entreprise",
      color: "from-blue-500/20 to-blue-600/10",
      borderColor: "border-blue-500/30",
    },
    {
      id: "documents-requis",
      label: "Documents Requis",
      shortLabel: "Requis",
      icon: ClipboardList,
      description: "Configurez les documents demandés aux chauffeurs",
      color: "from-purple-500/20 to-purple-600/10",
      borderColor: "border-purple-500/30",
    },
    {
      id: "documents-chauffeurs",
      label: "Documents Chauffeurs",
      shortLabel: "Chauffeurs",
      icon: Users,
      description: "Validez les documents soumis par vos chauffeurs",
      color: "from-green-500/20 to-green-600/10",
      borderColor: "border-green-500/30",
    },
    {
      id: "archives",
      label: "Archives",
      shortLabel: "Archives",
      icon: FolderArchive,
      description: "Accédez à l'historique des documents",
      color: "from-orange-500/20 to-orange-600/10",
      borderColor: "border-orange-500/30",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20 overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20">
              <FileText className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-1">Centre de Documents</h2>
              <p className="text-muted-foreground">
                Gérez tous vos documents au même endroit : vos documents d'entreprise, 
                ceux de vos chauffeurs et les archives.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        {/* Desktop Tabs */}
        <div className="hidden md:block">
          <div className="grid grid-cols-4 gap-3">
            {tabs.map((tab) => {
              const TabIcon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`p-4 rounded-xl border-2 transition-all text-left ${
                    isActive 
                      ? `bg-gradient-to-br ${tab.color} ${tab.borderColor} shadow-lg` 
                      : "bg-card/50 border-border/50 hover:border-primary/30 hover:bg-muted/30"
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`p-2 rounded-lg ${isActive ? "bg-background/50" : "bg-muted"}`}>
                      <TabIcon className={`w-5 h-5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                    </div>
                    <span className={`font-semibold ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
                      {tab.label}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {tab.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Mobile Tabs */}
        <div className="md:hidden">
          <TabsList className="grid w-full grid-cols-4 h-auto p-1">
            {tabs.map((tab) => {
              const TabIcon = tab.icon;
              return (
                <TabsTrigger 
                  key={tab.id} 
                  value={tab.id}
                  className="flex flex-col items-center gap-1 py-3 px-2"
                >
                  <TabIcon className="w-5 h-5" />
                  <span className="text-[10px] leading-tight text-center">
                    {tab.shortLabel}
                  </span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        {/* Tab Contents */}
        <TabsContent value="mes-documents" className="mt-0">
          <FleetManagerDocuments 
            fleetManagerId={fleetManagerId}
            userId={userId}
            onDocumentsSubmitted={onDocumentsSubmitted}
          />
        </TabsContent>

        <TabsContent value="documents-requis" className="mt-0">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20">
                  <ClipboardList className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <CardTitle>Documents Requis pour les Chauffeurs</CardTitle>
                  <CardDescription>
                    Définissez les documents que vos chauffeurs doivent fournir pour rejoindre votre flotte
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <FleetRequiredDocumentsManager fleetManagerId={fleetManagerId} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents-chauffeurs" className="mt-0">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-green-500/10 border border-green-500/20">
                  <FileCheck className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <CardTitle>Validation des Documents Chauffeurs</CardTitle>
                  <CardDescription>
                    Vérifiez et validez les documents soumis par vos chauffeurs
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <FleetDriversDocumentsReview fleetManagerId={fleetManagerId} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="archives" className="mt-0">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-orange-500/10 border border-orange-500/20">
                  <FolderArchive className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <CardTitle>Archives des Documents</CardTitle>
                  <CardDescription>
                    Consultez l'historique complet des documents de tous vos chauffeurs
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <FleetDriverDocumentsArchive fleetManagerId={fleetManagerId} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FleetDocumentsHub;