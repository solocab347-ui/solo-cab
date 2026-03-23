import { ReactNode, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, Sparkles, ArrowRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PremiumGateProps {
  /** Content to show if user has premium */
  children: ReactNode;
  /** Whether the user has premium access */
  isPremium: boolean;
  /** Feature name for the upgrade prompt */
  featureName: string;
  /** Optional description */
  featureDescription?: string;
  /** If true, shows a subtle inline badge instead of full card */
  inline?: boolean;
}

/**
 * Composant de gating premium.
 * Si l'utilisateur est premium → affiche le contenu enfant.
 * Sinon → affiche un appel à passer premium avec bouton d'upgrade.
 */
export function PremiumGate({ 
  children, 
  isPremium, 
  featureName, 
  featureDescription,
  inline = false 
}: PremiumGateProps) {
  const [loading, setLoading] = useState(false);

  if (isPremium) {
    return <>{children}</>;
  }

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

  if (inline) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20">
        <Crown className="h-4 w-4 text-amber-500 shrink-0" />
        <span className="text-sm text-muted-foreground flex-1">
          {featureName} — <span className="font-medium text-foreground">Fonctionnalité Premium</span>
        </span>
        <Button size="sm" variant="outline" onClick={handleUpgrade} disabled={loading} className="shrink-0 border-amber-500/30 text-amber-600 hover:bg-amber-500/10">
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <>9,99€/mois <ArrowRight className="h-3 w-3 ml-1" /></>}
        </Button>
      </div>
    );
  }

  return (
    <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/5 via-background to-orange-500/5 overflow-hidden">
      <CardContent className="p-6 text-center space-y-4">
        <div className="mx-auto w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
          <Crown className="h-7 w-7 text-white" />
        </div>
        
        <div>
          <Badge variant="outline" className="mb-2 border-amber-500/40 text-amber-600 bg-amber-500/10">
            <Sparkles className="h-3 w-3 mr-1" /> Premium
          </Badge>
          <h3 className="text-lg font-bold">{featureName}</h3>
          {featureDescription && (
            <p className="text-sm text-muted-foreground mt-1">{featureDescription}</p>
          )}
        </div>

        <div className="space-y-2 text-left text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Partenariats entre chauffeurs
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Échange et partage de courses
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Codes promotionnels
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Outils de prospection avancés
          </div>
        </div>

        <Button 
          onClick={handleUpgrade} 
          disabled={loading}
          className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Crown className="h-4 w-4 mr-2" />
          )}
          Passer Premium — 9,99€/mois
        </Button>
        
        <p className="text-xs text-muted-foreground">
          Sans engagement · Résiliable à tout moment
        </p>
      </CardContent>
    </Card>
  );
}
