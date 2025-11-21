import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Check, AlertCircle, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
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

      setSubscriptionStatus(data);
      if (data?.subscribed) {
        onSubscriptionUpdate();
      }
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

  const isActive = driverProfile?.driver?.subscription_status === "active";
  const isInactive = driverProfile?.driver?.subscription_status === "inactive";
  const isPastDue = driverProfile?.driver?.subscription_status === "past_due";

  if (checkingSubscription) {
    return (
      <Card className="p-6">
        <p className="text-center text-muted-foreground">Vérification de l'abonnement...</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 px-2 sm:px-0">
      {/* Status Alert */}
      {isInactive && (
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
      <Card className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
          <div>
            <h3 className="font-bold text-lg sm:text-xl mb-1 sm:mb-2">Abonnement SoloCab</h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Accès complet à la plateforme professionnelle
            </p>
          </div>
          {isActive && (
            <Badge className="bg-green-500 self-start">
              <Check className="w-3 h-3 mr-1" />
              Actif
            </Badge>
          )}
        </div>

        <div className="space-y-3 sm:space-y-4">
          <div className="flex flex-col sm:flex-row justify-between gap-1 sm:gap-0 py-2 sm:py-3 border-b border-border">
            <span className="text-xs sm:text-sm text-muted-foreground">Tarif mensuel</span>
            <span className="font-bold text-sm sm:text-base">49,99€ / mois</span>
          </div>

          {isActive && driverProfile?.driver?.subscription_end_date && (
            <div className="flex flex-col sm:flex-row justify-between gap-1 sm:gap-0 py-2 sm:py-3 border-b border-border">
              <span className="text-xs sm:text-sm text-muted-foreground">Prochaine facturation</span>
              <span className="font-medium flex items-center gap-2 text-xs sm:text-sm">
                <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                {format(new Date(driverProfile.driver.subscription_end_date), "d MMM yyyy", { locale: fr })}
              </span>
            </div>
          )}

          <div className="bg-secondary rounded-lg p-3 sm:p-4 space-y-2">
            <h4 className="font-semibold text-sm sm:text-base mb-2 sm:mb-3">✓ Inclus dans l'abonnement :</h4>
            <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
              <li className="flex items-center gap-2">
                <Check className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 flex-shrink-0" />
                <span>Gestion illimitée de clients</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 flex-shrink-0" />
                <span>Réservations et courses sans limite</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 flex-shrink-0" />
                <span>Génération automatique de devis et factures</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 flex-shrink-0" />
                <span>QR Code personnel pour recruter des clients</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 flex-shrink-0" />
                <span>Profil public sur la vitrine</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 flex-shrink-0" />
                <span>0% de commission sur vos courses</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 flex-shrink-0" />
                <span>Support 7j/7</span>
              </li>
            </ul>
          </div>

          {isInactive && (
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
      {isInactive && (
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
