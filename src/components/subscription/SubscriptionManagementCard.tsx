import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  CreditCard, 
  Calendar, 
  Settings, 
  Loader2, 
  ExternalLink,
  FileText,
  XCircle,
  RefreshCw
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface SubscriptionManagementCardProps {
  /** Type d'utilisateur */
  userType: "driver" | "fleet_manager";
  /** A un customer ID Stripe */
  hasStripeCustomer: boolean;
  /** Abonnement actif */
  isActive: boolean;
  /** Date du prochain prélèvement */
  nextBillingDate?: string | null;
  /** Montant du prochain prélèvement */
  nextBillingAmount?: number | null;
  /** Callback optionnel avant d'ouvrir le portal */
  onBeforeOpenPortal?: () => Promise<boolean> | boolean;
  /** Callback après gestion */
  onAfterManage?: () => void;
}

export const SubscriptionManagementCard = ({
  userType,
  hasStripeCustomer,
  isActive,
  nextBillingDate,
  nextBillingAmount,
  onBeforeOpenPortal,
  onAfterManage
}: SubscriptionManagementCardProps) => {
  const [loading, setLoading] = useState(false);

  const handleOpenPortal = async (action?: "payment_method" | "cancel" | "invoices") => {
    // Callback optionnel avant ouverture (ex: avertissement Pioneer) - uniquement pour cancel
    if (action === "cancel" && onBeforeOpenPortal) {
      const shouldContinue = await onBeforeOpenPortal();
      if (!shouldContinue) return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal", {
        body: { action }
      });
      
      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, "_blank");
        
        // Rafraîchir après un délai
        setTimeout(() => {
          onAfterManage?.();
        }, 2000);
      } else {
        throw new Error("Aucune URL reçue");
      }
    } catch (error: any) {
      console.error("Error opening customer portal:", error);
      toast.error("Erreur lors de l'ouverture du portail de gestion");
    } finally {
      setLoading(false);
    }
  };

  // Ne rien afficher si pas de customer Stripe ou pas actif
  if (!hasStripeCustomer || !isActive) {
    return null;
  }

  return (
    <Card className="p-4 sm:p-6 bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 border-2 border-primary/30 shadow-lg">
      <div className="space-y-4">
        {/* En-tête avec titre bien visible */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/20 rounded-xl">
              <Settings className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-foreground">
                Gérer mon abonnement
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Paiement, factures et résiliation
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30">
            Actif
          </Badge>
        </div>

        {/* Prochain prélèvement */}
        {(nextBillingDate || nextBillingAmount) && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3 bg-background/60 rounded-lg border border-border/50">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary flex-shrink-0" />
              <span className="text-sm text-muted-foreground">Prochain prélèvement :</span>
            </div>
            <div className="flex items-center gap-2 ml-6 sm:ml-0">
              {nextBillingDate && (
                <span className="font-semibold text-sm">
                  {format(new Date(nextBillingDate), "d MMMM yyyy", { locale: fr })}
                </span>
              )}
              {nextBillingAmount && (
                <Badge className="bg-primary/20 text-primary border-primary/30">
                  {nextBillingAmount.toFixed(2)} €
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Actions principales - bien visibles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Modifier la carte bancaire */}
          <Button
            onClick={() => handleOpenPortal("payment_method")}
            disabled={loading}
            variant="outline"
            className="h-auto py-3 px-4 flex items-center justify-start gap-3 border-2 border-primary/30 hover:border-primary/50 hover:bg-primary/10 transition-all"
          >
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <CreditCard className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="text-left">
              <span className="font-medium text-sm block">Modifier ma carte</span>
              <span className="text-xs text-muted-foreground">Changer de moyen de paiement</span>
            </div>
          </Button>

          {/* Voir les factures */}
          <Button
            onClick={() => handleOpenPortal("invoices")}
            disabled={loading}
            variant="outline"
            className="h-auto py-3 px-4 flex items-center justify-start gap-3 border-2 border-muted hover:border-muted-foreground/30 hover:bg-muted/50 transition-all"
          >
            <div className="p-2 bg-muted rounded-lg">
              <FileText className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="text-left">
              <span className="font-medium text-sm block">Mes factures</span>
              <span className="text-xs text-muted-foreground">Télécharger vos factures</span>
            </div>
          </Button>
        </div>

        {/* Bouton résilier - séparé et plus discret mais accessible */}
        <div className="pt-2 border-t border-border/50">
          <Button
            onClick={() => handleOpenPortal("cancel")}
            disabled={loading}
            variant="ghost"
            className="w-full h-auto py-3 text-destructive/70 hover:text-destructive hover:bg-destructive/10 transition-all"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <XCircle className="w-4 h-4 mr-2" />
            )}
            <span className="text-sm">Résilier mon abonnement</span>
          </Button>
        </div>

        {/* Loader global */}
        {loading && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Ouverture du portail de gestion...</span>
          </div>
        )}

        {/* Note d'information */}
        <p className="text-xs text-center text-muted-foreground pt-2">
          <ExternalLink className="w-3 h-3 inline mr-1" />
          Vous serez redirigé vers le portail sécurisé Stripe
        </p>
      </div>
    </Card>
  );
};

export default SubscriptionManagementCard;
