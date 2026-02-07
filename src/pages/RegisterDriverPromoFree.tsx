import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, CheckCircle, Sparkles, Car, Crown, Shield, TrendingUp, Eye, EyeOff, RefreshCw, Bot, Trophy, MessageSquare, Target, Gift, Clock, Zap, ArrowRight } from "lucide-react";
import logo from "@/assets/logo-solocab.png";

const TRIAL_DAYS = 14;

const RegisterDriverPromoFree = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Login mode for returning users
  const [isLoginMode, setIsLoginMode] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Form fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  const [userId, setUserId] = useState<string | null>(null);

  // Check if user is already logged in
  useEffect(() => {
    const checkExistingSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          console.log("[RegisterDriverPromoFree] User already logged in:", session.user.email);
          
          // Check if driver profile exists
          const { data: existingDriver } = await supabase
            .from("drivers")
            .select("id, subscription_status, subscription_paid, trial_status")
            .eq("user_id", session.user.id)
            .maybeSingle();
          
          if (existingDriver) {
            // Redirect based on status
            if (existingDriver.subscription_paid || existingDriver.trial_status === 'active') {
              toast.info("Vous avez déjà un compte actif");
              navigate("/driver-dashboard");
              return;
            }
            // Already registered, redirect to dashboard for trial activation
            navigate("/driver-dashboard");
            return;
          }
        }
      } catch (error) {
        console.error("[RegisterDriverPromoFree] Session check error:", error);
      } finally {
        setInitializing(false);
      }
    };

    checkExistingSession();
  }, [navigate]);

  // Handle login for returning users
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
        // Check driver profile
        const { data: driverData } = await supabase
          .from("drivers")
          .select("id, subscription_status, trial_status")
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
      console.error("Login error:", error);
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
      // Create auth user
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
          emailRedirectTo: `${window.location.origin}/driver-dashboard`,
        },
      });

      if (signUpError) throw signUpError;
      if (!authData.user) throw new Error("Échec de création du compte");

      const newUserId = authData.user.id;
      setUserId(newUserId);

      // Update profile with phone
      await supabase
        .from("profiles")
        .update({ phone })
        .eq("id", newUserId);

      // Create driver profile - NO trial yet, just access to submit documents
      // Trial starts only after admin validates documents
      const { data: driverData, error: driverError } = await supabase
        .from("drivers")
        .insert({
          user_id: newUserId,
          status: "on_hold", // Awaiting document submission
          subscription_status: "inactive", // Will become 'trialing' after admin validation
          subscription_paid: false,
          trial_status: "pending", // Will become 'active' after admin validation
          documents_status: "pending", // Documents need to be submitted
          registration_step: 1,
          license_number: "À_COMPLÉTER",
          vehicle_brand: "À compléter",
          vehicle_model: "À compléter",
          vehicle_year: new Date().getFullYear(),
          vehicle_color: "À compléter",
        })
        .select()
        .single();

      if (driverError) throw driverError;

      // Add driver role
      await supabase
        .from("user_roles")
        .insert({
          user_id: newUserId,
          role: "driver",
        });

      // Send welcome email (NOT activating trial yet)
      try {
        await supabase.functions.invoke("send-driver-welcome-new", {
          body: { driver_id: driverData.id },
        });
      } catch (emailError) {
        console.error("Welcome email error:", emailError);
        // Don't block registration if email fails
      }

      toast.success("Compte créé ! Soumettez vos documents pour activer votre essai gratuit de 14 jours 🎉");
      
      // Redirect to dashboard
      navigate("/driver-dashboard");
    } catch (error: any) {
      console.error("Erreur inscription:", error);
      let errorMessage = error.message || "Erreur lors de la création du compte";
      if (error.message?.includes("User already registered")) {
        errorMessage = "Cet email est déjà utilisé. Connectez-vous pour accéder à votre compte.";
        setIsLoginMode(true);
        setLoginEmail(email);
      } else if (error.message?.includes("Invalid email")) {
        errorMessage = "Email invalide";
      } else if (error.message?.includes("Password")) {
        errorMessage = "Le mot de passe doit contenir au moins 6 caractères";
      }
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (initializing) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-premium" />
          <p className="text-sm text-muted-foreground mt-2">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-6 px-3 sm:px-4 overflow-x-hidden">
      <div className="w-full max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <img src={logo} alt="SoloCab" className="w-14 h-14 mx-auto mb-3 object-contain" />
          <h1 className="text-2xl font-bold mb-1">Inscription Chauffeur VTC</h1>
          <p className="text-sm text-muted-foreground">Rejoignez SoloCab gratuitement</p>
        </div>

        {/* Trial Banner - IMPORTANT */}
        <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-green-500/10 via-emerald-500/10 to-teal-500/10 border-2 border-green-500/30 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-green-500/20 to-transparent rounded-full blur-xl" />
          
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                <Gift className="w-5 h-5 text-white" />
              </div>
              <div>
                <Badge className="bg-green-500 text-white border-0 text-sm px-3">
                  🎉 14 JOURS GRATUITS
                </Badge>
              </div>
            </div>
            
            <h3 className="font-bold text-lg mb-2">Essai gratuit complet</h3>
            
            <ul className="space-y-1.5 text-sm">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span><strong>Aucune carte bancaire</strong> demandée</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span><strong>Accès complet</strong> à toutes les fonctionnalités</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span><strong>Sans engagement</strong> - Annulez à tout moment</span>
              </li>
            </ul>

            <div className="mt-3 pt-3 border-t border-green-500/20">
              <p className="text-xs text-muted-foreground">
                À l'issue des 14 jours, un abonnement à <strong>29,99€/mois</strong> sera nécessaire pour continuer à utiliser SoloCab.
              </p>
            </div>
          </div>
        </div>

        {/* AI Coaching Banner */}
        <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-purple-500/10 via-pink-500/5 to-orange-500/10 border border-purple-500/20">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 text-xs">
              🤖 Coach IA Inclus
            </Badge>
          </div>
          
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Trophy className="w-3 h-3 text-amber-500" />
              <span>Suivi de progression</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Target className="w-3 h-3 text-blue-500" />
              <span>Objectifs personnalisés</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <TrendingUp className="w-3 h-3 text-green-500" />
              <span>Conseils stratégiques</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <MessageSquare className="w-3 h-3 text-purple-500" />
              <span>Accompagnement quotidien</span>
            </div>
          </div>
        </div>

        {/* Login mode for returning users */}
        {isLoginMode ? (
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-premium" />
              Connexion
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Vous avez déjà un compte ? Connectez-vous.
            </p>
            
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="loginEmail" className="text-sm">Email</Label>
                <Input
                  id="loginEmail"
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                  placeholder="votre@email.com"
                  className="h-11"
                />
              </div>
              
              <div>
                <Label htmlFor="loginPassword" className="text-sm">Mot de passe</Label>
                <div className="relative">
                  <Input
                    id="loginPassword"
                    type={showPassword ? "text" : "password"}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                    placeholder="Votre mot de passe"
                    className="h-11 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" disabled={loading} className="w-full h-11 bg-gradient-premium">
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Se connecter
              </Button>
              
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsLoginMode(false)}
                className="w-full"
              >
                ← Créer un nouveau compte
              </Button>
            </form>
          </Card>
        ) : (
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-premium" />
              Créez votre compte gratuit
            </h2>
            
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <Label htmlFor="fullName" className="text-sm">Nom complet *</Label>
                <Input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  placeholder="Jean Dupont"
                  className="h-11"
                  autoComplete="name"
                />
              </div>

              <div>
                <Label htmlFor="email" className="text-sm">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="votre@email.com"
                  className="h-11"
                  autoComplete="email"
                />
              </div>

              <div>
                <Label htmlFor="phone" className="text-sm">Téléphone *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  placeholder="06 12 34 56 78"
                  className="h-11"
                  autoComplete="tel"
                />
              </div>

              <div>
                <Label htmlFor="password" className="text-sm">Mot de passe *</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="Minimum 6 caractères"
                    className="h-11 pr-10"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <Label htmlFor="confirmPassword" className="text-sm">Confirmer le mot de passe *</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="Confirmez votre mot de passe"
                    className="h-11 pr-10"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 sm:h-14 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white text-sm sm:text-base font-semibold flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin flex-shrink-0" /> : <Gift className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />}
                <span className="truncate">Essayer 14 jours gratuits</span>
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
              </Button>
              
              <p className="text-xs text-center text-muted-foreground">
                En vous inscrivant, vous acceptez nos{" "}
                <a href="/terms" className="underline hover:text-foreground">conditions d'utilisation</a>
              </p>

              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Déjà inscrit ?</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={() => setIsLoginMode(true)}
                className="w-full"
              >
                Se connecter
              </Button>
            </form>
          </Card>
        )}

        {/* Benefits footer */}
        <div className="mt-6 grid grid-cols-3 gap-2">
          <Card className="p-3 text-center">
            <Shield className="w-6 h-6 text-premium mx-auto mb-1" />
            <p className="font-medium text-xs">100% Sécurisé</p>
          </Card>
          <Card className="p-3 text-center">
            <Clock className="w-6 h-6 text-green-500 mx-auto mb-1" />
            <p className="font-medium text-xs">14 jours gratuits</p>
          </Card>
          <Card className="p-3 text-center">
            <CheckCircle className="w-6 h-6 text-success mx-auto mb-1" />
            <p className="font-medium text-xs">Sans engagement</p>
          </Card>
        </div>

        {/* What's included */}
        <Card className="mt-6 p-4">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-premium" />
            Ce que vous obtenez gratuitement
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span>Votre profil chauffeur professionnel</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span>QR Code personnalisé pour vos clients</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span>Gestion des courses et réservations</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span>Devis et factures automatiques</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span>Coach IA pour optimiser votre activité</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span>Support client par email</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default RegisterDriverPromoFree;
