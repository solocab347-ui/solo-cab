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

const Login = () => {
  const { signIn, user, userRole, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [emergencyOverride, setEmergencyOverride] = useState(false);

  // Form states for login
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // TIMEOUT D'URGENCE: forcer l'affichage après 3 secondes max
  useEffect(() => {
    const emergencyTimeout = setTimeout(() => {
      if (authLoading && !user) {
        console.error("🚨 EMERGENCY OVERRIDE: forcing form display");
        setEmergencyOverride(true);
      }
    }, 3000);

    return () => clearTimeout(emergencyTimeout);
  }, [authLoading, user]);

  // Redirection automatique si déjà connecté - SIMPLIFIÉ
  useEffect(() => {
    console.log("🔍 Login check:", { authLoading, user: !!user, userRole });
    
    if (!authLoading && user && userRole) {
      console.log("➡️ Redirecting to dashboard:", userRole);
      
      const path = userRole === "admin" 
        ? "/admin-dashboard" 
        : userRole === "driver"
        ? "/driver-dashboard"
        : "/client-dashboard";
        
      navigate(path, { replace: true });
    }
  }, [user, userRole, authLoading, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    setLoading(true);
    try {
      await signIn(loginEmail, loginPassword);
      // La navigation est gérée dans signIn() - pas besoin de setLoading(false)
      // car le composant sera démonté lors de la navigation
    } catch (error) {
      // Error handled in useAuth
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
          <h1 className="text-2xl font-bold mt-4">Connexion</h1>
          <p className="text-muted-foreground mt-2">
            Accédez à votre espace SoloCab
          </p>
        </div>

        <Card className="p-6 shadow-elegant">
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
              className="w-full bg-gradient-premium hover:opacity-90 transition-opacity"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Connexion...</>
              ) : (
                "Se connecter"
              )}
            </Button>
          </form>

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

              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="text-xs text-muted-foreground text-center">
                  <strong>Clients :</strong> Inscrivez-vous via le QR code de votre chauffeur ou 
                  depuis la <Link to="/chauffeurs" className="text-primary hover:underline">vitrine publique</Link>
                </p>
              </div>
            </div>
          </div>
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
