import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Sparkles, Loader2, Rocket, AlertCircle, RefreshCw,
  Target, Shield, Users, CheckCircle2, ArrowRight, LogOut
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SimplifiedOnboardingTunnel } from "@/components/driver/onboarding/SimplifiedOnboardingTunnel";
import { logger } from "@/lib/productionLogger";
import { toast } from "sonner";
import logo from "@/assets/logo-solocab.png";

const ONBOARDING_STEPS = [
  { icon: Users, label: "Profil & activité" },
  { icon: Target, label: "Véhicule & tarifs" },
  { icon: Shield, label: "Documents & paiements" },
  { icon: Rocket, label: "Validation & lancement" },
];

const DriverWelcome = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const [driverData, setDriverData] = useState<any>(null);
  const [profileData, setProfileData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showIntro, setShowIntro] = useState(true);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const mountedRef = useRef(true);
  const fetchAttemptRef = useRef(0);

  // Handle Stripe Connect callback
  useEffect(() => {
    const stripeParam = searchParams.get("stripe_connect");
    if (stripeParam === "success") {
      toast.success("🎉 Compte Stripe Connect créé avec succès !", {
        description: "Votre compte est en cours de vérification par Stripe.",
        duration: 6000,
      });
      setSearchParams({});
      setShowIntro(false);
    } else if (stripeParam === "refresh") {
      toast.info("Session expirée. Veuillez recommencer la configuration Stripe.", { duration: 5000 });
      setSearchParams({});
      setShowIntro(false);
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (mountedRef.current && isLoading) {
        setLoadingTimeout(true);
        setIsLoading(false);
      }
    }, 8000);
    return () => { clearTimeout(timeoutId); mountedRef.current = false; };
  }, [isLoading]);

  const fetchDriverData = async (retryCount = 0) => {
    let currentUser = user;
    if (!currentUser) {
      const { data: sessionData } = await supabase.auth.getSession();
      currentUser = sessionData.session?.user || null;
    }
    if (!currentUser) {
      if (retryCount < 3) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        fetchAttemptRef.current++;
        return fetchDriverData(retryCount + 1);
      }
      if (mountedRef.current) { setIsLoading(false); setLoadingTimeout(true); }
      return;
    }
    try {
      const { data: driver, error } = await supabase
        .from("drivers").select("*").eq("user_id", currentUser.id).maybeSingle();
      if (!mountedRef.current) return;
      if (error) { logger.error("Erreur chargement driver", { error }); setIsLoading(false); return; }
      if (!driver) { navigate("/register-driver-promo"); return; }

      const { data: profile } = await supabase
        .from("profiles").select("*").eq("id", currentUser.id).maybeSingle();
      if (!mountedRef.current) return;

      setDriverData(driver);
      setProfileData(profile);

      // Send welcome email once (after email validation, user lands here)
      if (driver && !driver.onboarding_completed && !sessionStorage.getItem(`welcome_email_sent_${driver.id}`)) {
        sessionStorage.setItem(`welcome_email_sent_${driver.id}`, 'true');
        supabase.functions.invoke("send-email", {
          body: { driver_id: driver.id, type: "driver_welcome_new" },
        }).catch(err => console.error("Welcome email error:", err));
      }

      // If onboarding is completed OR docs validated + stripe connected → go to dashboard
      const isFullyReady = driver.onboarding_completed || 
        (driver.documents_status === "validated" && driver.stripe_connect_status === "active");
      if (isFullyReady) { navigate("/driver-dashboard", { replace: true }); return; }
    } catch (err) {
      logger.error("Exception fetchDriverData", { err });
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) fetchDriverData();
  }, [user, authLoading, navigate]);

  const handleRetry = () => {
    setIsLoading(true);
    setLoadingTimeout(false);
    fetchAttemptRef.current = 0;
    fetchDriverData();
  };

  // Loading
  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="w-10 h-10 animate-spin mx-auto text-primary" />
          <p className="text-sm text-muted-foreground">Chargement de votre espace...</p>
        </div>
      </div>
    );
  }

  // Timeout
  if (loadingTimeout && !driverData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="max-w-md p-6 border-border text-center">
          <AlertCircle className="w-12 h-12 text-warning mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">Session non trouvée</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Votre session n'a pas été détectée. Cela peut arriver après une inscription récente.
          </p>
          <div className="space-y-3">
            <Button onClick={handleRetry} className="w-full">
              <RefreshCw className="w-4 h-4 mr-2" />
              Réessayer
            </Button>
            <Button variant="outline" onClick={() => navigate("/auth")} className="w-full border-border text-muted-foreground">
              Se connecter
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!user && !driverData) { navigate("/login"); return null; }
  if (!driverData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  // Intro page
  if (showIntro) {
    const firstName = profileData?.full_name?.split(' ')[0] || '';
    
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Hero */}
        <div className="relative overflow-hidden flex-1 flex flex-col items-center justify-center px-4 py-8">
          {/* Logout button */}
          <button
            onClick={async () => { await supabase.auth.signOut(); navigate("/login"); }}
            className="absolute top-4 right-4 z-20 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-lg hover:bg-muted/50"
          >
            <LogOut className="w-3.5 h-3.5" />
            Déconnexion
          </button>
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-success/5" />
          
          <div className="relative z-10 max-w-md w-full text-center space-y-6">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <img src={logo} alt="SoloCab" className="w-16 h-16 mx-auto mb-4" />
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
                {firstName ? `Bienvenue ${firstName} !` : 'Bienvenue !'}
              </h1>
              <p className="text-sm text-muted-foreground">
                Configurez votre espace en quelques minutes
              </p>
            </motion.div>

            {/* Steps Preview */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-2"
            >
              {ONBOARDING_STEPS.map((step, i) => {
                const Icon = step.icon;
                return (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border text-left">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-sm text-foreground">{step.label}</span>
                    <CheckCircle2 className="w-4 h-4 text-muted-foreground/30 ml-auto" />
                  </div>
                );
              })}
            </motion.div>

            {/* CTA */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="space-y-3"
            >
              <Button 
                onClick={() => setShowIntro(false)}
                size="lg"
                className="w-full h-14 text-base font-semibold bg-success hover:bg-success/90 text-success-foreground"
              >
                <Rocket className="w-5 h-5 mr-2" />
                Configurer mon espace
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>

              <div className="flex items-center justify-center gap-4 text-[10px] text-muted-foreground">
                <span>✓ 100% gratuit</span>
                <span>✓ Toutes fonctionnalités</span>
                <span>✓ 5 min de configuration</span>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  // Tunnel
  const driverProfile = { driver: driverData, profile: profileData };

  return (
    <SimplifiedOnboardingTunnel 
      driverId={driverData.id}
      userId={user?.id || driverData.user_id}
      driverProfile={driverProfile}
      onComplete={() => navigate("/driver-dashboard", { replace: true })}
    />
  );
};

export default DriverWelcome;
