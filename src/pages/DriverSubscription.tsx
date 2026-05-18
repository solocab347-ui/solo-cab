import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, LogOut, Loader2, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useOptimizedDriverProfile } from "@/hooks/useOptimizedDriverProfile";
import { queryClient } from "@/lib/queryClient";
import SubscriptionManager from "@/components/driver/payments/SubscriptionManager";
import logo from "@/assets/logo-solocab.png";

/**
 * Page web autonome de gestion d'abonnement chauffeur.
 *
 * Accessible depuis le navigateur même si l'app native est obligatoire pour
 * utiliser l'espace chauffeur, afin que :
 *  - Les chauffeurs SANS abonnement actif puissent souscrire (sinon ils ne
 *    pourraient jamais le faire tant que l'app n'est pas publiée sur les stores).
 *  - Les chauffeurs AVEC abonnement actif puissent gérer / résilier leur
 *    abonnement (portail Stripe) depuis le web.
 *
 * Cette page NE déconnecte PAS automatiquement la session.
 */
const DriverSubscription = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        navigate("/login?redirect=/driver-subscription", { replace: true });
        return;
      }
      setUserId(data.session.user.id);
      setAuthChecked(true);
    })();
  }, [navigate]);

  const { driverProfile, isLoading } = useOptimizedDriverProfile(userId);

  const handleSignOut = async () => {
    await supabase.auth.signOut().catch(() => {});
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="px-4 pt-4 pb-2 flex items-center justify-between border-b border-border/40">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/driver-app-required")}
          className="text-muted-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Retour
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
          className="text-muted-foreground"
        >
          <LogOut className="w-4 h-4 mr-1.5" />
          Se déconnecter
        </Button>
      </header>

      <div className="flex-1 px-4 py-6">
        <div className="w-full max-w-2xl mx-auto space-y-5">
          <div className="text-center space-y-2">
            <img src={logo} alt="SoloCab" className="w-12 h-12 mx-auto" />
            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
              <Smartphone className="w-3 h-3 mr-1" />
              Mon abonnement
            </Badge>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              Gérer mon abonnement
            </h1>
            <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
              Souscrivez, modifiez ou résiliez votre abonnement SoloCab depuis
              le web. Cette page reste accessible même sans l'application mobile.
            </p>
          </div>

          {!authChecked || isLoading ? (
            <Card className="p-10 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </Card>
          ) : !driverProfile?.driver ? (
            <Card className="p-6 text-center space-y-3">
              <p className="text-sm text-muted-foreground">
                Impossible de charger votre profil chauffeur.
              </p>
              <Button onClick={() => navigate("/driver-app-required")} variant="outline">
                Retour
              </Button>
            </Card>
          ) : (
            <Card className="p-5 sm:p-6 bg-card/50 backdrop-blur border border-border/50">
              <SubscriptionManager
                driverProfile={driverProfile}
                onSubscriptionUpdate={() => {
                  queryClient.invalidateQueries({
                    queryKey: ["driver-profile-optimized", userId],
                  });
                }}
              />
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default DriverSubscription;
