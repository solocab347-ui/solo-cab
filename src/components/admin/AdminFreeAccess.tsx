import { Card } from "@/components/ui/card";
import { Gift } from "lucide-react";

const AdminFreeAccess = () => {
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-500 to-teal-500 flex items-center justify-center">
            <Gift className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Accès Gratuits</h2>
            <p className="text-muted-foreground">Suivi des gratuités accordées</p>
          </div>
        </div>
        <p className="text-muted-foreground">Fonctionnalité en cours de développement...</p>
      </Card>
    </div>
  );
};

export default AdminFreeAccess;
