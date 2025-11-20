import { Card } from "@/components/ui/card";
import { Mail } from "lucide-react";

const AdminEmails = () => {
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
            <Mail className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Envoi d'emails</h2>
            <p className="text-muted-foreground">Communication en masse avec les utilisateurs</p>
          </div>
        </div>
        <p className="text-muted-foreground">Fonctionnalité en cours de développement...</p>
      </Card>
    </div>
  );
};

export default AdminEmails;
