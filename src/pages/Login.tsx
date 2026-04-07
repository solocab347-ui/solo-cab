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
import { lovable } from "@/integrations/lovable/index";

const REMEMBER_ME_KEY = "solocab_remember_credentials";

const Login = () => {
  const { t } = useLocale();
  const { signIn, user, userRole, isCompanyEmployee, isCompanyEmployeeChecked, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [emergencyOverride, setEmergencyOverride] = useState(false);
  const [isResumeMode, setIsResumeMode] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Form states for login
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Charger uniquement l'email sauvegardé (JAMAIS le mot de passe)
  useEffect(() => {
    try {
      // Migration: supprimer les anciennes données contenant le mot de passe
      const saved = localStorage.getItem(REMEMBER_ME_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.password) {
          // Ancienne version avec mot de passe - migrer en supprimant le password
          localStorage.setItem(REMEMBER_ME_KEY, JSON.stringify({
            email: parsed.email,
            remember: true
          }));
        }
        if (parsed.email) setLoginEmail(parsed.email);
        if (parsed.remember) setRememberMe(true);
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
        path = "/driver-dashboard";
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
              {/* OAuth quick login */}
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full h-10 gap-3 text-sm"
                  onClick={async () => {
                    try {
                      const result = await lovable.auth.signInWithOAuth("google", {
                        redirect_uri: window.location.origin + "/login",
                      });
                      if (result.error) toast.error(result.error.message);
                    } catch (e: any) {
                      toast.error(e.message);
                    }
                  }}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Se connecter avec Google
                </Button>
                <Button
                  variant="outline"
                  className="w-full h-10 gap-3 text-sm"
                  onClick={async () => {
                    try {
                      const result = await lovable.auth.signInWithOAuth("apple", {
                        redirect_uri: window.location.origin + "/login",
                      });
                      if (result.error) toast.error(result.error.message);
                    } catch (e: any) {
                      toast.error(e.message);
                    }
                  }}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                  </svg>
                  Se connecter avec Apple
                </Button>
              </div>

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
