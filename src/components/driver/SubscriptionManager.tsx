import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Check, AlertCircle, Calendar, Gift, Trophy, Settings, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";
import PioneerCancellationWarning from "./PioneerCancellationWarning";

interface SubscriptionManagerProps {
  driverProfile: any;
  onSubscriptionUpdate: () => void;
}

const SubscriptionManager = ({ driverProfile, onSubscriptionUpdate }: SubscriptionManagerProps) => {
  const [loading, setLoading] = useState(false);
  const [managingSubscription, setManagingSubscription] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<any>(null);
  const [showPioneerWarning, setShowPioneerWarning] = useState(false);

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
    if (!driver) return { hasFullAccess: false, isInGracePeriod: false };

    const now = new Date();
    const createdAt = driver.created_at ? new Date(driver.created_at) : null;
    const gracePeriodEnd = createdAt ? new Date(createdAt.getTime() + 30 * 24 * 60 * 60 * 1000) : null;
    const isInGracePeriod = gracePeriodEnd ? now < gracePeriodEnd : false;

    const freeAccessEndDate = driver.free_access_end_date ? new Date(driver.free_access_end_date) : null;
    const isPioneerTrialActive = driver.is_pioneer && 
      driver.free_access_type === "trial" && 
      freeAccessEndDate && 
      freeAccessEndDate > now;

    const hasFreeAccess = driver.free_access_granted || 
      (driver.free_access_type === "unlimited");

    const hasFullAccess = 
      driver.subscription_status === "active" ||
      driver.subscription_paid === true ||
      isInGracePeriod ||
      isPioneerTrialActive ||
      hasFreeAccess;

    return { hasFullAccess, isInGracePeriod };
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
      
      // Use pioneer subscription for pioneers
      const functionName = isPioneer ? "create-pioneer-subscription" : "create-driver-subscription";
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: isPioneer ? { driver_id: driverProfile?.driver?.id } : undefined
      });

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
  const hasFreeAccess = driverProfile?.driver?.free_access_granted || (isPioneer && pioneerTrialDaysLeft !== null && pioneerTrialDaysLeft > 0) || localAccessStatus.isInGracePeriod;
  const freeAccessEndDate = driverProfile?.driver?.free_access_end_date;
  const freeAccessType = driverProfile?.driver?.free_access_type;

  const remainingDays = freeAccessEndDate ? differenceInDays(new Date(freeAccessEndDate), new Date()) : null;

  const getDurationLabel = (type: string | null) => {
    switch (type) {
      case "1_month": return "1 mois";
      case "2_months": return "2 mois";
      case "3_months": return "3 mois";
      case "trial": return "30 jours d'essai";
      case "unlimited": return "Illimité";
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
                Votre abonnement Pioneer a été résilié et vous avez perdu le tarif préférentiel de 39,99€/mois.
                Si vous souhaitez vous réabonner, le tarif standard de 49,99€/mois s'appliquera.
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
                      💰 Après l'essai : 39,99€/mois au lieu de 49,99€ (à vie !)
                    </p>
                  </>
                ) : (
                  <p className="text-green-600 dark:text-green-400 font-medium">
                    ✓ Vous bénéficiez du tarif Pioneer : 39,99€/mois à vie !
                  </p>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Regular Free Access Alert - Only for non-pioneers */}
      {hasFreeAccess && !isPioneer && (
        <Card className="p-4 sm:p-6 bg-green-50 dark:bg-green-900/10 border-green-500">
          <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
            <Gift className="w-6 h-6 sm:w-8 sm:h-8 text-green-500 flex-shrink-0" />
            <div className="flex-1 w-full">
              <h3 className="font-bold text-base sm:text-lg text-green-700 dark:text-green-500 mb-2">
                🎁 Accès Gratuit Actif
              </h3>
              <div className="space-y-2 text-xs sm:text-sm text-muted-foreground">
                <p>
                  <span className="font-medium">Durée :</span> {getDurationLabel(freeAccessType)}
                </p>
                {freeAccessEndDate && (
                  <>
                    <p>
                      <span className="font-medium">Expire le :</span>{" "}
                      {format(new Date(freeAccessEndDate), "d MMMM yyyy", { locale: fr })}
                    </p>
                    {remainingDays !== null && remainingDays > 0 && (
                      <Badge className="bg-green-500 mt-2">
                        {remainingDays} jour{remainingDays > 1 ? "s" : ""} restant{remainingDays > 1 ? "s" : ""}
                      </Badge>
                    )}
                  </>
                )}
                {!freeAccessEndDate && (
                  <Badge className="bg-green-500 mt-2">
                    Accès gratuit illimité
                  </Badge>
                )}
                <p className="pt-2 text-green-700 dark:text-green-400">
                  Vous bénéficiez d'un accès complet à toutes les fonctionnalités de la plateforme sans frais.
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Status Alert */}
      {isInactive && !hasFreeAccess && (
        <Card className="p-4 sm:p-6 bg-destructive/10 border-destructive">
          <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
            <AlertCircle className="w-6 h-6 sm:w-8 sm:h-8 text-destructive flex-shrink-0" />
            <div className="flex-1 w-full">
              <h3 className="font-bold text-base sm:text-lg text-destructive mb-2">
                Abonnement Inactif
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
                Votre accès à la plateforme est limité. Souscrivez à l'abonnement pour activer toutes les fonctionnalités et commencer à recevoir des clients.
              </p>
              <Button 
                onClick={handleSubscribe} 
                disabled={loading} 
                className="bg-gradient-premium w-full sm:w-auto text-xs sm:text-base px-2 sm:px-4"
              >
                <CreditCard className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 flex-shrink-0" />
                <span className="truncate">1 mois gratuit puis 49,99€/mois</span>
              </Button>
            </div>
          </div>
        </Card>
      )}

      {isPastDue && (
        <Card className="p-4 sm:p-6 bg-yellow-50 dark:bg-yellow-900/10 border-yellow-500">
          <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
            <AlertCircle className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-500 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-bold text-base sm:text-lg text-yellow-700 dark:text-yellow-500 mb-2">
                Paiement en Retard
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
                Votre dernier paiement n'a pas pu être effectué. Veuillez mettre à jour vos informations de paiement pour continuer à utiliser la plateforme.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Subscription Info */}
      <Card className={`p-4 sm:p-6 bg-card/80 border-white/10 ${isPioneer ? 'ring-2 ring-amber-500/50' : ''}`}>
        <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
          <div>
            <h3 className="font-bold text-lg sm:text-xl mb-1 sm:mb-2 text-white">
              {isPioneer ? 'Abonnement Pionnier SoloCab' : 'Abonnement SoloCab'}
            </h3>
            <p className="text-xs sm:text-sm text-gray-300">
              {isPioneer ? 'Tarif exclusif à vie pour les pionniers' : 'Accès complet à la plateforme professionnelle'}
            </p>
          </div>
          {isPioneer ? (
            <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 self-start">
              <Trophy className="w-3 h-3 mr-1" />
              Pionnier
            </Badge>
          ) : hasFreeAccess ? (
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
                <span className="text-xs sm:text-sm line-through text-gray-500">49,99€</span>
                <span className="font-bold text-sm sm:text-base text-amber-400">39,99€ / mois</span>
              </div>
            </div>
          ) : !hasFreeAccess && (
            <div className="flex flex-col sm:flex-row justify-between gap-1 sm:gap-0 py-2 sm:py-3 border-b border-white/10">
              <span className="text-xs sm:text-sm text-gray-300">Offre</span>
              <div className="flex flex-col items-end">
                <Badge className="bg-green-500 mb-1">1 mois gratuit</Badge>
                <span className="font-bold text-sm sm:text-base text-white">puis 49,99€ / mois</span>
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
              {hasFreeAccess ? "✓ Vous avez accès à :" : "✓ Inclus dans l'abonnement :"}
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
                <span className="text-gray-200">Génération automatique de devis et factures</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3 h-3 sm:w-4 sm:h-4 text-green-400 flex-shrink-0" />
                <span className="text-gray-200">QR Code personnel pour recruter des clients</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3 h-3 sm:w-4 sm:h-4 text-green-400 flex-shrink-0" />
                <span className="text-gray-200">Profil public sur la vitrine</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3 h-3 sm:w-4 sm:h-4 text-green-400 flex-shrink-0" />
                <span className="text-gray-200">0% de commission sur vos courses</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3 h-3 sm:w-4 sm:h-4 text-green-400 flex-shrink-0" />
                <span className="text-gray-200">Support 7j/7</span>
              </li>
            </ul>
          </div>

          {isInactive && !hasFreeAccess && (
            <Button 
              onClick={handleSubscribe} 
              disabled={loading}
              className={`w-full text-xs sm:text-lg py-4 sm:py-6 px-2 sm:px-4 ${isPioneer ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600' : 'bg-gradient-premium'}`}
            >
              <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2 flex-shrink-0" />
              <span className="truncate">
                {isPioneer ? 'Activer - 39,99€/mois (offre Pionnier)' : '1 mois gratuit puis 49,99€/mois'}
              </span>
            </Button>
          )}
        </div>
      </Card>

      {/* Comparison - Updated for pioneers */}
      {isInactive && !hasFreeAccess && !isPioneer && (
        <Card className="p-3 sm:p-6 bg-gradient-premium overflow-hidden">
          <h4 className="font-bold text-sm sm:text-lg text-premium-foreground mb-2 sm:mb-4 text-center sm:text-left">
            💰 Économisez jusqu'à 15 000€/an
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
            <div className="bg-premium-foreground/10 rounded-lg p-3 sm:p-4">
              <p className="text-premium-foreground/80 mb-1 sm:mb-2 text-xs sm:text-sm">Uber / Bolt</p>
              <p className="text-lg sm:text-2xl font-bold text-premium-foreground break-words">~1 250€/mois</p>
              <p className="text-premium-foreground/70 text-xs">Commission 25%</p>
            </div>
            <div className="bg-premium-foreground rounded-lg p-3 sm:p-4">
              <p className="text-premium/80 mb-1 sm:mb-2 text-xs sm:text-sm">SoloCab</p>
              <p className="text-lg sm:text-2xl font-bold text-premium break-words">
                <span className="text-green-400 text-sm">1 mois gratuit</span>
                <br />49,99€/mois
              </p>
              <p className="text-premium/70 text-xs">0% commission</p>
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
              <p className="text-muted-foreground mb-1 sm:mb-2 text-xs sm:text-sm">Tarif Standard</p>
              <p className="text-lg sm:text-2xl font-bold text-muted-foreground line-through break-words">49,99€/mois</p>
            </div>
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg p-3 sm:p-4">
              <p className="text-white/80 mb-1 sm:mb-2 text-xs sm:text-sm">Votre Tarif Pionnier</p>
              <p className="text-lg sm:text-2xl font-bold text-white break-words">39,99€/mois</p>
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
