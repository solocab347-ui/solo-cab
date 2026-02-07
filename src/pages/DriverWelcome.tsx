import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Sparkles, 
  Loader2,
  Rocket
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { HorizontalOnboardingTunnel } from "@/components/driver/onboarding";
import { logger } from "@/lib/productionLogger";

const DriverWelcome = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [driverData, setDriverData] = useState<any>(null);
  const [profileData, setProfileData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showIntro, setShowIntro] = useState(true);

  // Charger les données du chauffeur
  useEffect(() => {
    const fetchDriverData = async () => {
      if (!user) return;

      try {
        const { data: driver, error } = await supabase
          .from("drivers")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) {
          logger.error("Erreur chargement driver", { error });
          return;
        }

        if (!driver) {
          // Pas de profil chauffeur - rediriger vers l'inscription
          navigate("/register-driver-promo");
          return;
        }

        // Charger aussi le profil
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        setDriverData(driver);
        setProfileData(profile);

        // Si l'onboarding est déjà terminé, rediriger vers le dashboard
        if (driver.onboarding_completed) {
          navigate("/driver-dashboard", { replace: true });
          return;
        }
      } catch (err) {
        logger.error("Exception fetchDriverData", { err });
      } finally {
        setIsLoading(false);
      }
    };

    if (!authLoading) {
      fetchDriverData();
    }
  }, [user, authLoading, navigate]);

  // Afficher un loader pendant le chargement
  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-emerald-400" />
          <p className="text-white/70">Chargement de votre espace...</p>
        </div>
      </div>
    );
  }

  // Si pas connecté, rediriger
  if (!user) {
    navigate("/auth");
    return null;
  }

  // Si pas de données chauffeur, afficher un loader (la redirection est gérée dans useEffect)
  if (!driverData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-emerald-400" />
          <p className="text-white/70">Préparation de votre espace...</p>
        </div>
      </div>
    );
  }

  // Page d'introduction avant le tunnel
  if (showIntro) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-60 sm:w-96 h-60 sm:h-96 bg-emerald-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-60 sm:w-96 h-60 sm:h-96 bg-purple-500/20 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 container mx-auto px-4 py-8 min-h-screen flex flex-col items-center justify-center">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <div className="flex items-center justify-center gap-3 mb-4">
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 via-green-500 to-teal-500 p-1"
              >
                <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-emerald-400" />
                </div>
              </motion.div>
            </div>

            <motion.h1 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4"
            >
              Bienvenue sur{" "}
              <span className="bg-gradient-to-r from-emerald-400 to-green-500 bg-clip-text text-transparent">
                SoloCab
              </span>
              {" "}!
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-base sm:text-lg text-white/70 max-w-2xl mx-auto mb-6"
            >
              Vous êtes à quelques étapes de lancer votre indépendance.<br />
              Configurez votre espace chauffeur en quelques minutes.
            </motion.p>
          </motion.div>

          {/* Card de bienvenue */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="max-w-md w-full mx-auto"
          >
            <Card className="p-6 sm:p-8 bg-slate-800/50 backdrop-blur-lg border-emerald-500/30 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
                <Rocket className="w-8 h-8 text-white" />
              </div>
              
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-3">
                Prêt à démarrer ?
              </h2>
              
              <p className="text-white/70 text-sm sm:text-base mb-6">
                Complétez votre profil pour accéder à toutes les fonctionnalités de SoloCab.
                <br />
                <span className="text-emerald-400 font-medium">
                  14 jours d'essai gratuit inclus !
                </span>
              </p>

              <div className="space-y-3">
                <Button 
                  onClick={() => setShowIntro(false)}
                  size="lg"
                  className="w-full h-14 text-base font-semibold bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white"
                >
                  <Rocket className="w-5 h-5 mr-2" />
                  Configurer mon espace
                </Button>
              </div>

              <p className="mt-4 text-xs text-white/50">
                Aucun paiement requis • Résiliable à tout moment
              </p>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }

  // Construire le driverProfile attendu par le tunnel
  const driverProfile = {
    driver: driverData,
    profile: profileData
  };

  // Afficher le tunnel d'onboarding
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <HorizontalOnboardingTunnel 
        driverId={driverData.id}
        userId={user.id}
        driverProfile={driverProfile}
        onComplete={() => {
          navigate("/driver-dashboard", { replace: true });
        }}
      />
    </div>
  );
};

export default DriverWelcome;
