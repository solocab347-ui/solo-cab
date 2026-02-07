import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Sparkles, 
  Loader2,
  Rocket,
  AlertCircle,
  RefreshCw
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
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const mountedRef = useRef(true);
  const fetchAttemptRef = useRef(0);

  // Timeout de sécurité pour éviter le chargement infini
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (mountedRef.current && isLoading) {
        setLoadingTimeout(true);
        setIsLoading(false);
      }
    }, 8000); // 8 secondes max de chargement

    return () => {
      clearTimeout(timeoutId);
      mountedRef.current = false;
    };
  }, [isLoading]);

  // Charger les données du chauffeur - avec retry
  const fetchDriverData = async (retryCount = 0) => {
    // Si on n'a pas d'utilisateur, vérifier directement la session Supabase
    let currentUser = user;
    
    if (!currentUser) {
      const { data: sessionData } = await supabase.auth.getSession();
      currentUser = sessionData.session?.user || null;
    }
    
    if (!currentUser) {
      // Attendre un peu et réessayer si on vient de s'inscrire
      if (retryCount < 3) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        fetchAttemptRef.current++;
        return fetchDriverData(retryCount + 1);
      }
      
      if (mountedRef.current) {
        setIsLoading(false);
        setLoadingTimeout(true);
      }
      return;
    }

    try {
      const { data: driver, error } = await supabase
        .from("drivers")
        .select("*")
        .eq("user_id", currentUser.id)
        .maybeSingle();

      if (!mountedRef.current) return;

      if (error) {
        logger.error("Erreur chargement driver", { error });
        setIsLoading(false);
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
        .eq("id", currentUser.id)
        .maybeSingle();

      if (!mountedRef.current) return;

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
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    if (!authLoading) {
      fetchDriverData();
    }
  }, [user, authLoading, navigate]);

  // Retry function
  const handleRetry = () => {
    setIsLoading(true);
    setLoadingTimeout(false);
    fetchAttemptRef.current = 0;
    fetchDriverData();
  };

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

  // Si timeout de chargement - afficher message d'erreur avec option de réessayer
  if (loadingTimeout && !driverData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-center px-4">
        <Card className="max-w-md p-6 bg-slate-800/50 backdrop-blur-lg border-amber-500/30 text-center">
          <AlertCircle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Session non trouvée</h2>
          <p className="text-white/70 text-sm mb-4">
            Votre session n'a pas été détectée. Cela peut arriver après une inscription récente.
          </p>
          <div className="space-y-3">
            <Button 
              onClick={handleRetry}
              className="w-full bg-gradient-to-r from-emerald-500 to-green-600"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Réessayer
            </Button>
            <Button 
              variant="outline"
              onClick={() => navigate("/auth")}
              className="w-full border-white/20 text-white hover:bg-white/10"
            >
              Se connecter
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Si pas connecté mais pas de timeout, rediriger
  if (!user && !driverData) {
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
