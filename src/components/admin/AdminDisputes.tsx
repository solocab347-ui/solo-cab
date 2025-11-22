import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

const AdminDisputes = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Signalement et litige
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Section de gestion des signalements et litiges en cours de développement.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDisputes;
