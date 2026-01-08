import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  CreditCard,
  Loader2,
  Users,
  AlertTriangle,
  CheckCircle,
  Clock,
  Euro,
  Car,
  Info,
} from "lucide-react";

interface FleetSubscriptionManagerProps {
  fleetManagerId: string;
  onSubscriptionChange?: () => void;
}

interface SubscriptionData {
  subscribed: boolean;
  subscription_end: string | null;
  fleet_manager: {
    subscription_status: string;
    subscription_paid: boolean;
    max_free_drivers: number;
    extra_drivers_count: number;
    base_subscription_cost: number;
  } | null;
  billing: {
    base_cost: number;
    extra_drivers_count: number;
    extra_drivers_cost: number;
    total_monthly: number;
  };
  drivers: {
    total: number;
    free_used: number;
    free_remaining: number;
    paid_count: number;
  };
}

export const FleetSubscriptionManager = ({
  fleetManagerId,
  onSubscriptionChange,
}: FleetSubscriptionManagerProps) => {
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null);

  useEffect(() => {
    checkSubscription();
  }, [fleetManagerId]);

  const checkSubscription = async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error("Session invalide");
      }

      const { data, error } = await supabase.functions.invoke("check-fleet-subscription", {
        headers: {
          Authorization: `Bearer ${session.session.access_token}`,
        },
      });

      if (error) throw error;
      setSubscriptionData(data);
    } catch (error: any) {
      console.error("Error checking subscription:", error);
      toast.error("Erreur lors de la vérification de l'abonnement");
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async () => {
    setSubscribing(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error("Session invalide");
      }

      const { data, error } = await supabase.functions.invoke("create-fleet-manager-subscription", {
        body: { fleet_manager_id: fleetManagerId },
        headers: {
          Authorization: `Bearer ${session.session.access_token}`,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (error: any) {
      console.error("Error creating subscription:", error);
      toast.error(error.message || "Erreur lors de la création de l'abonnement");
    } finally {
      setSubscribing(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const isSubscribed = subscriptionData?.subscribed;
  const drivers = subscriptionData?.drivers;
  const billing = subscriptionData?.billing;
  const maxFreeDrivers = subscriptionData?.fleet_manager?.max_free_drivers || 10;

  return (
    <div className="space-y-6">
      {/* Subscription Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            Abonnement Gestionnaire de Flotte
          </CardTitle>
          <CardDescription>
            Gérez votre abonnement SoloCab
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isSubscribed ? (
            <>
              <div className="flex items-center justify-between p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-green-500" />
                  <div>
                    <p className="font-semibold text-green-700 dark:text-green-400">
                      Abonnement Actif
                    </p>
                    {subscriptionData?.subscription_end && (
                      <p className="text-sm text-muted-foreground">
                        Prochain renouvellement :{" "}
                        {new Date(subscriptionData.subscription_end).toLocaleDateString("fr-FR")}
                      </p>
                    )}
                  </div>
                </div>
                <Badge variant="default" className="bg-green-500">Actif</Badge>
              </div>

              {/* Billing Summary */}
              {billing && (
                <Card className="bg-muted/50">
                  <CardContent className="pt-6">
                    <h4 className="font-semibold mb-4 flex items-center gap-2">
                      <Euro className="w-4 h-4" />
                      Facturation mensuelle
                    </h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Abonnement de base (10 chauffeurs inclus)</span>
                        <span className="font-medium">{billing.base_cost.toFixed(2)} €</span>
                      </div>
                      {billing.extra_drivers_count > 0 && (
                        <div className="flex justify-between text-sm text-orange-600">
                          <span>
                            {billing.extra_drivers_count} chauffeur(s) supplémentaire(s) × 10 €
                          </span>
                          <span className="font-medium">
                            +{billing.extra_drivers_cost.toFixed(2)} €
                          </span>
                        </div>
                      )}
                      <div className="border-t pt-2 mt-2 flex justify-between font-semibold">
                        <span>Total mensuel</span>
                        <span className="text-primary">{billing.total_monthly.toFixed(2)} €</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <>
              <Alert className="border-amber-500/50 bg-amber-500/10">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                <AlertTitle className="text-amber-700 dark:text-amber-400">
                  Abonnement requis
                </AlertTitle>
                <AlertDescription className="text-amber-600 dark:text-amber-300">
                  Pour accéder à toutes les fonctionnalités et inscrire des chauffeurs, 
                  vous devez souscrire à l'abonnement Gestionnaire de Flotte.
                </AlertDescription>
              </Alert>

              <div className="p-6 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg border border-primary/20">
                <Badge className="mb-3 bg-green-500 text-white">
                  🎉 30 jours d'essai GRATUIT
                </Badge>
                <h3 className="text-xl font-bold mb-4">
                  Abonnement Gestionnaire de Flotte
                </h3>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-3xl font-bold text-green-500">GRATUIT</span>
                  <span className="text-muted-foreground">pendant 30 jours</span>
                </div>
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-lg text-muted-foreground">puis</span>
                  <span className="text-2xl font-bold text-primary">69,99 €</span>
                  <span className="text-muted-foreground">/ mois</span>
                </div>
                <ul className="space-y-2 mb-6">
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span><strong>10 chauffeurs inclus</strong> dans l'abonnement</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Gestion complète des plannings</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>QR Code personnalisé pour vos clients</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Profil public avec promotions</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Statistiques et rapports détaillés</span>
                  </li>
                </ul>
                <div className="p-3 bg-muted rounded-lg mb-4">
                  <p className="text-sm flex items-center gap-2">
                    <Info className="w-4 h-4 text-muted-foreground" />
                    <span>
                      <strong>+10 € / mois</strong> par chauffeur supplémentaire au-delà des 10 inclus
                    </span>
                  </p>
                </div>
                <Button
                  onClick={handleSubscribe}
                  disabled={subscribing}
                  className="w-full bg-green-500 hover:bg-green-600"
                  size="lg"
                >
                  {subscribing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Redirection...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4 mr-2" />
                      Démarrer l'essai gratuit
                    </>
                  )}
                </Button>
                <p className="text-xs text-center text-muted-foreground mt-2">
                  Empreinte bancaire 0€ • Sans engagement
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Driver Quota Card */}
      {drivers && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Car className="w-5 h-5 text-primary" />
              Quota de Chauffeurs
            </CardTitle>
            <CardDescription>
              Suivez l'utilisation de vos places chauffeurs
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Chauffeurs gratuits utilisés</span>
                <span className="font-medium">
                  {drivers.free_used} / {maxFreeDrivers}
                </span>
              </div>
              <Progress 
                value={(drivers.free_used / maxFreeDrivers) * 100} 
                className="h-2"
              />
            </div>

            {drivers.free_remaining > 0 ? (
              <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                <p className="text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  <span>
                    Il vous reste <strong>{drivers.free_remaining}</strong> place(s) gratuite(s)
                  </span>
                </p>
              </div>
            ) : (
              <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                <p className="text-sm text-orange-700 dark:text-orange-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  <span>
                    Vous avez atteint votre quota. Les prochains chauffeurs seront facturés{" "}
                    <strong>10 € / mois</strong> chacun.
                  </span>
                </p>
              </div>
            )}

            {drivers.paid_count > 0 && (
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="text-sm">Chauffeurs supplémentaires payants</span>
                <Badge variant="secondary">
                  {drivers.paid_count} × 10 € = {drivers.paid_count * 10} € / mois
                </Badge>
              </div>
            )}

            <div className="pt-4 border-t">
              <div className="flex items-center justify-between">
                <span className="font-medium">Total chauffeurs actifs</span>
                <Badge variant="default" className="text-lg px-3 py-1">
                  {drivers.total}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FleetSubscriptionManager;
