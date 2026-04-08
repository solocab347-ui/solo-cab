import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Loader2, CheckCircle, Shield, Eye, EyeOff, 
  ArrowRight, Rocket, Users, Target, CreditCard,
  Sparkles, Clock
} from "lucide-react";
import { motion } from "framer-motion";
import logo from "@/assets/logo-solocab.png";

// Registration page - Free access model

const RegisterDriverPromoFree = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    const checkExistingSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: existingDriver } = await supabase
            .from("drivers")
            .select("id, subscription_status, subscription_paid, trial_status")
            .eq("user_id", session.user.id)
            .maybeSingle();
          if (existingDriver) {
            navigate("/driver-dashboard");
            return;
          }
        }
      } catch (error) {
        console.error("[Register] Session check error:", error);
      } finally {
        setInitializing(false);
      }
    };
    checkExistingSession();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });
      if (error) throw error;
      if (data.user) {
        const { data: driverData } = await supabase
          .from("drivers")
          .select("id")
          .eq("user_id", data.user.id)
          .maybeSingle();
        if (driverData) {
          toast.success("Connexion réussie !");
          navigate("/driver-dashboard");
        } else {
          toast.error("Aucun profil chauffeur trouvé.");
          await supabase.auth.signOut();
          setIsLoginMode(false);
        }
      }
    } catch (error: any) {
      if (error.message?.includes("Invalid login credentials")) {
        toast.error("Email ou mot de passe incorrect");
      } else {
        toast.error(error.message || "Erreur de connexion");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }
    if (password.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }
    setLoading(true);
    try {
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: `${window.location.origin}/driver-welcome`,
        },
      });
      if (signUpError) throw signUpError;
      if (!authData.user) throw new Error("Échec de création du compte");

      const newUserId = authData.user.id;

      if (!authData.session) {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) console.error("Auto sign-in failed:", signInError);
      }

      await supabase.from("profiles").update({ phone }).eq("id", newUserId);

      const { data: driverData, error: driverError } = await supabase
        .from("drivers")
        .insert({
          user_id: newUserId,
          status: "on_hold",
          subscription_status: "inactive",
          subscription_paid: false,
          trial_status: "pending",
          documents_status: "pending",
          registration_step: 1,
          license_number: "",
          vehicle_brand: "",
          vehicle_model: "",
          vehicle_year: new Date().getFullYear(),
          vehicle_color: "",
        })
        .select()
        .single();
      if (driverError) throw driverError;

      // Driver role is now auto-assigned via database trigger

      try {
        await supabase.functions.invoke("send-email", {
          body: { driver_id: driverData.id, type: "driver_welcome_new" },
        });
      } catch (emailError) {
        console.error("Welcome email error:", emailError);
      }

      toast.success("🎉 Compte créé ! Bienvenue sur SoloCab.");
      await new Promise(resolve => setTimeout(resolve, 500));
      navigate("/driver-welcome", { replace: true });
    } catch (error: any) {
      let errorMessage = error.message || "Erreur lors de la création du compte";
      if (error.message?.includes("User already registered")) {
        errorMessage = "Cet email est déjà utilisé. Connectez-vous.";
        setIsLoginMode(true);
        setLoginEmail(email);
      }
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (initializing) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const benefits = [
    { icon: Users, text: "Construisez votre propre clientèle" },
    { icon: Target, text: "Fixez vos prix en toute liberté" },
    { icon: CreditCard, text: "Gardez 100% de vos revenus" },
    { icon: Sparkles, text: "Coach IA pour optimiser votre activité" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-accent/10" />
        <div className="relative z-10 px-4 pt-8 pb-6 text-center max-w-lg mx-auto">
          <motion.img 
            src={logo} 
            alt="SoloCab" 
            className="w-16 h-16 mx-auto mb-4 object-contain"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4 }}
          />
          <motion.h1 
            className="text-2xl sm:text-3xl font-bold text-foreground mb-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            Devenez indépendant
          </motion.h1>
          <motion.p 
            className="text-sm text-muted-foreground mb-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            L'outil des chauffeurs VTC qui reprennent le contrôle
          </motion.p>
          
          {/* Trial Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
          >
            <Badge className="bg-success/20 text-success border-success/30 px-4 py-1.5 text-sm font-semibold">
              <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
              Inscription gratuite • Sans carte bancaire
            </Badge>
          </motion.div>
        </div>
      </div>

      <div className="px-4 pb-8 max-w-lg mx-auto space-y-5">
        {/* Benefits - Compact */}
        <motion.div 
          className="grid grid-cols-2 gap-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          {benefits.map((b, i) => {
            const Icon = b.icon;
            return (
              <div key={i} className="flex items-center gap-2 p-2.5 rounded-lg bg-card border border-border">
                <Icon className="w-4 h-4 text-primary flex-shrink-0" />
                <span className="text-xs text-foreground leading-tight">{b.text}</span>
              </div>
            );
          })}
        </motion.div>

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          {isLoginMode ? (
            <Card className="p-5 border-border">
              <h2 className="text-lg font-bold text-foreground mb-4">Connexion</h2>
              <form onSubmit={handleLogin} className="space-y-3">
                <div>
                  <Label htmlFor="loginEmail" className="text-xs text-muted-foreground">Email</Label>
                  <Input id="loginEmail" type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required placeholder="votre@email.com" className="h-11 bg-input border-border" />
                </div>
                <div>
                  <Label htmlFor="loginPassword" className="text-xs text-muted-foreground">Mot de passe</Label>
                  <div className="relative">
                    <Input id="loginPassword" type={showPassword ? "text" : "password"} value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required placeholder="Votre mot de passe" className="h-11 pr-10 bg-input border-border" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" disabled={loading} className="w-full h-11">
                  {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Se connecter
                </Button>
                <Button type="button" variant="ghost" onClick={() => setIsLoginMode(false)} className="w-full text-sm text-muted-foreground">
                  ← Créer un nouveau compte
                </Button>
              </form>
            </Card>
          ) : (
            <Card className="p-5 border-border">
              <h2 className="text-lg font-bold text-foreground mb-1">Créez votre compte</h2>
              <p className="text-xs text-muted-foreground mb-4">Accès gratuit – toutes les fonctionnalités de base – aucun paiement requis</p>
              
              {/* Google OAuth signup */}
              <Button
                variant="outline"
                className="w-full h-11 gap-3 mb-3"
                onClick={async () => {
                  try {
                    localStorage.setItem("solocab_oauth_signup_type", "driver");
                    const { lovable } = await import("@/integrations/lovable/index");
                    const result = await lovable.auth.signInWithOAuth("google", {
                      redirect_uri: window.location.origin + "/oauth-onboarding",
                    });
                    if (result.error) toast.error(result.error.message);
                  } catch (e: any) {
                    toast.error(e.message);
                  }
                }}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                S'inscrire avec Google
              </Button>

              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
                <div className="relative flex justify-center text-xs"><span className="bg-card px-2 text-muted-foreground">ou par email</span></div>
              </div>

              <form onSubmit={handleRegister} className="space-y-3">
                <div>
                  <Label htmlFor="fullName" className="text-xs text-muted-foreground">Nom complet</Label>
                  <Input id="fullName" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required placeholder="Jean Dupont" className="h-11 bg-input border-border" autoComplete="name" />
                </div>
                <div>
                  <Label htmlFor="email" className="text-xs text-muted-foreground">Email</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="votre@email.com" className="h-11 bg-input border-border" autoComplete="email" />
                </div>
                <div>
                  <Label htmlFor="phone" className="text-xs text-muted-foreground">Téléphone</Label>
                  <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required placeholder="06 12 34 56 78" className="h-11 bg-input border-border" autoComplete="tel" />
                </div>
                <div>
                  <Label htmlFor="password" className="text-xs text-muted-foreground">Mot de passe</Label>
                  <div className="relative">
                    <Input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} placeholder="Minimum 6 caractères" className="h-11 pr-10 bg-input border-border" autoComplete="new-password" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <Label htmlFor="confirmPassword" className="text-xs text-muted-foreground">Confirmer le mot de passe</Label>
                  <div className="relative">
                    <Input id="confirmPassword" type={showConfirmPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={6} placeholder="Confirmez votre mot de passe" className="h-11 pr-10 bg-input border-border" autoComplete="new-password" />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <Button type="submit" disabled={loading} className="w-full h-12 bg-success hover:bg-success/90 text-success-foreground font-semibold text-sm">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Rocket className="w-4 h-4 mr-2" />}
                  Créer mon compte gratuit
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                
                <p className="text-[10px] text-center text-muted-foreground">
                  En vous inscrivant, vous acceptez nos{" "}
                  <a href="/terms-of-service" className="underline hover:text-foreground">conditions d'utilisation</a>
                </p>

                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
                  <div className="relative flex justify-center text-xs"><span className="bg-card px-2 text-muted-foreground">Déjà inscrit ?</span></div>
                </div>

                <Button type="button" variant="outline" onClick={() => setIsLoginMode(true)} className="w-full border-border text-muted-foreground">
                  Se connecter
                </Button>
              </form>
            </Card>
          )}
        </motion.div>

        {/* Trust Signals */}
        <div className="flex justify-center gap-6 text-center">
          <div className="flex flex-col items-center gap-1">
            <Shield className="w-5 h-5 text-primary" />
            <span className="text-[10px] text-muted-foreground">Données sécurisées</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <CheckCircle className="w-5 h-5 text-success" />
            <span className="text-[10px] text-muted-foreground">Sans engagement</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <CheckCircle className="w-5 h-5 text-success" />
            <span className="text-[10px] text-muted-foreground">Gratuit</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterDriverPromoFree;
