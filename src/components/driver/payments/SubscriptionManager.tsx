import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Check, AlertCircle, Calendar, Gift, Trophy, Loader2, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";
import PioneerCancellationWarning from "../ui/PioneerCancellationWarning";
import { SubscriptionManagementCard } from "@/components/subscription/SubscriptionManagementCard";

interface SubscriptionManagerProps {
  driverProfile: any;
  onSubscriptionUpdate: () => void;
}

const SubscriptionManager = ({ driverProfile, onSubscriptionUpdate }: SubscriptionManagerProps) => {
  const [loading, setLoading] = useState(false);
  const [managingSubscription, setManagingSubscription] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<any>(null);
  const [showPioneerWarning, setShowPioneerWarning] = useState(false);
  const [resubscribing, setResubscribing] = useState(false);

  // Pioneer-specific values
  const isPioneer = driverProfile?.driver?.is_pioneer === true;
  const pioneerStatusLost = driverProfile?.driver?.pioneer_status_lost === true;
  const pioneerTrialEnd = driverProfile?.driver?.free_access_end_date;
  const pioneerTrialDaysLeft = pioneerTrialEnd 
    ? Math.max(0, differenceInDays(new Date(pioneerTrialEnd), new Date())) 
    : null;

  // Helper functions for portal management
  const openCustomerPortal = async () => {
    setManagingSubscription(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      } else {
        throw new Error("No portal URL received");
      }
    } catch (error: any) {
      console.error("Error opening customer portal:", error);
      toast.error("Erreur lors de l'ouverture du portail de gestion");
    } finally {
      setManagingSubscription(false);
    }
  };

  const handleManageSubscription = async () => {
    if (isPioneer && !pioneerStatusLost) {
      setShowPioneerWarning(true);
      return;
    }
    await openCustomerPortal();
  };

  const handlePioneerWarningConfirm = async () => {
    setShowPioneerWarning(false);
    await openCustomerPortal();
  };

  const handlePioneerWarningCancel = () => {
    setShowPioneerWarning(false);
    toast.success("Votre abonnement Pioneer est préservé ! 🏆");
  };

  // NOUVEAU: Calcul synchrone du statut d'accès (évite le flickering)
  const calculateAccessStatus = () => {
    const driver = driverProfile?.driver;
    if (!driver) return { hasFullAccess: false, isInTrialPeriod: false, trialDaysLeft: 0 };

    const now = new Date();
    const createdAt = driver.created_at ? new Date(driver.created_at) : null;
    
    // Période d'essai de 14 jours pour tous les nouveaux inscrits (non-pionniers)
    const trialPeriodEnd = createdAt ? new Date(createdAt.getTime() + 14 * 24 * 60 * 60 * 1000) : null;
    const isInTrialPeriod = trialPeriodEnd ? now < trialPeriodEnd : false;
    const trialDaysLeft = trialPeriodEnd ? Math.max(0, Math.ceil((trialPeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : 0;
    const trialEndDate = trialPeriodEnd;

    const freeAccessEndDate = driver.free_access_end_date ? new Date(driver.free_access_end_date) : null;
    const isPioneerTrialActive = driver.is_pioneer && 
      driver.free_access_type === "trial" && 
      freeAccessEndDate && 
      freeAccessEndDate > now;

    // Accès gratuit accordé par admin (illimité ou avec période)
    const freeAccessWithPeriod = freeAccessEndDate && 
      freeAccessEndDate > now && 
      driver.free_access_type !== "trial"; // Exclure les trials pioneers
    
    const hasAdminFreeAccess = driver.free_access_granted === true || 
      driver.free_access_type === "unlimited" ||
      freeAccessWithPeriod;

    const hasFullAccess = 
      driver.subscription_status === "active" ||
      driver.subscription_paid === true ||
      (isInTrialPeriod && !driver.is_pioneer) || // Essai 14 jours pour non-pionniers
      isPioneerTrialActive ||
      hasAdminFreeAccess;

    return { hasFullAccess, isInTrialPeriod, trialDaysLeft, trialEndDate, hasAdminFreeAccess };
  };

  const localAccessStatus = calculateAccessStatus();

  // Appel async en arrière-plan (pour synchroniser avec Stripe/DB) mais n'affecte pas l'UI immédiatement
  useEffect(() => {
    const checkSubscription = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("check-driver-subscription");

        if (error) {
          console.error("Subscription check error:", error);
          return;
        }

        console.log("Subscription check result:", data);
        setSubscriptionStatus(data);
        
        // Attendre que la mise à jour DB soit propagée, puis recharger le profil
        setTimeout(() => {
          onSubscriptionUpdate();
        }, 500);
      } catch (error: any) {
        console.error("Error checking subscription:", error);
      }
    };

    // Check en arrière-plan après un délai pour ne pas bloquer l'affichage initial
    const timeoutId = setTimeout(checkSubscription, 1000);
    return () => clearTimeout(timeoutId);
  }, [driverProfile?.driver?.id]);

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      toast.loading("Redirection vers le paiement...");
      
      const { data, error } = await supabase.functions.invoke("create-premium-checkout");

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL received");
      }
    } catch (error: any) {
      console.error("Error creating subscription:", error);
      toast.error("Erreur lors de la création de l'abonnement");
      setLoading(false);
    }
  };

  // Utiliser d'abord le statut local (synchrone) puis le statut API si disponible
  const effectiveStatus = subscriptionStatus?.subscription_status || driverProfile?.driver?.subscription_status || "inactive";
  const isActive = localAccessStatus.hasFullAccess || effectiveStatus === "active" || subscriptionStatus?.is_free_access || (isPioneer && pioneerTrialDaysLeft !== null && pioneerTrialDaysLeft > 0);
  const isInactive = !isActive && effectiveStatus === "inactive" && !subscriptionStatus?.is_free_access && !(isPioneer && pioneerTrialDaysLeft !== null && pioneerTrialDaysLeft > 0);
  const isPastDue = effectiveStatus === "past_due";
  const isCanceled = effectiveStatus === "canceled";
  
  // Accès gratuit admin
  const hasAdminFreeAccess = localAccessStatus.hasAdminFreeAccess || driverProfile?.driver?.free_access_granted;
  // Période d'essai 14 jours pour non-pionniers
  const isInTrialPeriod = localAccessStatus.isInTrialPeriod && !isPioneer && !hasAdminFreeAccess;
  const trialDaysLeft = localAccessStatus.trialDaysLeft || 0;
  const trialEndDate = localAccessStatus.trialEndDate;
  
  const freeAccessEndDate = driverProfile?.driver?.free_access_end_date;
  const freeAccessType = driverProfile?.driver?.free_access_type;
  
  // Détection de la résiliation programmée
  const cancelAtPeriodEnd = driverProfile?.driver?.subscription_cancel_at_period_end;
  const cancelAt = driverProfile?.driver?.subscription_cancel_at;
  const trialCancelled = driverProfile?.driver?.trial_cancelled === true;

  const remainingDays = freeAccessEndDate ? differenceInDays(new Date(freeAccessEndDate), new Date()) : null;
  
  // Réabonnement après résiliation
  const handleResubscribe = async (type: "monthly" | "annual") => {
    setResubscribing(true);
    try {
      toast.loading("Redirection vers le paiement...");
      const { data, error } = await supabase.functions.invoke("resubscribe-driver", {
        body: { subscription_type: type }
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL received");
      }
    } catch (error: any) {
      console.error("Error creating resubscription:", error);
      toast.dismiss();
      toast.error("Erreur lors de la création de l'abonnement", {
        description: error.message
      });
    } finally {
      setResubscribing(false);
    }
  };

  const getDurationLabel = (type: string | null) => {
    switch (type) {
      case "1_month": return "1 mois";
      case "2_months": return "2 mois";
      case "3_months": return "3 mois";
      case "trial": return "14 jours d'essai";
      case "unlimited": return "Illimité (permanent)";
      case "administrative": return "Illimité (administratif)";
      case "time_limited": return "Accès temporaire offert";
      case "custom": return "Personnalisé";
      default: return "Non défini";
    }
  };

  // Plus de loader - on affiche directement avec le statut calculé localement

  return (
    <div className="space-y-4 sm:space-y-6 px-2 sm:px-0">
      {/* Pioneer Cancellation Warning Dialog */}
      <PioneerCancellationWarning
        open={showPioneerWarning}
        onOpenChange={setShowPioneerWarning}
        onConfirm={handlePioneerWarningConfirm}
        onCancel={handlePioneerWarningCancel}
      />

      {/* Section Réabonnement après résiliation */}
      {isCanceled && !isActive && (
        <Card className="p-4 sm:p-6 bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-2 border-amber-500/30">
          <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
            <div className="p-3 bg-amber-500/20 rounded-xl">
              <CreditCard className="w-6 h-6 sm:w-8 sm:h-8 text-amber-500" />
            </div>
            <div className="flex-1 w-full space-y-4">
              <div>
                <h3 className="font-bold text-base sm:text-lg text-foreground mb-2">
                  Réactiver Premium
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Votre abonnement Premium a été résilié. Vous gardez l'accès gratuit aux fonctionnalités de base. Réabonnez-vous pour retrouver les fonctionnalités avancées.
                </p>
              </div>
              
              <Button
                onClick={handleSubscribe}
                disabled={loading}
                className="w-full py-6 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <CreditCard className="w-5 h-5 mr-2" />
                )}
                <div className="text-left">
                  <div className="font-bold">Repasser Premium — 19,99€/mois</div>
                  <div className="text-xs opacity-80">Sans engagement</div>
                </div>
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Pioneer Status Lost Alert */}
      {pioneerStatusLost && (
        <Card className="p-4 sm:p-6 bg-destructive/10 border-destructive">
          <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
            <AlertCircle className="w-6 h-6 sm:w-8 sm:h-8 text-destructive flex-shrink-0" />
            <div className="flex-1 w-full">
              <h3 className="font-bold text-base sm:text-lg text-destructive mb-2">
                Statut Pionnier Perdu
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground mb-3">
                Votre abonnement Pioneer a été résilié et vous avez perdu le tarif préférentiel.
                Si vous souhaitez vous réabonner, le tarif standard de 19,99€/mois s'appliquera.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Pioneer Alert - Special for pioneers */}
      {isPioneer && !pioneerStatusLost && (
        <Card className="p-4 sm:p-6 bg-gradient-to-br from-amber-500/20 to-orange-500/20 border-amber-500">
          <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
            <Trophy className="w-6 h-6 sm:w-8 sm:h-8 text-amber-500 flex-shrink-0" />
            <div className="flex-1 w-full">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-bold text-base sm:text-lg text-amber-600 dark:text-amber-400">
                  🏆 Pionnier SoloCab
                </h3>
                <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                  Offre Exclusive
                </Badge>
              </div>
              <div className="space-y-2 text-xs sm:text-sm text-muted-foreground">
                <p className="text-amber-700 dark:text-amber-300 font-medium">
                  Vous faites partie des 350 pionniers de SoloCab !
                </p>
                {pioneerTrialDaysLeft !== null && pioneerTrialDaysLeft > 0 ? (
                  <>
                    <p>
                      <span className="font-medium">Essai gratuit :</span>{" "}
                      <Badge className="bg-green-500 ml-1">
                        {pioneerTrialDaysLeft} jour{pioneerTrialDaysLeft > 1 ? "s" : ""} restant{pioneerTrialDaysLeft > 1 ? "s" : ""}
                      </Badge>
                    </p>
                    <p>
                      <span className="font-medium">Fin de l'essai :</span>{" "}
                      {format(new Date(pioneerTrialEnd!), "d MMMM yyyy", { locale: fr })}
                    </p>
                    <p className="pt-2 text-amber-600 dark:text-amber-400 font-semibold">
                      💰 Après l'essai : tarif Pioneer préférentiel à vie !
                    </p>
                  </>
                ) : (
                  <p className="text-green-600 dark:text-green-400 font-medium">
                    ✓ Vous bénéficiez du tarif Pioneer : 19,99€/mois à vie !
                  </p>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Trial Period Alert - 14 jours pour nouveaux inscrits non-pionniers */}
      {isInTrialPeriod && !isPioneer && (
        <Card className="p-4 sm:p-6 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border-blue-500">
          <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
            <Calendar className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500 flex-shrink-0" />
            <div className="flex-1 w-full">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-bold text-base sm:text-lg text-blue-600 dark:text-blue-400">
                  🎉 Période d'Essai Gratuit
                </h3>
                <Badge className="bg-blue-500 text-white">
                  {trialDaysLeft} jour{trialDaysLeft > 1 ? "s" : ""} restant{trialDaysLeft > 1 ? "s" : ""}
                </Badge>
              </div>
              <div className="space-y-2 text-xs sm:text-sm text-muted-foreground">
                <p>
                  Profitez de <strong>14 jours d'accès complet gratuit</strong> pour découvrir toutes les fonctionnalités de SoloCab.
                </p>
                {trialEndDate && (
                  <p>
                    <span className="font-medium">Fin de l'essai :</span>{" "}
                    {format(new Date(trialEndDate), "d MMMM yyyy", { locale: fr })}
                  </p>
                )}
                <p className="pt-2 text-blue-600 dark:text-blue-400 font-medium">
                  💡 À la fin de l'essai : seulement 19,99€/mois pour continuer
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Admin Free Access Alert - Only for admin-granted free access (not trial) */}
      {hasAdminFreeAccess && !isPioneer && (
        <Card className={`p-4 sm:p-6 border-2 ${
          freeAccessType === 'administrative' || freeAccessType === 'unlimited' || !freeAccessEndDate
            ? 'bg-purple-50 dark:bg-purple-900/10 border-purple-500'
            : 'bg-green-50 dark:bg-green-900/10 border-green-500'
        }`}>
          <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
            <Gift className={`w-6 h-6 sm:w-8 sm:h-8 flex-shrink-0 ${
              freeAccessType === 'administrative' || freeAccessType === 'unlimited' || !freeAccessEndDate
                ? 'text-purple-500'
                : 'text-green-500'
            }`} />
            <div className="flex-1 w-full">
              <h3 className={`font-bold text-base sm:text-lg mb-2 ${
                freeAccessType === 'administrative' || freeAccessType === 'unlimited' || !freeAccessEndDate
                  ? 'text-purple-700 dark:text-purple-400'
                  : 'text-green-700 dark:text-green-500'
              }`}>
                {freeAccessType === 'administrative' || freeAccessType === 'unlimited' || !freeAccessEndDate
                  ? '👑 Accès Illimité Permanent'
                  : '🎁 Accès Gratuit Temporaire'}
              </h3>
              <div className="space-y-2 text-xs sm:text-sm text-muted-foreground">
                <p>
                  <span className="font-medium">Type :</span> {getDurationLabel(freeAccessType)}
                </p>
                
                {/* Affichage pour accès TEMPORAIRE (time_limited) avec date de fin */}
                {freeAccessEndDate && freeAccessType === 'time_limited' && (
                  <>
                    <p>
                      <span className="font-medium">Valide jusqu'au :</span>{" "}
                      {format(new Date(freeAccessEndDate), "d MMMM yyyy", { locale: fr })}
                    </p>
                    {remainingDays !== null && remainingDays > 0 && (
                      <Badge className="bg-green-500 mt-2">
                        {remainingDays} jour{remainingDays > 1 ? "s" : ""} restant{remainingDays > 1 ? "s" : ""}
                      </Badge>
                    )}
                    <p className="pt-2 text-amber-600 dark:text-amber-400">
                      À l'expiration de cette période, vous devrez souscrire à un abonnement pour continuer.
                    </p>
                  </>
                )}
                
                {/* Affichage pour accès ILLIMITÉ (administrative/unlimited) */}
                {(freeAccessType === 'administrative' || freeAccessType === 'unlimited' || !freeAccessEndDate) && (
                  <>
                    <Badge className="bg-purple-500 mt-2">
                      ✨ Accès gratuit à vie
                    </Badge>
                    <p className="pt-2 text-purple-700 dark:text-purple-400">
                      Vous bénéficiez d'un accès permanent à toutes les fonctionnalités de SoloCab sans jamais avoir à payer.
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Free Tier Info - When user has free access (no premium) */}
      {isInactive && !isInTrialPeriod && !hasAdminFreeAccess && (
        <Card className="p-4 sm:p-6 bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/30">
          <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
            <div className="p-3 bg-amber-500/20 rounded-xl">
              <CreditCard className="w-6 h-6 sm:w-8 sm:h-8 text-amber-500 flex-shrink-0" />
            </div>
            <div className="flex-1 w-full">
              <h3 className="font-bold text-base sm:text-lg text-foreground mb-2">
                Passez Premium pour aller plus loin
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
                Vous bénéficiez de l'accès gratuit à toutes les fonctionnalités de base. Passez Premium pour accéder aux partenariats, au partage de courses et aux outils de prospection.
              </p>
              <Button
                onClick={handleSubscribe}
                disabled={loading}
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 w-full sm:w-auto text-xs sm:text-base px-2 sm:px-4"
              >
                <CreditCard className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 flex-shrink-0" />
                <span className="truncate">Passer Premium — 19,99€/mois</span>
              </Button>
            </div>
          </div>
        </Card>
      )}

      {isPastDue && (
        <Card className="p-4 sm:p-6 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-2 border-yellow-500 shadow-lg">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
              <div className="p-2.5 bg-yellow-500/20 rounded-xl">
                <AlertCircle className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-500 flex-shrink-0" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-base sm:text-lg text-yellow-700 dark:text-yellow-500 mb-2">
                  ⚠️ Paiement en Retard
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground mb-2">
                  Votre dernier paiement n'a pas pu être effectué. Régularisez votre situation pour continuer à utiliser la plateforme.
                </p>
                <div className="bg-destructive/10 p-3 rounded-lg text-sm">
                  <p className="font-medium text-destructive mb-1">⏰ Accès limité :</p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1 text-xs">
                    <li>Votre page de réservation n'est plus visible</li>
                    <li>Vous ne pouvez plus recevoir de nouveaux clients</li>
                    <li>Régularisez rapidement pour éviter la suspension</li>
                  </ul>
                </div>
              </div>
            </div>
            
            {/* Actions pour impayés */}
            {driverProfile?.driver?.stripe_customer_id && (
              <div className="space-y-3 pt-2">
                <Button
                  onClick={async () => {
                    setManagingSubscription(true);
                    try {
                      const { data, error } = await supabase.functions.invoke("customer-portal", {
                        body: { action: "payment_method" }
                      });
                      if (error) throw error;
                      if (data?.url) {
                        window.open(data.url, "_blank", "noopener,noreferrer");
                        toast.success("Portail de paiement ouvert", {
                          description: "Mettez à jour votre carte pour régulariser"
                        });
                      }
                    } catch (error: any) {
                      console.error("Error opening portal:", error);
                      toast.error("Erreur lors de l'ouverture du portail");
                    } finally {
                      setManagingSubscription(false);
                    }
                  }}
                  disabled={managingSubscription}
                  className="w-full h-auto py-4 px-4 flex items-center justify-between gap-3 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white transition-all touch-manipulation active:scale-[0.98]"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-lg">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <span className="font-semibold text-base block">Régulariser mon paiement</span>
                      <span className="text-xs opacity-80">Mettre à jour ma carte bancaire</span>
                    </div>
                  </div>
                  {managingSubscription ? (
                    <Loader2 className="w-5 h-5 animate-spin flex-shrink-0" />
                  ) : (
                    <Check className="w-5 h-5 flex-shrink-0" />
                  )}
                </Button>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Subscription Info */}
      <Card className={`p-4 sm:p-6 bg-card/80 border-border ${isPioneer ? 'ring-2 ring-amber-500/50' : ''}`}>
        <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
          <div>
            <h3 className="font-bold text-lg sm:text-xl mb-1 sm:mb-2 text-foreground">
              Abonnement SoloCab Premium
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Débloquez les fonctionnalités avancées pour développer votre activité
            </p>
          </div>
          {isPioneer ? (
            <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 self-start">
              <Trophy className="w-3 h-3 mr-1" />
              Pionnier
            </Badge>
          ) : isInTrialPeriod ? (
            <Badge className="bg-blue-500 self-start">
              <Calendar className="w-3 h-3 mr-1" />
              Essai Gratuit
            </Badge>
          ) : hasAdminFreeAccess ? (
            <Badge className="bg-green-500 self-start">
              <Gift className="w-3 h-3 mr-1" />
              Accès Gratuit
            </Badge>
          ) : isActive ? (
            <Badge className="bg-green-500 self-start">
              <Check className="w-3 h-3 mr-1" />
              Actif
            </Badge>
          ) : null}
        </div>

        <div className="space-y-3 sm:space-y-4">
          {/* Prix - Différent selon pioneer ou non */}
          {isPioneer ? (
            <div className="flex flex-col sm:flex-row justify-between gap-1 sm:gap-0 py-2 sm:py-3 border-b border-white/10">
              <span className="text-xs sm:text-sm text-gray-300">Tarif mensuel Pionnier</span>
              <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm line-through text-gray-500">29,99€</span>
                <span className="font-bold text-sm sm:text-base text-amber-400">Tarif préférentiel</span>
              </div>
            </div>
          ) : isInTrialPeriod ? (
            <div className="flex flex-col sm:flex-row justify-between gap-1 sm:gap-0 py-2 sm:py-3 border-b border-white/10">
              <span className="text-xs sm:text-sm text-gray-300">Période d'essai</span>
              <div className="flex flex-col items-end">
                <Badge className="bg-blue-500 mb-1">{trialDaysLeft} jour{trialDaysLeft > 1 ? 's' : ''} restant{trialDaysLeft > 1 ? 's' : ''}</Badge>
                <span className="font-bold text-sm sm:text-base text-white">puis 19,99€ / mois</span>
              </div>
            </div>
          ) : !hasAdminFreeAccess && (
            <div className="flex flex-col sm:flex-row justify-between gap-1 sm:gap-0 py-2 sm:py-3 border-b border-white/10">
              <span className="text-xs sm:text-sm text-gray-300">Abonnement Premium</span>
              <div className="flex flex-col items-end">
                <span className="font-bold text-sm sm:text-base text-white">19,99€ / mois</span>
                <span className="text-xs text-gray-400">Sans engagement</span>
              </div>
            </div>
          )}

          {isActive && driverProfile?.driver?.subscription_end_date && (
            <div className="flex flex-col sm:flex-row justify-between gap-1 sm:gap-0 py-2 sm:py-3 border-b border-white/10">
              <span className="text-xs sm:text-sm text-gray-300">Prochaine facturation</span>
              <span className="font-medium flex items-center gap-2 text-xs sm:text-sm text-white">
                <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                {format(new Date(driverProfile.driver.subscription_end_date), "d MMM yyyy", { locale: fr })}
              </span>
            </div>
          )}

          <div className="bg-white/5 rounded-lg p-3 sm:p-4 space-y-2 border border-white/10">
            <h4 className="font-semibold text-sm sm:text-base mb-2 sm:mb-3 text-white">
              ✓ Accès Gratuit (inclus pour tous) :
            </h4>
            <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
              <li className="flex items-center gap-2">
                <Check className="w-3 h-3 sm:w-4 sm:h-4 text-green-400 flex-shrink-0" />
                <span className="text-gray-200">Gestion illimitée de clients</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3 h-3 sm:w-4 sm:h-4 text-green-400 flex-shrink-0" />
                <span className="text-gray-200">Réservations et courses sans limite</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3 h-3 sm:w-4 sm:h-4 text-green-400 flex-shrink-0" />
                <span className="text-gray-200">Devis et factures automatiques</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3 h-3 sm:w-4 sm:h-4 text-green-400 flex-shrink-0" />
                <span className="text-gray-200">QR Code et profil public</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3 h-3 sm:w-4 sm:h-4 text-green-400 flex-shrink-0" />
                <span className="text-gray-200">0% de commission</span>
              </li>
            </ul>
            
            <h4 className="font-semibold text-sm sm:text-base mb-2 sm:mb-3 text-amber-400 pt-3 border-t border-white/10">
              👑 Premium (19,99€/mois) :
            </h4>
            <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
              <li className="flex items-center gap-2">
                <Check className="w-3 h-3 sm:w-4 sm:h-4 text-amber-400 flex-shrink-0" />
                <span className="text-gray-200">Partenariats entre chauffeurs</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3 h-3 sm:w-4 sm:h-4 text-amber-400 flex-shrink-0" />
                <span className="text-gray-200">Échange et partage de courses</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3 h-3 sm:w-4 sm:h-4 text-amber-400 flex-shrink-0" />
                <span className="text-gray-200">Codes promotionnels</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3 h-3 sm:w-4 sm:h-4 text-amber-400 flex-shrink-0" />
                <span className="text-gray-200">Prospection avancée</span>
              </li>
            </ul>
          </div>

          {/* Bouton d'action - Souscrire */}
          {isInactive && !isInTrialPeriod && !hasAdminFreeAccess && (
            <Button 
              onClick={handleSubscribe} 
              disabled={loading}
              className="w-full text-xs sm:text-lg py-4 sm:py-6 px-2 sm:px-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
            >
              <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2 flex-shrink-0" />
                <span className="truncate">
                Passer Premium — 19,99€/mois
                </span>
            </Button>
          )}
        </div>
      </Card>

      {/* Section Gestion d'abonnement - Toujours affichée pour permettre la résiliation même en essai */}
      {/* Masquée pour les accès gratuits admin car pas de prélèvement à gérer */}
      <SubscriptionManagementCard
        userType="driver"
        hasStripeCustomer={!!driverProfile?.driver?.stripe_customer_id}
        isActive={isActive || isInTrialPeriod || hasAdminFreeAccess || isPastDue}
        isInTrialPeriod={isInTrialPeriod || (isPioneer && pioneerTrialDaysLeft !== null && pioneerTrialDaysLeft > 0)}
        trialEndDate={isInTrialPeriod ? trialEndDate : (isPioneer ? new Date(pioneerTrialEnd!) : undefined)}
        trialCancelled={trialCancelled}
        nextBillingDate={driverProfile?.driver?.subscription_end_date}
        nextBillingAmount={19.99}
        cancelAtPeriodEnd={driverProfile?.driver?.subscription_cancel_at_period_end}
        cancelAt={driverProfile?.driver?.subscription_cancel_at}
        hasFreeAccess={hasAdminFreeAccess}
        onBeforeOpenPortal={async () => {
          if (isPioneer && !pioneerStatusLost) {
            setShowPioneerWarning(true);
            return false;
          }
          return true;
        }}
        onAfterManage={onSubscriptionUpdate}
      />

      {/* Comparison - Updated for pioneers */}
      {isInactive && !isInTrialPeriod && !hasAdminFreeAccess && !isPioneer && (
        <Card className="p-3 sm:p-6 bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/30 overflow-hidden">
          <h4 className="font-bold text-sm sm:text-lg text-foreground mb-2 sm:mb-4 text-center sm:text-left">
            💰 Modèle Freemium — Aucune commission
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
            <div className="bg-muted/50 rounded-lg p-3 sm:p-4">
              <p className="text-muted-foreground mb-1 sm:mb-2 text-xs sm:text-sm">Uber / Bolt</p>
              <p className="text-lg sm:text-2xl font-bold text-foreground break-words">~1 250€/mois</p>
              <p className="text-muted-foreground text-xs">Commission 25%</p>
            </div>
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg p-3 sm:p-4">
              <p className="text-white/80 mb-1 sm:mb-2 text-xs sm:text-sm">SoloCab Premium</p>
              <p className="text-lg sm:text-2xl font-bold text-white break-words">19,99€/mois</p>
              <p className="text-white/80 text-xs">0% commission • Gratuit de base</p>
            </div>
          </div>
        </Card>
      )}

      {/* Pioneer specific comparison */}
      {isPioneer && (
        <Card className="p-3 sm:p-6 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-amber-500/50 overflow-hidden">
          <h4 className="font-bold text-sm sm:text-lg text-amber-600 dark:text-amber-400 mb-2 sm:mb-4 text-center sm:text-left">
            🏆 Avantage Pionnier à vie
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
            <div className="bg-white/10 dark:bg-black/20 rounded-lg p-3 sm:p-4">
              <p className="text-muted-foreground mb-1 sm:mb-2 text-xs sm:text-sm">Plateformes classiques</p>
              <p className="text-lg sm:text-2xl font-bold text-muted-foreground line-through break-words">~25% commission</p>
            </div>
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg p-3 sm:p-4">
              <p className="text-white/80 mb-1 sm:mb-2 text-xs sm:text-sm">Votre Tarif Pionnier</p>
              <p className="text-lg sm:text-2xl font-bold text-white break-words">19,99€/mois</p>
              <p className="text-white/80 text-xs">À vie • 0% commission</p>
            </div>
          </div>
          <p className="text-center text-xs sm:text-sm text-amber-600 dark:text-amber-400 mt-4 font-medium">
            💰 Vous économisez 120€/an par rapport au tarif standard !
          </p>
        </Card>
      )}
    </div>
  );
};

export default SubscriptionManager;
