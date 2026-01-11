import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Search, QrCode, ArrowRight } from "lucide-react";

interface NoDriversBannerProps {
  variant?: "full" | "compact";
  onScanQR?: () => void;
}

export function NoDriversBanner({ variant = "full", onScanQR }: NoDriversBannerProps) {
  const navigate = useNavigate();

  if (variant === "compact") {
    return (
      <Card className="p-4 border-amber-500/50 bg-gradient-to-br from-amber-500/10 to-orange-500/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">Aucun chauffeur</p>
            <p className="text-xs text-muted-foreground">Ajoutez un chauffeur pour réserver</p>
          </div>
          <Button
            size="sm"
            onClick={() => navigate("/chauffeurs")}
            className="gap-1 flex-shrink-0"
          >
            <Search className="w-3 h-3" />
            Chercher
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 border-amber-500/50 bg-gradient-to-br from-amber-500/10 to-orange-500/10">
      <div className="flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center mb-4">
          <AlertTriangle className="w-8 h-8 text-amber-500" />
        </div>
        <h3 className="text-lg font-bold mb-2">Aucun chauffeur associé</h3>
        <p className="text-muted-foreground mb-6 max-w-sm">
          Pour commencer à réserver des courses, vous devez d'abord ajouter un chauffeur à votre compte.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
          <Button
            onClick={() => navigate("/chauffeurs")}
            className="flex-1 gap-2"
          >
            <Search className="w-4 h-4" />
            Trouver un chauffeur
            <ArrowRight className="w-4 h-4" />
          </Button>
          {onScanQR && (
            <Button
              variant="outline"
              onClick={onScanQR}
              className="flex-1 gap-2"
            >
              <QrCode className="w-4 h-4" />
              Scanner un QR
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
