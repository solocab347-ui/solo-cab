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

const Login = () => {
  const { signIn, user, userRole, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [emergencyOverride, setEmergencyOverride] = useState(false);
  const [isResumeMode, setIsResumeMode] = useState(false);

  // Form states for login
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // TIMEOUT D'URGENCE: forcer l'affichage après 8 secondes max
  useEffect(() => {
    const emergencyTimeout = setTimeout(() => {
      if (authLoading && !user) {
        console.error("🚨 EMERGENCY OVERRIDE: forcing form display");
        setEmergencyOverride(true);
      }
    }, 8000);

    return () => clearTimeout(emergencyTimeout);
  }, [authLoading, user]);

  // Redirection automatique si déjà connecté - AVEC PROTECTION BOUCLE
  useEffect(() => {
    console.log("🔍 Login check:", { authLoading, user: !!user, userRole });
    
    // NE PAS rediriger si on vient déjà d'une tentative de redirection (évite boucle)
    if (!authLoading && user && userRole && !loading) {
      console.log("➡️ Redirecting to dashboard:", userRole);
      
      const path = userRole === "admin" 
        ? "/admin-dashboard" 
        : userRole === "driver"
        ? "/driver-dashboard"
        : "/client-dashboard";
      
      // Timeout pour éviter boucle de redirection immédiate
      const redirectTimer = setTimeout(() => {
        navigate(path, { replace: true });
      }, 100);
      
      return () => clearTimeout(redirectTimer);
    }
  }, [user, userRole, authLoading, navigate, loading]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    setLoading(true);
    try {
      // Se connecter
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });

      if (error) throw error;
      if (!data.user) throw new Error("Erreur de connexion");

      // Vérifier s'il y a une inscription chauffeur en cours
      const { data: driver } = await supabase
        .from("drivers")
        .select("id, registration_step")
        .eq("user_id", data.user.id)
        .maybeSingle();

      // MODE REPRISE: Si on est en mode reprise d'inscription
      if (isResumeMode) {
        if (driver && driver.registration_step) {
          toast.success("Reprise de votre inscription");
          navigate("/register-driver", { replace: true });
          return;
        } else {
          toast.error("Aucune inscription en cours trouvée pour ce compte");
          setLoading(false);
          return;
        }
      }

      // MODE CONNEXION NORMALE: Si inscription en cours, proposer de reprendre
      if (driver && driver.registration_step) {
        toast.info("Vous avez une inscription en cours. Utilisez 'Reprendre mon inscription'");
        setLoading(false);
        setIsResumeMode(true);
        return;
      }

      // Sinon continuer avec la connexion normale
      await signIn(loginEmail, loginPassword);
      // La navigation est gérée dans signIn()
    } catch (error: any) {
      console.error("Signin error:", error);
      toast.error(error.message || "Email ou mot de passe incorrect");
      setLoading(false);
    }
  };

  // Afficher un loader pendant la vérification d'authentification - AVEC OVERRIDE
  if (authLoading && !emergencyOverride) {
    console.log("⏳ Login: showing auth loader");
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-premium mx-auto" />
          <p className="text-sm text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }
  
  console.log("✅ Login: showing form", { emergencyOverride });

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
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
                autoComplete="email"
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
              />
            </div>
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="rounded" disabled={loading} />
                <span className="text-muted-foreground">Se souvenir</span>
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
                <Link to="/register-driver" className="block">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-blue-500/30 hover:bg-blue-500/10"
                  >
                    <Car className="w-4 h-4 mr-2" />
                    S'inscrire comme chauffeur
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

                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground text-center">
                    <strong>Clients :</strong> Inscrivez-vous via le QR code de votre chauffeur ou 
                    depuis la <Link to="/chauffeurs" className="text-primary hover:underline">vitrine publique</Link>
                  </p>
                </div>
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
