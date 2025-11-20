import { Card } from "@/components/ui/card";
import { Activity } from "lucide-react";

const AdminSubscriptions = () => {
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Gestion des Abonnements</h2>
            <p className="text-muted-foreground">Gérer les souscriptions des chauffeurs</p>
          </div>
        </div>
        <p className="text-muted-foreground">Fonctionnalité en cours de développement...</p>
      </Card>
    </div>
  );
};

export default AdminSubscriptions;
