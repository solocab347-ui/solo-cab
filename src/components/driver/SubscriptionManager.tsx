import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Check, AlertCircle, Calendar, Gift } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";

interface SubscriptionManagerProps {
  driverProfile: any;
  onSubscriptionUpdate: () => void;
}

const SubscriptionManager = ({ driverProfile, onSubscriptionUpdate }: SubscriptionManagerProps) => {
  const [loading, setLoading] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<any>(null);
  const [checkingSubscription, setCheckingSubscription] = useState(true);

  useEffect(() => {
    checkSubscription();
  }, []);

  const checkSubscription = async () => {
    try {
      setCheckingSubscription(true);
      const { data, error } = await supabase.functions.invoke("check-driver-subscription");

      if (error) throw error;

      console.log("Subscription check result:", data);
      setSubscriptionStatus(data);
      
      // Attendre que la mise à jour DB soit propagée, puis recharger le profil
      setTimeout(() => {
        onSubscriptionUpdate();
      }, 500);
    } catch (error: any) {
      console.error("Error checking subscription:", error);
    } finally {
      setCheckingSubscription(false);
    }
  };

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      toast.loading("Redirection vers le paiement...");
      
      const { data, error } = await supabase.functions.invoke("create-driver-subscription");

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

  // Use subscription status from API call which checks free access + Stripe
  const effectiveStatus = subscriptionStatus?.subscription_status || driverProfile?.driver?.subscription_status || "inactive";
  const isActive = effectiveStatus === "active" || subscriptionStatus?.is_free_access;
  const isInactive = effectiveStatus === "inactive" && !subscriptionStatus?.is_free_access;
  const isPastDue = effectiveStatus === "past_due";
  const hasFreeAccess = driverProfile?.driver?.free_access_granted;
  const freeAccessEndDate = driverProfile?.driver?.free_access_end_date;
  const freeAccessType = driverProfile?.driver?.free_access_type;
  
  const remainingDays = freeAccessEndDate ? differenceInDays(new Date(freeAccessEndDate), new Date()) : null;

  const getDurationLabel = (type: string | null) => {
    switch (type) {
      case "1_month": return "1 mois";
      case "2_months": return "2 mois";
      case "3_months": return "3 mois";
      case "unlimited": return "Illimité";
      case "custom": return "Personnalisé";
      default: return "Non défini";
    }
  };

  if (checkingSubscription) {
    return (
      <Card className="p-6">
        <p className="text-center text-muted-foreground">Vérification de l'abonnement...</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 px-2 sm:px-0">
      {/* Free Access Alert */}
      {hasFreeAccess && (
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
                <span className="truncate">Souscrire - 49,99€/mois</span>
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
      <Card className="p-4 sm:p-6 bg-card/80 border-white/10">
        <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
          <div>
            <h3 className="font-bold text-lg sm:text-xl mb-1 sm:mb-2 text-white">Abonnement SoloCab</h3>
            <p className="text-xs sm:text-sm text-gray-300">
              Accès complet à la plateforme professionnelle
            </p>
          </div>
          {hasFreeAccess ? (
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
          {/* Masquer le prix pour les accès gratuits illimités */}
          {!hasFreeAccess && (
            <div className="flex flex-col sm:flex-row justify-between gap-1 sm:gap-0 py-2 sm:py-3 border-b border-white/10">
              <span className="text-xs sm:text-sm text-gray-300">Tarif mensuel</span>
              <span className="font-bold text-sm sm:text-base text-white">49,99€ / mois</span>
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
              className="w-full bg-gradient-premium text-xs sm:text-lg py-4 sm:py-6 px-2 sm:px-4"
            >
              <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2 flex-shrink-0" />
              <span className="truncate">Activer - 49,99€/mois</span>
            </Button>
          )}
        </div>
      </Card>

      {/* Comparison */}
      {isInactive && !hasFreeAccess && (
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
              <p className="text-lg sm:text-2xl font-bold text-premium break-words">49,99€/mois</p>
              <p className="text-premium/70 text-xs">0% commission</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default SubscriptionManager;
