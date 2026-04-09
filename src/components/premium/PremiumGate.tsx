import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePremium } from "@/hooks/usePremium";
import { Crown, Lock, Star, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface PremiumGateProps {
  feature: string;
  children: React.ReactNode;
  description?: string;
}

export function PremiumGate({ feature, children, description }: PremiumGateProps) {
  const { isPremium, loading } = usePremium();

  if (loading) return <>{children}</>;
  if (isPremium) return <>{children}</>;

  return (
    <PremiumLockOverlay feature={feature} description={description}>
      {children}
    </PremiumLockOverlay>
  );
}

function PremiumLockOverlay({ feature, description, children }: PremiumGateProps) {
  const [loadingCheckout, setLoadingCheckout] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "yearly">("monthly");
  const { openCheckout } = usePremium();

  const handleUpgrade = async () => {
    try {
      setLoadingCheckout(true);
      await openCheckout(selectedPlan);
    } catch {
      toast.error("Erreur lors de l'ouverture du paiement");
    } finally {
      setLoadingCheckout(false);
    }
  };

  return (
    <div className="relative">
      <div className="pointer-events-none opacity-30 blur-[2px] select-none">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center p-4 z-10">
        <Card className="max-w-sm w-full border-2 border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-orange-500/10 shadow-xl">
          <CardContent className="p-5 space-y-4">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center mx-auto">
                <Crown className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-bold text-base">
                <Lock className="h-4 w-4 inline mr-1" />
                Fonctionnalité Premium
              </h3>
              <p className="text-xs text-muted-foreground">
                {description || `"${feature}" est disponible avec l'abonnement Premium.`}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setSelectedPlan("monthly")}
                className={`p-2.5 rounded-lg border-2 text-left transition-all ${
                  selectedPlan === "monthly"
                    ? "border-amber-500 bg-amber-500/10"
                    : "border-border hover:border-amber-500/30"
                }`}
              >
                <p className="text-xs font-medium">Mensuel</p>
                <p className="text-lg font-bold">19,99€</p>
                <p className="text-[10px] text-muted-foreground">/mois</p>
              </button>
              <button
                onClick={() => setSelectedPlan("yearly")}
                className={`p-2.5 rounded-lg border-2 text-left transition-all relative ${
                  selectedPlan === "yearly"
                    ? "border-amber-500 bg-amber-500/10"
                    : "border-border hover:border-amber-500/30"
                }`}
              >
                <Badge className="absolute -top-2 -right-1 bg-green-600 text-white text-[9px] px-1.5">
                  -20%
                </Badge>
                <p className="text-xs font-medium">Annuel</p>
                <p className="text-lg font-bold">191,90€</p>
                <p className="text-[10px] text-muted-foreground">~15,99€/mois</p>
              </button>
            </div>

            <div className="space-y-1.5">
              {["Encaissements spontanés", "Objectifs & Rentabilité", "Planning avancé", "Partenariats"].map((f) => (
                <div key={f} className="flex items-center gap-2 text-xs">
                  <CheckCircle2 className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                  <span>{f}</span>
                </div>
              ))}
            </div>

            <Button
              onClick={handleUpgrade}
              disabled={loadingCheckout}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white"
            >
              {loadingCheckout ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Star className="h-4 w-4 mr-2" />
              )}
              Passer en Premium
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default PremiumGate;
