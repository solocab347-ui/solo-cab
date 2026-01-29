import { useState, useCallback } from "react";
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
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface SubscriptionManagementCardProps {
  /** Type d'utilisateur */
  userType: "driver" | "fleet_manager";
  /** A un customer ID Stripe */
  hasStripeCustomer: boolean;
  /** Abonnement actif */
  isActive: boolean;
  /** En période d'essai */
  isInTrialPeriod?: boolean;
  /** Date de fin d'essai */
  trialEndDate?: Date;
  /** Date du prochain prélèvement */
  nextBillingDate?: string | null;
  /** Montant du prochain prélèvement */
  nextBillingAmount?: number | null;
  /** Abonnement programmé pour résiliation */
  cancelAtPeriodEnd?: boolean;
  /** Date de fin effective si résiliation programmée */
  cancelAt?: string | null;
  /** Callback optionnel avant d'ouvrir le portal */
  onBeforeOpenPortal?: () => Promise<boolean> | boolean;
  /** Callback après gestion */
  onAfterManage?: () => void;
}

export const SubscriptionManagementCard = ({
  userType,
  hasStripeCustomer,
  isActive,
  isInTrialPeriod = false,
  trialEndDate,
  nextBillingDate,
  nextBillingAmount,
  cancelAtPeriodEnd = false,
  cancelAt,
  onBeforeOpenPortal,
  onAfterManage
}: SubscriptionManagementCardProps) => {
  const [loading, setLoading] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showTrialCancelConfirm, setShowTrialCancelConfirm] = useState(false);

  const trialDaysLeft = trialEndDate 
    ? Math.max(0, differenceInDays(trialEndDate, new Date()))
    : 0;

  const handleOpenPortal = useCallback(async (action?: "payment_method" | "cancel" | "invoices") => {
    // Callback optionnel avant ouverture (ex: avertissement Pioneer) - uniquement pour cancel
    if (action === "cancel" && onBeforeOpenPortal) {
      const shouldContinue = await onBeforeOpenPortal();
      if (!shouldContinue) return;
    }

    setLoading(action || "general");
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal", {
        body: { action }
      });
      
      if (error) throw error;
      
      if (data?.url) {
        // Ouvrir dans un nouvel onglet pour mobile
        window.open(data.url, "_blank", "noopener,noreferrer");
        
        toast.success(
          action === "payment_method" 
            ? "Portail de paiement ouvert" 
            : action === "cancel"
            ? "Portail de résiliation ouvert"
            : action === "invoices"
            ? "Portail des factures ouvert"
            : "Portail de gestion ouvert",
          {
            description: "Revenez ici une fois vos modifications effectuées"
          }
        );
        
        // Rafraîchir après un délai plus long pour laisser le temps de faire les changements
        setTimeout(() => {
          onAfterManage?.();
        }, 5000);
      } else {
        throw new Error("Aucune URL reçue");
      }
    } catch (error: any) {
      console.error("Error opening customer portal:", error);
      toast.error("Erreur lors de l'ouverture du portail", {
        description: error.message || "Veuillez réessayer"
      });
    } finally {
      setLoading(null);
    }
  }, [onBeforeOpenPortal, onAfterManage]);

  const handleCancelClick = useCallback(() => {
    setShowCancelConfirm(true);
  }, []);

  const handleTrialCancelClick = useCallback(() => {
    setShowTrialCancelConfirm(true);
  }, []);

  const handleCancelConfirm = useCallback(async () => {
    setShowCancelConfirm(false);
    await handleOpenPortal("cancel");
  }, [handleOpenPortal]);

  // Annuler l'essai (sans Stripe customer)
  const handleTrialCancelConfirm = useCallback(async () => {
    setShowTrialCancelConfirm(false);
    setLoading("cancel_trial");
    try {
      const { data, error } = await supabase.functions.invoke("cancel-trial");
      
      if (error) throw error;
      
      if (data?.success) {
        toast.success("Essai annulé", {
          description: `Votre accès reste actif jusqu'au ${trialEndDate ? format(trialEndDate, "d MMMM yyyy", { locale: fr }) : "fin de la période d'essai"}.`
        });
        onAfterManage?.();
      } else {
        throw new Error(data?.error || "Erreur lors de l'annulation");
      }
    } catch (error: any) {
      console.error("Error canceling trial:", error);
      toast.error("Erreur lors de l'annulation", {
        description: error.message || "Veuillez réessayer"
      });
    } finally {
      setLoading(null);
    }
  }, [trialEndDate, onAfterManage]);

  // Réactiver l'abonnement (annuler la résiliation programmée)
  const handleReactivateSubscription = useCallback(async () => {
    setLoading("reactivate");
    try {
      const { data, error } = await supabase.functions.invoke("reactivate-subscription");
      
      if (error) throw error;
      
      if (data?.success) {
        toast.success("Abonnement réactivé avec succès !", {
          description: "Votre abonnement continuera normalement."
        });
        onAfterManage?.();
      } else {
        throw new Error(data?.error || "Erreur lors de la réactivation");
      }
    } catch (error: any) {
      console.error("Error reactivating subscription:", error);
      toast.error("Erreur lors de la réactivation", {
        description: error.message || "Veuillez réessayer"
      });
    } finally {
      setLoading(null);
    }
  }, [onAfterManage]);

  // Afficher la carte dans tous les cas (essai ou abonnement actif)
  if (!isActive && !isInTrialPeriod) {
    return null;
  }

  // Mode essai sans Stripe customer - affichage simplifié
  if (isInTrialPeriod && !hasStripeCustomer) {
    return (
      <>
        {/* Dialog de confirmation d'annulation d'essai */}
        <AlertDialog open={showTrialCancelConfirm} onOpenChange={setShowTrialCancelConfirm}>
          <AlertDialogContent className="max-w-[90vw] sm:max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="w-5 h-5" />
                Annuler votre période d'essai ?
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-3">
                <p>
                  Vous êtes sur le point d'annuler votre période d'essai SoloCab.
                </p>
                <div className="bg-blue-500/10 p-3 rounded-lg text-sm border border-blue-500/30">
                  <p className="font-medium text-blue-600 dark:text-blue-400 mb-1">
                    Bonne nouvelle !
                  </p>
                  <p className="text-muted-foreground">
                    Votre accès restera actif jusqu'au{" "}
                    <span className="font-semibold">
                      {trialEndDate ? format(trialEndDate, "d MMMM yyyy", { locale: fr }) : "fin de la période d'essai"}
                    </span>.
                    Aucun paiement ne sera prélevé.
                  </p>
                </div>
                <div className="bg-destructive/10 p-3 rounded-lg text-sm">
                  <p className="font-medium text-destructive mb-1">Après cette date, vous perdrez :</p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1">
                    <li>L'accès à votre page de réservation publique</li>
                    <li>La gestion de vos clients et courses</li>
                    <li>Les outils de facturation et devis</li>
                    <li>Votre visibilité auprès des entreprises</li>
                  </ul>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col sm:flex-row gap-2">
              <AlertDialogCancel className="w-full sm:w-auto">
                Continuer l'essai
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleTrialCancelConfirm}
                className="w-full sm:w-auto bg-destructive hover:bg-destructive/90"
              >
                Confirmer l'annulation
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Card className="p-4 sm:p-6 bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 border-2 border-primary/30 shadow-lg">
          <div className="space-y-4">
            {/* En-tête */}
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
                    Période d'essai en cours
                  </p>
                </div>
              </div>
              <Badge className="bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {trialDaysLeft} jour{trialDaysLeft > 1 ? "s" : ""} restant{trialDaysLeft > 1 ? "s" : ""}
              </Badge>
            </div>

            {/* Info essai */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3 bg-background/60 rounded-lg border border-border/50">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <span className="text-sm text-muted-foreground">Fin de l'essai :</span>
              </div>
              <span className="font-semibold text-sm ml-6 sm:ml-0">
                {trialEndDate ? format(trialEndDate, "d MMMM yyyy", { locale: fr }) : "Non défini"}
              </span>
            </div>

            {/* Note info - options disponibles après conversion */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-sm text-muted-foreground">
              <p className="flex items-start gap-2">
                <CreditCard className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                <span>
                  <strong className="text-foreground">Après souscription :</strong> vous pourrez modifier votre carte bancaire et consulter vos factures.
                </span>
              </p>
            </div>

            {/* Bouton résilier l'essai */}
            <div className="pt-3 border-t border-border/50">
              <Button
                onClick={handleTrialCancelClick}
                disabled={loading !== null}
                variant="ghost"
                className="w-full h-auto py-4 text-destructive/80 hover:text-destructive hover:bg-destructive/10 transition-all touch-manipulation active:scale-[0.98]"
              >
                {loading === "cancel_trial" ? (
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <XCircle className="w-5 h-5 mr-2" />
                )}
                <span className="font-medium">Ne pas continuer après l'essai</span>
              </Button>
              <p className="text-xs text-center text-muted-foreground mt-2">
                Votre accès restera actif jusqu'à la fin de l'essai
              </p>
            </div>
          </div>
        </Card>
      </>
    );
  }

  // Mode abonnement avec Stripe customer
  return (
    <>
      {/* Dialog de confirmation de résiliation */}
      <AlertDialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <AlertDialogContent className="max-w-[90vw] sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Résilier votre abonnement ?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Vous êtes sur le point de résilier votre abonnement SoloCab.
              </p>
              <div className="bg-destructive/10 p-3 rounded-lg text-sm">
                <p className="font-medium text-destructive mb-1">En résiliant, vous perdrez :</p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>L'accès à votre page de réservation publique</li>
                  <li>La gestion de vos clients et courses</li>
                  <li>Les outils de facturation et devis</li>
                  <li>Votre visibilité auprès des entreprises</li>
                </ul>
              </div>
              <p className="text-sm">
                Vous serez redirigé vers Stripe pour finaliser la résiliation.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="w-full sm:w-auto">
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleCancelConfirm}
              className="w-full sm:w-auto bg-destructive hover:bg-destructive/90"
            >
              Continuer vers la résiliation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
            <Badge variant="secondary" className={`flex items-center gap-1 ${
              cancelAtPeriodEnd 
                ? "bg-orange-500/20 text-orange-700 dark:text-orange-400 border-orange-500/30"
                : "bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30"
            }`}>
              {cancelAtPeriodEnd ? (
                <>
                  <AlertTriangle className="w-3 h-3" />
                  Résiliation prévue
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3 h-3" />
                  Actif
                </>
              )}
            </Badge>
          </div>

          {/* Alerte de résiliation programmée */}
          {cancelAtPeriodEnd && cancelAt && (
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-medium text-orange-700 dark:text-orange-400">
                    Résiliation programmée
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Votre abonnement prendra fin le{" "}
                    <span className="font-semibold">
                      {format(new Date(cancelAt), "d MMMM yyyy", { locale: fr })}
                    </span>.
                    Vous conservez l'accès complet jusqu'à cette date.
                  </p>
                </div>
              </div>
              <Button
                onClick={handleReactivateSubscription}
                disabled={loading !== null}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white"
              >
                {loading === "reactivate" ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Annuler la résiliation et continuer
              </Button>
            </div>
          )}

          {/* Prochain prélèvement - Masqué si résiliation programmée */}
          {!cancelAtPeriodEnd && (nextBillingDate || nextBillingAmount) && (
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

          {/* Actions principales - optimisées pour mobile */}
          <div className="space-y-3">
            {/* Modifier la carte bancaire - Action principale */}
            <Button
              onClick={() => handleOpenPortal("payment_method")}
              disabled={loading !== null}
              className="w-full h-auto py-4 px-4 flex items-center justify-between gap-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white transition-all touch-manipulation active:scale-[0.98]"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <span className="font-semibold text-base block">Modifier ma carte bancaire</span>
                  <span className="text-xs opacity-80">Changer de moyen de paiement</span>
                </div>
              </div>
              {loading === "payment_method" ? (
                <Loader2 className="w-5 h-5 animate-spin flex-shrink-0" />
              ) : (
                <ExternalLink className="w-4 h-4 opacity-60 flex-shrink-0" />
              )}
            </Button>

            {/* Voir les factures */}
            <Button
              onClick={() => handleOpenPortal("invoices")}
              disabled={loading !== null}
              variant="outline"
              className="w-full h-auto py-4 px-4 flex items-center justify-between gap-3 border-2 hover:bg-muted/50 transition-all touch-manipulation active:scale-[0.98]"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-muted rounded-lg">
                  <FileText className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="text-left">
                  <span className="font-semibold text-base block">Mes factures</span>
                  <span className="text-xs text-muted-foreground">Consulter et télécharger</span>
                </div>
              </div>
              {loading === "invoices" ? (
                <Loader2 className="w-5 h-5 animate-spin flex-shrink-0" />
              ) : (
                <ExternalLink className="w-4 h-4 opacity-40 flex-shrink-0" />
              )}
            </Button>
          </div>

          {/* Bouton résilier - séparé et accessible - Masqué si résiliation déjà programmée */}
          {!cancelAtPeriodEnd && (
            <div className="pt-3 border-t border-border/50">
              <Button
                onClick={handleCancelClick}
                disabled={loading !== null}
                variant="ghost"
                className="w-full h-auto py-4 text-destructive/80 hover:text-destructive hover:bg-destructive/10 transition-all touch-manipulation active:scale-[0.98]"
              >
                {loading === "cancel" ? (
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <XCircle className="w-5 h-5 mr-2" />
                )}
                <span className="font-medium">Résilier mon abonnement</span>
              </Button>
            </div>
          )}

          {/* Loader global */}
          {loading && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Ouverture du portail Stripe...</span>
            </div>
          )}

          {/* Note d'information */}
          <p className="text-xs text-center text-muted-foreground pt-2 flex items-center justify-center gap-1">
            <ExternalLink className="w-3 h-3" />
            Vous serez redirigé vers le portail sécurisé Stripe
          </p>
        </div>
      </Card>
    </>
  );
};

export default SubscriptionManagementCard;
