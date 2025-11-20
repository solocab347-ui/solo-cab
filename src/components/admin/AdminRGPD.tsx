import { Card } from "@/components/ui/card";
import { Shield } from "lucide-react";

const AdminRGPD = () => {
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-slate-500 to-gray-500 flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">RGPD & Confidentialité</h2>
            <p className="text-muted-foreground">Gestion des données et conformité RGPD</p>
          </div>
        </div>
        <p className="text-muted-foreground">Fonctionnalité en cours de développement...</p>
      </Card>
    </div>
  );
};

export default AdminRGPD;
