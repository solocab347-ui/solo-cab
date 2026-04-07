import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Car, User, Loader2 } from "lucide-react";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import logo from "@/assets/logo-solocab.png";

type UserType = "client" | "driver" | null;

const SignupChoice = () => {
  const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState<UserType>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const handleOAuth = async (provider: "google" | "apple") => {
    if (!selectedType) {
      toast.error("Choisissez d'abord votre profil (Client ou Chauffeur)");
      return;
    }

    setLoading(provider);

    try {
      // Store choice in localStorage for post-OAuth handling
      localStorage.setItem("solocab_oauth_signup_type", selectedType);

      const result = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: window.location.origin + "/oauth-onboarding",
      });

      if (result.error) {
        toast.error("Erreur de connexion", {
          description: result.error.message || "Réessayez",
        });
        setLoading(null);
        return;
      }

      if (result.redirected) {
        // Browser will redirect — just wait
        return;
      }

      // Tokens received — session is set. Route to onboarding.
      await handlePostOAuth(selectedType);
    } catch (err: any) {
      toast.error("Erreur", { description: err.message });
      setLoading(null);
    }
  };

  const handlePostOAuth = async (type: UserType) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Utilisateur non trouvé");

      // Check if profile exists
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, onboarding_completed")
        .eq("id", user.id)
        .maybeSingle();

      if (!profile) {
        // Profile should be auto-created by trigger, but ensure it exists
        await supabase.from("profiles").upsert({
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || "",
        });
      }

      // Check if user already has a role (existing account)
      const { data: existingRoles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (existingRoles && existingRoles.length > 0) {
        // Existing user — redirect to appropriate dashboard
        const roles = existingRoles.map(r => r.role);
        if (roles.includes("admin")) {
          navigate("/admin-dashboard", { replace: true });
        } else if (roles.includes("driver")) {
          navigate("/driver-dashboard", { replace: true });
        } else {
          navigate("/client-dashboard", { replace: true });
        }
        toast.success("Bon retour !");
        return;
      }

      // New user — go to onboarding
      localStorage.setItem("solocab_oauth_signup_type", type!);
      navigate("/oauth-onboarding", { replace: true });
    } catch (err: any) {
      toast.error("Erreur", { description: err.message });
      setLoading(null);
    }
  };

  return (
    <div
      className="min-h-screen bg-background flex items-center justify-center p-4"
      style={{
        paddingTop: "max(env(safe-area-inset-top, 0px), 1rem)",
        paddingBottom: "max(env(safe-area-inset-bottom, 0px), 1rem)",
      }}
    >
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="text-center">
          <Link to="/" className="inline-block mb-4">
            <img src={logo} alt="SoloCab" className="w-16 h-16 object-contain mx-auto" />
          </Link>
          <h1 className="text-2xl font-bold">Créer un compte</h1>
          <p className="text-muted-foreground mt-2">
            Choisissez votre profil pour commencer
          </p>
        </div>

        {/* Type selection */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setSelectedType("client")}
            className={`p-4 rounded-xl border-2 transition-all text-center ${
              selectedType === "client"
                ? "border-primary bg-primary/10 shadow-md"
                : "border-border hover:border-primary/50"
            }`}
          >
            <User className={`w-8 h-8 mx-auto mb-2 ${selectedType === "client" ? "text-primary" : "text-muted-foreground"}`} />
            <p className="font-semibold text-sm">Je suis Client</p>
            <p className="text-xs text-muted-foreground mt-1">Réserver des courses</p>
          </button>
          <button
            onClick={() => setSelectedType("driver")}
            className={`p-4 rounded-xl border-2 transition-all text-center ${
              selectedType === "driver"
                ? "border-primary bg-primary/10 shadow-md"
                : "border-border hover:border-primary/50"
            }`}
          >
            <Car className={`w-8 h-8 mx-auto mb-2 ${selectedType === "driver" ? "text-primary" : "text-muted-foreground"}`} />
            <p className="font-semibold text-sm">Je suis Chauffeur</p>
            <p className="text-xs text-muted-foreground mt-1">Gérer mes courses</p>
          </button>
        </div>

        {/* OAuth buttons — visible only after type selection */}
        {selectedType && (
          <Card className="p-5 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <p className="text-sm text-center text-muted-foreground font-medium">
              Inscription rapide
            </p>

            <Button
              variant="outline"
              className="w-full h-11 gap-3"
              onClick={() => handleOAuth("google")}
              disabled={!!loading}
            >
              {loading === "google" ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              )}
              Continuer avec Google
            </Button>

            <Button
              variant="outline"
              className="w-full h-11 gap-3"
              onClick={() => handleOAuth("apple")}
              disabled={!!loading}
            >
              {loading === "apple" ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                </svg>
              )}
              Continuer avec Apple
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">ou</span>
              </div>
            </div>

            <Button
              variant="ghost"
              className="w-full"
              onClick={() => {
                if (selectedType === "client") {
                  navigate("/register-client");
                } else {
                  navigate("/register-driver");
                }
              }}
            >
              Inscription avec email
            </Button>
          </Card>
        )}

        {/* Login link */}
        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            Déjà un compte ?{" "}
            <Link to="/login" className="text-primary font-medium hover:underline">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignupChoice;
