import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Crown, Calendar, CreditCard, Loader2, CheckCircle2, Clock, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import logo from "@/assets/logo-solocab.png";

const PioneerPayment = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "annual">("monthly");
  const [isLoading, setIsLoading] = useState(false);
  const [driverInfo, setDriverInfo] = useState<{
    daysRemaining: number;
    trialEndDate: Date | null;
    isPioneer: boolean;
  } | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);

  useEffect(() => {
    if (user) {
      checkPioneerStatus();
    }
  }, [user]);

  const checkPioneerStatus = async () => {
    if (!user) return;
    
    try {
      const { data: driver, error } = await supabase
        .from("drivers")
        .select("is_pioneer, created_at, subscription_paid, stripe_customer_id")
        .eq("user_id", user.id)
        .single();

      if (error || !driver) {
        navigate("/register-driver");
        return;
      }

      if (!driver.is_pioneer) {
        navigate("/register-driver-promo");
        return;
      }

      // If already paid, redirect to dashboard
      if (driver.subscription_paid && driver.stripe_customer_id) {
        navigate("/driver-dashboard");
        return;
      }

      // Calculate days remaining in trial
      const createdAt = new Date(driver.created_at);
      const trialEndDate = new Date(createdAt.getTime() + 30 * 24 * 60 * 60 * 1000);
      const now = new Date();
      const daysRemaining = Math.max(0, Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

      setDriverInfo({
        daysRemaining,
        trialEndDate,
        isPioneer: driver.is_pioneer,
      });
    } catch (error) {
      console.error("Error checking pioneer status:", error);
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const handlePayment = async () => {
    if (!user) {
      toast.error("Veuillez vous connecter");
      navigate("/login");
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-pioneer-payment", {
        body: { plan: selectedPlan },
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("URL de paiement non disponible");
      }
    } catch (error: any) {
      console.error("Payment error:", error);
      toast.error(error.message || "Erreur lors de la création du paiement");
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingStatus) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const isTrialActive = driverInfo && driverInfo.daysRemaining > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50/50 via-background to-orange-50/30 flex items-center justify-center p-4">
      <div className="container max-w-2xl">
        <Card className="p-8 md:p-12 bg-card border-border shadow-elegant overflow-hidden relative">
          {/* Badge Pionnier */}
          <div className="absolute top-4 right-4">
            <Badge className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white border-0 shadow-lg px-3 py-1.5 flex items-center gap-1.5">
              <Crown className="w-4 h-4" />
              Pionnier
            </Badge>
          </div>

          {/* Logo */}
          <div className="mb-8 text-center">
            <img src={logo} alt="SoloCab" className="w-20 h-20 mx-auto mb-4 object-contain" />
          </div>

          {/* Icône principale */}
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-amber-500/20 to-yellow-500/20 flex items-center justify-center border-2 border-amber-500/30">
            <Star className="w-10 h-10 text-amber-500" />
          </div>

          {/* Titre */}
          <h1 className="text-3xl md:text-4xl font-bold mb-4 text-center text-foreground">
            {isTrialActive ? "Votre Période d'Essai Pionnier" : "Activez Votre Abonnement Pionnier"}
          </h1>

          {/* Message essai ou expiration */}
          {isTrialActive ? (
            <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-6 mb-8">
              <div className="flex items-center justify-center gap-2 mb-3">
                <Clock className="w-5 h-5 text-emerald-600" />
                <span className="font-semibold text-emerald-800 dark:text-emerald-400">
                  {driverInfo.daysRemaining} jour{driverInfo.daysRemaining > 1 ? "s" : ""} restant{driverInfo.daysRemaining > 1 ? "s" : ""}
                </span>
              </div>
              <p className="text-emerald-700 dark:text-emerald-300 text-sm leading-relaxed text-center">
                En tant que Pionnier, vous bénéficiez de <strong>30 jours d'accès gratuit complet</strong>. 
                Votre essai se termine le{" "}
                <strong>{driverInfo.trialEndDate?.toLocaleDateString("fr-FR", { 
                  day: "numeric", 
                  month: "long", 
                  year: "numeric" 
                })}</strong>.
              </p>
            </div>
          ) : (
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-6 mb-8">
              <div className="flex items-center justify-center gap-2 mb-3">
                <Calendar className="w-5 h-5 text-amber-600" />
                <span className="font-semibold text-amber-800 dark:text-amber-400">Période d'essai terminée</span>
              </div>
              <p className="text-amber-700 dark:text-amber-300 text-sm leading-relaxed text-center">
                Votre période d'essai gratuite de 30 jours est terminée. 
                Pour continuer à utiliser SoloCab, veuillez choisir un abonnement ci-dessous.
              </p>
            </div>
          )}

          {/* Texte d'intro */}
          <p className="text-lg text-muted-foreground mb-8 leading-relaxed text-center">
            {isTrialActive 
              ? "Vous pouvez souscrire à tout moment pour continuer après votre essai." 
              : "Choisissez votre formule d'abonnement et continuez à développer votre clientèle."}
          </p>

          {/* Sélection du plan */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {/* Plan Mensuel */}
            <button
              onClick={() => setSelectedPlan("monthly")}
              className={`p-6 rounded-xl border-2 transition-all text-left ${
                selectedPlan === "monthly"
                  ? "border-primary bg-primary/5 shadow-md"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <span className="font-semibold text-foreground">Mensuel</span>
                {selectedPlan === "monthly" && (
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                )}
              </div>
              <div className="text-3xl font-bold text-foreground mb-2">
                9,99€<span className="text-lg font-normal text-muted-foreground">/mois</span>
              </div>
              <p className="text-sm text-muted-foreground">Sans engagement</p>
            </button>

            {/* Plan Annuel */}
            <button
              onClick={() => setSelectedPlan("annual")}
              className={`p-6 rounded-xl border-2 transition-all text-left relative ${
                selectedPlan === "annual"
                  ? "border-primary bg-primary/5 shadow-md"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <Badge className="absolute -top-3 right-4 bg-gradient-to-r from-emerald-500 to-green-500 text-white border-0">
                -15%
              </Badge>
              <div className="flex items-center justify-between mb-4">
                <span className="font-semibold text-foreground">Annuel</span>
                {selectedPlan === "annual" && (
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                )}
              </div>
              <div className="text-3xl font-bold text-foreground mb-2">
                101,90€<span className="text-lg font-normal text-muted-foreground">/an</span>
              </div>
              <p className="text-sm text-muted-foreground">Soit 8,49€/mois</p>
            </button>
          </div>

          {/* Avantages */}
          <div className="bg-muted/30 rounded-lg p-4 mb-8">
            <h3 className="font-semibold mb-3 text-foreground">Inclus dans votre abonnement :</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                Profil public et QR code personnalisé
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                Gestion complète de vos courses et clients
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                Assistant IA pour optimiser votre activité
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                Réseau de partenaires entre chauffeurs
              </li>
            </ul>
          </div>

          {/* Bouton de paiement */}
          <div className="flex flex-col gap-4">
            <Button 
              size="lg" 
              className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white shadow-lg"
              onClick={handlePayment}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Redirection vers le paiement...
                </>
              ) : (
                <>
                  <CreditCard className="w-5 h-5 mr-2" />
                  {isTrialActive ? "Souscrire maintenant" : "Payer et continuer"}
                </>
              )}
            </Button>

            {isTrialActive && (
              <Button 
                size="lg" 
                variant="outline" 
                className="w-full"
                onClick={() => navigate("/driver-dashboard")}
              >
                Continuer avec l'essai ({driverInfo.daysRemaining} jours restants)
              </Button>
            )}
          </div>

          {/* Note de sécurité */}
          <p className="text-xs text-muted-foreground text-center mt-6">
            🔒 Paiement sécurisé par Stripe. Vous pouvez annuler à tout moment.
          </p>
        </Card>
      </div>
    </div>
  );
};

export default PioneerPayment;
