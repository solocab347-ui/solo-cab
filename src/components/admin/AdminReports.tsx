import { Card } from "@/components/ui/card";
import { Flag } from "lucide-react";

const AdminReports = () => {
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
            <Flag className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Signalements & Litiges</h2>
            <p className="text-muted-foreground">Modération et gestion des litiges</p>
          </div>
        </div>
        <p className="text-muted-foreground">Fonctionnalité en cours de développement...</p>
      </Card>
    </div>
  );
};

export default AdminReports;
