import { Construction, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";

interface MaintenanceModeProps {
  title?: string;
  message?: string;
}

export const MaintenanceMode = ({ 
  title = "Site en maintenance",
  message = "Nous effectuons actuellement une mise à jour importante de notre système de paiement. Le site sera de nouveau accessible très prochainement. Merci de votre patience."
}: MaintenanceModeProps) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
      <Card className="p-8 max-w-lg text-center space-y-6 bg-white shadow-lg">
        <div className="flex justify-center">
          <div className="relative">
            <Construction className="w-20 h-20 text-primary animate-pulse" />
            <AlertCircle className="w-8 h-8 text-amber-500 absolute -bottom-1 -right-1" />
          </div>
        </div>
        
        <div className="space-y-3">
          <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
          <p className="text-gray-600 text-lg leading-relaxed">{message}</p>
        </div>

        <div className="pt-4 border-t border-gray-100">
          <p className="text-sm text-muted-foreground">
            Pour toute urgence, contactez-nous à{" "}
            <a 
              href="mailto:contact@solocab.fr" 
              className="text-primary hover:underline font-medium"
            >
              contact@solocab.fr
            </a>
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
          <span>Mise à jour en cours...</span>
        </div>
      </Card>
    </div>
  );
};
