import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Car, Loader2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import logo from "@/assets/logo-solocab.png";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/productionLogger";
import { useLocale } from "@/hooks/useLocale";
import { LanguageSelector } from "@/components/LanguageSelector";
import { getRememberMe, setRememberMe as persistRememberMe } from "@/lib/authStorage";
import { isMobileApp } from "@/lib/platform";


const REMEMBER_ME_KEY = "solocab_remember_credentials";

const Login = () => {
  const { t } = useLocale();
  const { signIn, user, userRole, isCompanyEmployee, isCompanyEmployeeChecked, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [emergencyOverride, setEmergencyOverride] = useState(false);
  const [isResumeMode, setIsResumeMode] = useState(false);
  // Par défaut TRUE (modèle Uber/Bolt : on reste connecté entre les ouvertures)
  const [rememberMe, setRememberMe] = useState<boolean>(getRememberMe());

  // Form states for login
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Charger uniquement l'email sauvegardé (JAMAIS le mot de passe)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(REMEMBER_ME_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Migration : supprimer toute ancienne donnée contenant un mot de passe
        if (parsed.password) {
          localStorage.setItem(REMEMBER_ME_KEY, JSON.stringify({
            email: parsed.email,
            remember: true,
          }));
        }
        if (parsed.email) setLoginEmail(parsed.email);
      }
    } catch (e) {
      localStorage.removeItem(REMEMBER_ME_KEY);
    }
  }, []);

  // TIMEOUT D'URGENCE: forcer l'affichage après 4 secondes max (réduit de 8s)
  useEffect(() => {
    const emergencyTimeout = setTimeout(() => {
      if (authLoading && !user) {
        logger.error("EMERGENCY OVERRIDE: forcing form display");
        setEmergencyOverride(true);
      }
    }, 4000);

    return () => clearTimeout(emergencyTimeout);
  }, [authLoading, user]);

  // Redirection automatique si déjà connecté - AVEC PROTECTION BOUCLE
  const [hasRedirected, setHasRedirected] = useState(false);
  
  useEffect(() => {
    // Si déjà redirigé, ne rien faire
    if (hasRedirected) return;
    
    // NE PAS rediriger pendant le chargement initial ou si loading local
    if (authLoading || loading) return;
    
    // Rediriger seulement si user ET userRole sont définis
    if (user && userRole) {
      // CRITIQUE: Pour les clients, attendre que isCompanyEmployeeChecked soit true
      if (userRole === "client" && !isCompanyEmployeeChecked) {
        logger.info("Waiting for company employee check to complete");
        return;
      }
      
      logger.info("Redirecting to dashboard", { userRole, isCompanyEmployee, isCompanyEmployeeChecked });
      setHasRedirected(true);
      
      // Si c'est un collaborateur d'entreprise, rediriger vers son dashboard
      if (userRole === "client" && isCompanyEmployee) {
        navigate("/company-employee-dashboard", { replace: true });
        return;
      }
      
      let path: string;
      if (userRole === "admin") {
        path = "/admin-dashboard";
      } else if (userRole === "driver") {
        // BLOCAGE WEB : les chauffeurs ne peuvent se connecter que dans l'app native
        path = isMobileApp() ? "/driver-dashboard" : "/driver-app-required";
      } else if (userRole === "client") {
        path = "/client-dashboard";
      } else {
        path = "/client-dashboard";
      }
      
      navigate(path, { replace: true });
    }
  }, [user, userRole, isCompanyEmployee, isCompanyEmployeeChecked, authLoading, navigate, loading, hasRedirected]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      toast.error("Champs manquants", {
        description: "Veuillez remplir votre email et mot de passe",
        duration: 3000,
      });
      return;
    }

    setLoading(true);
    setHasRedirected(true); // Empêcher le useEffect de rediriger pendant qu'on traite
    
    try {
      // MODE REPRISE: Vérifier d'abord s'il y a une inscription en cours
      if (isResumeMode) {
        // Connexion temporaire pour vérifier
        const { data, error } = await supabase.auth.signInWithPassword({
          email: loginEmail,
          password: loginPassword,
        });
        
        if (error) throw error;
        if (!data.user) throw new Error("Erreur de connexion");
        
        const { data: driver } = await supabase
          .from("drivers")
          .select("id, registration_step, status, free_access_granted")
          .eq("user_id", data.user.id)
          .maybeSingle();
          
        if (driver && driver.registration_step) {
          toast.success("Inscription retrouvée", {
            description: "Reprise de votre inscription chauffeur en cours...",
            duration: 3000,
          });
          navigate("/register-driver", { replace: true });
          return;
        } else {
          // Déconnexion si pas d'inscription en cours
          await supabase.auth.signOut();
          toast.error("Aucune inscription en cours", {
            description: "Aucune inscription chauffeur trouvée pour ce compte",
            duration: 4000,
          });
          setLoading(false);
          setHasRedirected(false);
          return;
        }
      }

      // Sauvegarder uniquement l'email (JAMAIS le mot de passe - sécurité)
      if (rememberMe) {
        localStorage.setItem(REMEMBER_ME_KEY, JSON.stringify({
          email: loginEmail,
          remember: true
        }));
      } else {
        localStorage.removeItem(REMEMBER_ME_KEY);
      }

      // Appliquer la préférence de persistance de session AVANT signIn
      // (route les tokens Supabase vers localStorage ou sessionStorage)
      persistRememberMe(rememberMe);

      // MODE CONNEXION NORMALE: Utiliser signIn qui gère tout (y compris employee check)
      await signIn(loginEmail, loginPassword);
      // La navigation est gérée dans signIn()
    } catch (error: any) {
      logger.error("Signin error", { error });
      // Ne PAS afficher de toast ici car signIn() en affiche déjà un
      setLoading(false);
      setHasRedirected(false);
    }
  };

  // Afficher un loader pendant la vérification d'authentification - AVEC OVERRIDE
  if (authLoading && !emergencyOverride) {
    logger.debug("Login: showing auth loader");
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-premium mx-auto" />
          <p className="text-sm text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }
  
  logger.debug("Login: showing form", { emergencyOverride });

  return (
    <div 
      className="min-h-screen bg-background flex items-center justify-center p-4"
      style={{
        paddingTop: "max(env(safe-area-inset-top, 0px), 1rem)",
        paddingBottom: "max(env(safe-area-inset-bottom, 0px), 1rem)",
      }}
    >
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="text-center">
          <Link to="/" className="inline-flex items-center gap-3 mb-8">
            <img src={logo} alt="SoloCab" className="w-16 h-16 object-contain" />
          </Link>
          <h1 className="text-2xl font-bold mt-4">
            {isResumeMode ? "Reprendre mon inscription" : "Connexion"}
          </h1>
          <p className="text-muted-foreground mt-2">
            {isResumeMode 
              ? "Connectez-vous pour continuer votre inscription chauffeur" 
              : "Accédez à votre espace SoloCab"
            }
          </p>
          {isResumeMode && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsResumeMode(false);
                setLoginEmail("");
                setLoginPassword("");
              }}
              className="mt-3 text-sm"
            >
              ← Retour à la connexion normale
            </Button>
          )}
        </div>

        <Card className={`p-6 shadow-elegant ${isResumeMode ? 'border-2 border-orange-500' : ''}`}>
          {isResumeMode && (
            <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <p className="text-sm text-orange-900 font-medium flex items-center gap-2">
                <span className="text-lg">🔄</span>
                Mode reprise d'inscription activé
              </p>
              <p className="text-xs text-orange-700 mt-1">
                Entrez vos identifiants pour reprendre votre inscription là où vous l'avez laissée
              </p>
            </div>
          )}
          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="votre@email.com"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                disabled={loading}
                className="transition-all focus:shadow-sm"
                autoComplete="email username"
                name="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                disabled={loading}
                className="transition-all focus:shadow-sm"
                autoComplete="current-password"
                name="password"
              />
            </div>
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  className="rounded border-border text-primary focus:ring-primary" 
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={loading} 
                />
                <span className="text-muted-foreground">Se souvenir de moi</span>
              </label>
              <a href="#" className="text-premium hover:underline">
                Mot de passe oublié ?
              </a>
            </div>
            <Button
              type="submit"
              disabled={loading}
              className={`w-full transition-opacity ${
                isResumeMode 
                  ? 'bg-gradient-to-r from-orange-500 to-orange-600 hover:opacity-90' 
                  : 'bg-gradient-premium hover:opacity-90'
              }`}
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Connexion...</>
              ) : isResumeMode ? (
                "Reprendre mon inscription →"
              ) : (
                "Se connecter"
              )}
            </Button>
          </form>

          {!isResumeMode && (
            <div className="mt-6 space-y-4">
              {/* Separator */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Pas encore inscrit ?
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <Link to="/signup" className="block">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-primary/30 hover:bg-primary/10"
                  >
                    Créer un compte (Client ou Chauffeur)
                  </Button>
                </Link>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsResumeMode(true)}
                  className="w-full border-orange-500/30 hover:bg-orange-500/10 text-orange-600 hover:text-orange-700"
                >
                  🔄 Reprendre mon inscription chauffeur
                </Button>
              </div>
            </div>
          )}
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          En continuant, vous acceptez nos{" "}
          <a href="#" className="text-premium hover:underline">
            conditions d'utilisation
          </a>
        </p>
      </div>
    </div>
  );
};

export default Login;
