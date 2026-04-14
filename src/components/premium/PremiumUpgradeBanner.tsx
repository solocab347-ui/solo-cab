import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, Loader2, ArrowRight, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PremiumUpgradeBannerProps {
  /** Contextual message to show */
  message?: string;
  /** Compact mode for embedding in sections */
  compact?: boolean;
}

/**
 * Bannière CTA Premium contextuelle.
 * S'affiche uniquement pour les utilisateurs Free.
 * Propose l'abonnement direct à 19,99€/mois.
 */
export function PremiumUpgradeBanner({ 
  message = "Débloquez tout le potentiel de SoloCab",
  compact = false 
}: PremiumUpgradeBannerProps) {
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-premium-checkout");
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("Pas d'URL de paiement reçue");
      }
    } catch (error: any) {
      console.error("Error creating premium checkout:", error);
      toast.error("Erreur lors de la redirection vers le paiement");
    } finally {
      setLoading(false);
    }
  };

  if (compact) {
    return (
      <div 
        onClick={handleUpgrade}
        className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 cursor-pointer hover:from-amber-500/15 hover:to-orange-500/15 transition-all"
      >
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0">
          <Crown className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{message}</p>
          <p className="text-xs text-muted-foreground">19,99€/mois</p>
        </div>
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
        ) : (
          <ArrowRight className="w-4 h-4 text-amber-500 flex-shrink-0" />
        )}
      </div>
    );
  }

  return (
    <Card className="border-amber-500/20 bg-gradient-to-r from-amber-500/5 via-background to-orange-500/5 overflow-hidden">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20 flex-shrink-0">
            <Crown className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-sm sm:text-base text-foreground">{message}</h3>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Campagnes, prospection, partenariats et plus encore
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <Badge variant="outline" className="border-amber-500/40 text-amber-600 bg-amber-500/10 text-[10px]">
              <Zap className="w-3 h-3 mr-0.5" /> Premium
            </Badge>
            <Button 
              onClick={handleUpgrade}
              disabled={loading}
              size="sm"
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold"
            >
              {loading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <>19,99€/mois</>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
