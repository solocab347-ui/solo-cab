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
