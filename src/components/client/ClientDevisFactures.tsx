import { useState, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FileText, Receipt } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import DevisList from "@/components/DevisList";
import ClientFacturesList from "@/components/client/ClientFacturesList";

interface ClientDevisFacturesProps {
  clientId: string;
  defaultTab?: string | null;
  userEmail?: string | null;
  userPhone?: string | null;
}

const ClientDevisFactures = ({ clientId, defaultTab, userEmail, userPhone }: ClientDevisFacturesProps) => {
  const [activeTab, setActiveTab] = useState<"devis" | "factures">("devis");

  useEffect(() => {
    if (defaultTab) {
      setActiveTab(defaultTab as "devis" | "factures");
    }
  }, [defaultTab]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
          <FileText className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Devis & Factures</h2>
          <p className="text-muted-foreground">Gérez vos documents</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "devis" | "factures")}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger 
            value="devis" 
            className="data-[state=active]:bg-orange-500/20 data-[state=active]:text-orange-500"
          >
            <FileText className="w-4 h-4 mr-2" />
            Devis
          </TabsTrigger>
          <TabsTrigger 
            value="factures"
            className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-500"
          >
            <Receipt className="w-4 h-4 mr-2" />
            Factures
          </TabsTrigger>
        </TabsList>

        <TabsContent value="devis" className="mt-6">
          <DevisList clientId={clientId} />
        </TabsContent>

        <TabsContent value="factures" className="mt-6">
          <ClientFacturesList clientId={clientId} userEmail={userEmail} userPhone={userPhone} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ClientDevisFactures;
