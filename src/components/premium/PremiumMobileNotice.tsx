import { Card, CardContent } from "@/components/ui/card";
import { Crown, Lock } from "lucide-react";

interface PremiumMobileNoticeProps {
  feature?: string;
  compact?: boolean;
}

/**
 * Message neutre affiché à la place des CTA Premium dans l'app mobile native.
 *
 * Conforme à App Store Guideline 3.1.1 et Google Play Payments Policy :
 * - Aucun bouton d'achat
 * - Aucun lien externe vers un système de paiement
 * - Aucune mention de prix
 * - Aucune redirection
 */
export function PremiumMobileNotice({
  feature = "Cette fonctionnalité",
  compact = false,
}: PremiumMobileNoticeProps) {
  if (compact) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border">
        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
          <Lock className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">
            Fonction réservée aux membres Premium
          </p>
        </div>
      </div>
    );
  }

  return (
    <Card className="border-border bg-muted/30">
      <CardContent className="p-5 text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto">
          <Crown className="w-6 h-6 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-base text-foreground">
          Fonction réservée aux membres Premium
        </h3>
        <p className="text-sm text-muted-foreground">
          {feature} est disponible uniquement pour les membres Premium.
        </p>
      </CardContent>
    </Card>
  );
}

export default PremiumMobileNotice;
