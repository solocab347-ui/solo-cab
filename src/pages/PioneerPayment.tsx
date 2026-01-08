import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import logo from "@/assets/logo-solocab.png";
import { 
  Trophy, 
  CreditCard, 
  Check, 
  Shield, 
  Gift, 
  Loader2,
  LogOut,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";

const PioneerPayment = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [driverData, setDriverData] = useState<any>(null);

  useEffect(() => {
    checkPioneerStatus();
  }, [user]);

  const checkPioneerStatus = async () => {
    if (!user) return;

    try {
      const { data: driver, error } = await supabase
        .from("drivers")
        .select("*, profiles!drivers_user_id_fkey(email, full_name)")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;

      setDriverData(driver);

      // Si le chauffeur a déjà payé ou a un essai actif avec stripe_customer_id, rediriger
      if (driver.stripe_customer_id) {
        // Vérifier le statut de l'abonnement
        const { data: subData } = await supabase.functions.invoke("check-driver-subscription");
        
        if (subData?.subscribed || subData?.is_free_access) {
          navigate("/driver-dashboard");
          return;
        }
      }

      // Si ce n'est pas un pionnier, rediriger vers l'inscription normale
      if (!driver.is_pioneer) {
        navigate("/driver-pending-validation");
        return;
      }
    } catch (error) {
      console.error("Error checking pioneer status:", error);
    } finally {
      setChecking(false);
    }
  };

  const handlePayment = async () => {
    if (!driverData) return;
    
    setLoading(true);
    try {
      toast.loading("Préparation du paiement...");

      const { data, error } = await supabase.functions.invoke("create-pioneer-subscription", {
        body: { driver_id: driverData.id }
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("Impossible de créer la session de paiement");
      }
    } catch (error: any) {
      console.error("Payment error:", error);
      toast.dismiss();
      toast.error("Erreur lors de la création du paiement. Veuillez réessayer.");
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-amber-500" />
          <p className="text-muted-foreground">Vérification de votre statut...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-950/20 via-background to-orange-950/20">
      {/* Header */}
      <header className="border-b border-amber-500/20 bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="SoloCab" className="w-12 h-12 object-contain" />
            <div>
              <span className="font-bold text-lg">SoloCab</span>
              <Badge className="ml-2 bg-gradient-to-r from-amber-500 to-orange-500">
                <Trophy className="w-3 h-3 mr-1" />
                Pionnier
              </Badge>
            </div>
          </div>
          <Button variant="ghost" onClick={signOut}>
            <LogOut className="w-4 h-4 mr-2" />
            Déconnexion
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Alert - Paiement non finalisé */}
        <Card className="mb-6 border-amber-500/50 bg-amber-500/10">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-amber-600 dark:text-amber-400">
                Finalisez votre inscription Pioneer
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Votre compte a été créé mais le paiement n'a pas été finalisé. 
                Complétez votre inscription pour bénéficier de votre période d'essai de 30 jours.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Pioneer Offer Card */}
        <Card className="border-2 border-amber-500/50 bg-gradient-to-br from-amber-500/10 to-orange-500/10 overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          
          <CardHeader className="text-center pb-2 relative">
            <div className="w-20 h-20 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trophy className="w-10 h-10 text-white" />
            </div>
            <CardTitle className="text-2xl mb-2">
              Offre Pionnier Exclusive
            </CardTitle>
            <p className="text-muted-foreground">
              Vous faites partie des 350 premiers chauffeurs SoloCab !
            </p>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Trial Info */}
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 text-center">
              <Gift className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <h3 className="font-bold text-lg text-green-600 dark:text-green-400">
                30 jours d'essai gratuit
              </h3>
              <p className="text-sm text-muted-foreground">
                Accès complet à toutes les fonctionnalités pendant 30 jours, sans engagement.
              </p>
            </div>

            {/* Pricing */}
            <div className="text-center py-4 border-y border-amber-500/20">
              <p className="text-sm text-muted-foreground mb-2">Après l'essai</p>
              <div className="flex items-center justify-center gap-3">
                <span className="text-2xl line-through text-muted-foreground">49,99€</span>
                <span className="text-4xl font-bold text-amber-500">39,99€</span>
                <span className="text-muted-foreground">/mois</span>
              </div>
              <Badge className="mt-2 bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30">
                Tarif garanti à vie !
              </Badge>
            </div>

            {/* Features */}
            <div className="space-y-3">
              <h4 className="font-semibold text-center">Inclus dans votre abonnement :</h4>
              <ul className="space-y-2">
                {[
                  "Gestion illimitée de clients",
                  "Réservations et courses sans limite",
                  "Génération automatique de devis et factures",
                  "QR Code personnel pour recruter des clients",
                  "Profil public sur la vitrine SoloCab",
                  "0% de commission sur vos courses",
                  "Support prioritaire 7j/7",
                ].map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Security Note */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
              <Shield className="w-4 h-4 flex-shrink-0" />
              <span>
                Paiement sécurisé par Stripe. Aucun prélèvement pendant les 30 jours d'essai.
                Annulable à tout moment.
              </span>
            </div>

            {/* CTA Button */}
            <Button
              onClick={handlePayment}
              disabled={loading}
              className="w-full py-6 text-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Redirection...
                </>
              ) : (
                <>
                  <CreditCard className="w-5 h-5 mr-2" />
                  Commencer mes 30 jours gratuits
                </>
              )}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              En cliquant, vous acceptez les conditions générales d'utilisation et la politique de confidentialité de SoloCab.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default PioneerPayment;
