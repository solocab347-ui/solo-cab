import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { checkEmailExists, buildExistingAccountMessage } from "@/lib/checkEmailExists";
import { 
  Loader2, CheckCircle, Shield, Eye, EyeOff, 
  ArrowRight, ArrowLeft, Rocket, Users, Target, CreditCard,
  Sparkles, User, Mail, Phone, Lock, ChevronRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import logo from "@/assets/logo-solocab.png";

// Step-by-step wizard registration

type Step = "welcome" | "name" | "email" | "phone" | "password" | "confirm_password" | "creating" | "check_email";

const STEP_ORDER: Step[] = ["welcome", "name", "email", "phone", "password", "confirm_password"];

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? "100%" : "-100%",
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? "-100%" : "100%",
    opacity: 0,
  }),
};

const RegisterDriverPromoFree = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Wizard state
  const [currentStep, setCurrentStep] = useState<Step>("welcome");
  const [direction, setDirection] = useState(1);

  // Form data
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Validation
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const checkExistingSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: existingDriver } = await supabase
            .from("drivers")
            .select("id")
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

  const currentStepIndex = STEP_ORDER.indexOf(currentStep);
  const progress = currentStep === "creating" ? 100 : ((currentStepIndex) / (STEP_ORDER.length - 1)) * 100;

  const goToStep = useCallback((step: Step) => {
    const newIndex = STEP_ORDER.indexOf(step);
    const oldIndex = STEP_ORDER.indexOf(currentStep);
    setDirection(newIndex > oldIndex ? 1 : -1);
    setErrors({});
    setCurrentStep(step);
  }, [currentStep]);

  const goNext = useCallback(() => {
    const idx = STEP_ORDER.indexOf(currentStep);
    if (idx < STEP_ORDER.length - 1) {
      setDirection(1);
      setErrors({});
      setCurrentStep(STEP_ORDER[idx + 1]);
    }
  }, [currentStep]);

  const goBack = useCallback(() => {
    const idx = STEP_ORDER.indexOf(currentStep);
    if (idx > 0) {
      setDirection(-1);
      setErrors({});
      setCurrentStep(STEP_ORDER[idx - 1]);
    }
  }, [currentStep]);

  const validateAndNext = useCallback(() => {
    const newErrors: Record<string, string> = {};

    switch (currentStep) {
      case "name":
        if (!fullName.trim()) newErrors.fullName = "Entrez votre nom complet";
        else if (fullName.trim().length < 2) newErrors.fullName = "Nom trop court";
        else if (fullName.trim().length > 100) newErrors.fullName = "Nom trop long";
        break;
      case "email":
        if (!email.trim()) newErrors.email = "Entrez votre email";
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) newErrors.email = "Email invalide";
        break;
      case "phone":
        if (!phone.trim()) newErrors.phone = "Entrez votre numéro";
        else if (phone.replace(/\s/g, '').length < 8) newErrors.phone = "Numéro trop court";
        break;
      case "password":
        if (!password) newErrors.password = "Choisissez un mot de passe";
        else if (password.length < 6) newErrors.password = "Minimum 6 caractères";
        break;
      case "confirm_password":
        if (!confirmPassword) newErrors.confirmPassword = "Confirmez votre mot de passe";
        else if (confirmPassword !== password) newErrors.confirmPassword = "Les mots de passe ne correspondent pas";
        break;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    if (currentStep === "confirm_password") {
      handleRegister();
    } else {
      goNext();
    }
  }, [currentStep, fullName, email, phone, password, confirmPassword, goNext]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (currentStep !== "welcome") {
        validateAndNext();
      } else {
        goNext();
      }
    }
  }, [currentStep, validateAndNext, goNext]);

  const handleRegister = async () => {
    setDirection(1);
    setCurrentStep("creating");
    setLoading(true);
    
    try {
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { full_name: fullName.trim() },
          emailRedirectTo: `https://solocab.fr/driver-welcome`,
        },
      });
      if (signUpError) throw signUpError;
      if (!authData.user) throw new Error("Échec de création du compte");

      const newUserId = authData.user.id;

      // Try auto sign-in
      if (!authData.session) {
        try {
          await supabase.auth.signInWithPassword({ email: email.trim(), password });
        } catch {
          console.warn("Auto sign-in skipped (email confirmation required)");
        }
      }

      // Update phone
      try {
        await supabase.from("profiles").update({ phone: phone.trim() }).eq("id", newUserId);
      } catch {
        console.warn("Profile phone update deferred");
      }

      // Create driver profile via SECURITY DEFINER function
      const { data: driverIdResult, error: driverError } = await supabase
        .rpc("create_driver_profile", {
          p_user_id: newUserId,
          p_status: "on_hold",
          p_license_number: "",
          p_vehicle_brand: "",
          p_vehicle_model: "",
          p_vehicle_year: new Date().getFullYear(),
          p_vehicle_color: "",
        });
      if (driverError) throw driverError;

      // Welcome email will be sent after email validation on DriverWelcome page

      toast.success("🎉 Compte créé ! Bienvenue sur SoloCab.");
      setCurrentStep("check_email");
    } catch (error: any) {
      let errorMessage = error.message || "Erreur lors de la création du compte";
      if (error.message?.includes("User already registered")) {
        errorMessage = "Cet email est déjà utilisé. Connectez-vous.";
        setIsLoginMode(true);
        setLoginEmail(email);
      }
      toast.error(errorMessage);
      setCurrentStep("confirm_password");
    } finally {
      setLoading(false);
    }
  };

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

  if (initializing) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Login mode
  if (isLoginMode) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="flex items-center gap-3 px-4 py-4">
          <button onClick={() => setIsLoginMode(false)} className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium text-muted-foreground">Retour à l'inscription</span>
        </div>
        
        <div className="flex-1 flex flex-col justify-center px-6 pb-12 max-w-md mx-auto w-full">
          <img src={logo} alt="SoloCab" className="w-12 h-12 mx-auto mb-6 object-contain" />
          <h1 className="text-2xl font-bold text-center mb-1">Connexion</h1>
          <p className="text-sm text-muted-foreground text-center mb-8">Accédez à votre espace chauffeur</p>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label htmlFor="loginEmail" className="text-xs text-muted-foreground mb-1.5 block">Email</Label>
              <Input 
                id="loginEmail" 
                type="email" 
                value={loginEmail} 
                onChange={(e) => setLoginEmail(e.target.value)} 
                required 
                placeholder="votre@email.com" 
                className="h-12 bg-input" 
                autoFocus
              />
            </div>
            <div>
              <Label htmlFor="loginPassword" className="text-xs text-muted-foreground mb-1.5 block">Mot de passe</Label>
              <div className="relative">
                <Input 
                  id="loginPassword" 
                  type={showLoginPassword ? "text" : "password"} 
                  value={loginPassword} 
                  onChange={(e) => setLoginPassword(e.target.value)} 
                  required 
                  placeholder="Votre mot de passe" 
                  className="h-12 pr-10 bg-input" 
                />
                <button type="button" onClick={() => setShowLoginPassword(!showLoginPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" disabled={loading} className="w-full h-12">
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Se connecter
            </Button>
          </form>
        </div>
      </div>
    );
  }

  // Step-by-step wizard
  return (
    <div className="min-h-screen bg-background flex flex-col" onKeyDown={handleKeyDown}>
      {/* Header with progress */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between mb-3">
          {currentStep !== "welcome" && currentStep !== "creating" ? (
            <button onClick={goBack} className="w-9 h-9 rounded-full bg-muted flex items-center justify-center transition-colors hover:bg-muted/80">
              <ArrowLeft className="w-4 h-4" />
            </button>
          ) : (
            <div className="w-9" />
          )}
          <img src={logo} alt="SoloCab" className="w-8 h-8 object-contain" />
          {currentStep !== "welcome" ? (
            <span className="text-xs text-muted-foreground w-9 text-right">
              {currentStepIndex}/{STEP_ORDER.length - 1}
            </span>
          ) : (
            <div className="w-9" />
          )}
        </div>

        {/* Progress bar */}
        {currentStep !== "welcome" && (
          <div className="h-1 bg-muted rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-primary rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        )}
      </div>

      {/* Step Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentStep}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="flex-1 flex flex-col px-6 max-w-md mx-auto w-full"
          >
            {currentStep === "welcome" && (
              <WelcomeStep onStart={goNext} onLogin={() => setIsLoginMode(true)} />
            )}
            {currentStep === "name" && (
              <FieldStep
                icon={User}
                title="Comment vous appelez-vous ?"
                subtitle="Votre nom complet tel qu'il apparaît sur vos documents"
                value={fullName}
                onChange={setFullName}
                placeholder="Jean Dupont"
                error={errors.fullName}
                onNext={validateAndNext}
                autoComplete="name"
                autoFocus
              />
            )}
            {currentStep === "email" && (
              <FieldStep
                icon={Mail}
                title="Votre adresse email"
                subtitle="Nous vous enverrons un lien de confirmation"
                value={email}
                onChange={setEmail}
                placeholder="votre@email.com"
                type="email"
                error={errors.email}
                onNext={validateAndNext}
                autoComplete="email"
                autoFocus
              />
            )}
            {currentStep === "phone" && (
              <FieldStep
                icon={Phone}
                title="Votre numéro de téléphone"
                subtitle="Pour que vos clients puissent vous contacter"
                value={phone}
                onChange={setPhone}
                placeholder="06 12 34 56 78"
                type="tel"
                error={errors.phone}
                onNext={validateAndNext}
                autoComplete="tel"
                autoFocus
              />
            )}
            {currentStep === "password" && (
              <PasswordStep
                value={password}
                onChange={setPassword}
                showPassword={showPassword}
                onToggleShow={() => setShowPassword(!showPassword)}
                error={errors.password}
                onNext={validateAndNext}
                loading={loading}
              />
            )}
            {currentStep === "confirm_password" && (
              <ConfirmPasswordStep
                value={confirmPassword}
                onChange={setConfirmPassword}
                showPassword={showPassword}
                onToggleShow={() => setShowPassword(!showPassword)}
                error={errors.confirmPassword}
                onNext={validateAndNext}
                loading={loading}
              />
            )}
            {currentStep === "creating" && (
              <CreatingStep />
            )}
            {currentStep === "check_email" && (
              <CheckEmailStep email={email} onLogin={() => setIsLoginMode(true)} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer - Terms */}
      {(currentStep === "password" || currentStep === "confirm_password") && (
        <div className="px-6 pb-4 pt-2 text-center">
          <p className="text-[10px] text-muted-foreground">
            En créant un compte, vous acceptez nos{" "}
            <a href="/terms-of-service" className="underline hover:text-foreground">conditions d'utilisation</a>
          </p>
        </div>
      )}
    </div>
  );
};

// Welcome Step
function WelcomeStep({ onStart, onLogin }: { onStart: () => void; onLogin: () => void }) {
  const benefits = [
    { icon: Users, text: "Construisez votre propre clientèle" },
    { icon: Target, text: "Fixez vos prix en toute liberté" },
    { icon: CreditCard, text: "Gardez 100% de vos revenus" },
    { icon: Sparkles, text: "Coach IA pour votre activité" },
  ];

  return (
    <div className="flex-1 flex flex-col justify-center pb-8">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="text-center mb-8"
      >
        <img src={logo} alt="SoloCab" className="w-20 h-20 mx-auto mb-5 object-contain" />
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Devenez indépendant
        </h1>
        <p className="text-sm text-muted-foreground mb-4">
          L'outil des chauffeurs VTC qui reprennent le contrôle
        </p>
        <Badge className="bg-success/15 text-success border-success/30 px-3 py-1 text-xs font-semibold">
          <CheckCircle className="w-3 h-3 mr-1.5" />
          Inscription 100% gratuite
        </Badge>
      </motion.div>

      <motion.div 
        className="grid grid-cols-2 gap-2.5 mb-8"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {benefits.map((b, i) => {
          const Icon = b.icon;
          return (
            <div key={i} className="flex items-center gap-2.5 p-3 rounded-xl bg-card border border-border/60">
              <Icon className="w-4 h-4 text-primary flex-shrink-0" />
              <span className="text-xs text-foreground leading-tight">{b.text}</span>
            </div>
          );
        })}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="space-y-3"
      >
        <Button 
          onClick={onStart} 
          className="w-full h-13 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base gap-2"
          size="lg"
        >
          <Rocket className="w-5 h-5" />
          Commencer l'inscription
          <ArrowRight className="w-4 h-4" />
        </Button>
        
        <button 
          onClick={onLogin}
          className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
        >
          Déjà inscrit ? <span className="font-medium text-primary">Se connecter</span>
        </button>
      </motion.div>

      {/* Trust signals */}
      <div className="flex justify-center gap-8 mt-8">
        <div className="flex flex-col items-center gap-1">
          <Shield className="w-4 h-4 text-muted-foreground" />
          <span className="text-[9px] text-muted-foreground">Sécurisé</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <CheckCircle className="w-4 h-4 text-muted-foreground" />
          <span className="text-[9px] text-muted-foreground">100% gratuit</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <Rocket className="w-4 h-4 text-muted-foreground" />
          <span className="text-[9px] text-muted-foreground">Toutes fonctionnalités</span>
        </div>
      </div>
    </div>
  );
}

// Generic Field Step
interface FieldStepProps {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  type?: string;
  error?: string;
  onNext: () => void;
  autoComplete?: string;
  autoFocus?: boolean;
}

function FieldStep({ icon: Icon, title, subtitle, value, onChange, placeholder, type = "text", error, onNext, autoComplete, autoFocus }: FieldStepProps) {
  return (
    <div className="flex-1 flex flex-col justify-center pb-16">
      <div className="mb-8">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
          <Icon className="w-7 h-7 text-primary" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-1">{title}</h2>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>

      <div className="space-y-3 mb-6">
        <Input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`h-14 text-lg bg-input border-border rounded-xl px-4 ${error ? 'border-destructive ring-1 ring-destructive/30' : ''}`}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onNext(); }}}
        />
        {error && (
          <motion.p 
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs text-destructive pl-1"
          >
            {error}
          </motion.p>
        )}
      </div>

      <Button 
        onClick={onNext}
        className="w-full h-12 text-base font-semibold gap-2"
        disabled={!value.trim()}
      >
        Continuer
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );
}

// Password Step
interface PasswordStepProps {
  value: string;
  onChange: (v: string) => void;
  showPassword: boolean;
  onToggleShow: () => void;
  error?: string;
  onNext: () => void;
  loading: boolean;
}

function PasswordStep({ value, onChange, showPassword, onToggleShow, error, onNext, loading }: PasswordStepProps) {
  const strength = value.length >= 8 ? (value.length >= 12 ? "Fort" : "Moyen") : value.length >= 6 ? "Faible" : "";
  const strengthColor = strength === "Fort" ? "text-success" : strength === "Moyen" ? "text-secondary" : "text-destructive";

  return (
    <div className="flex-1 flex flex-col justify-center pb-16">
      <div className="mb-8">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
          <Lock className="w-7 h-7 text-primary" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-1">Créez votre mot de passe</h2>
        <p className="text-sm text-muted-foreground">Minimum 6 caractères pour sécuriser votre compte</p>
      </div>

      <div className="space-y-3 mb-6">
        <div className="relative">
          <Input
            type={showPassword ? "text" : "password"}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Votre mot de passe"
            className={`h-14 text-lg bg-input border-border rounded-xl px-4 pr-12 ${error ? 'border-destructive ring-1 ring-destructive/30' : ''}`}
            autoComplete="new-password"
            autoFocus
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onNext(); }}}
          />
          <button 
            type="button" 
            onClick={onToggleShow} 
            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
        
        {value && (
          <div className="flex items-center justify-between px-1">
            <div className="flex gap-1">
              {[1, 2, 3].map(i => (
                <div 
                  key={i}
                  className={`h-1 w-8 rounded-full transition-colors ${
                    i === 1 ? (value.length >= 6 ? 'bg-destructive' : 'bg-muted') :
                    i === 2 ? (value.length >= 8 ? 'bg-secondary' : 'bg-muted') :
                    (value.length >= 12 ? 'bg-success' : 'bg-muted')
                  }`}
                />
              ))}
            </div>
            {strength && <span className={`text-[10px] font-medium ${strengthColor}`}>{strength}</span>}
          </div>
        )}

        {error && (
          <motion.p 
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs text-destructive pl-1"
          >
            {error}
          </motion.p>
        )}
      </div>

      <Button 
        onClick={onNext}
        disabled={!value || loading}
        className="w-full h-12 text-base font-semibold gap-2"
      >
        Continuer
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );
}

// Creating Step (loading animation)
function CreatingStep() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center pb-16">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="text-center"
      >
        <div className="relative w-20 h-20 mx-auto mb-6">
          <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
          <div className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <div className="absolute inset-3 rounded-full bg-primary/10 flex items-center justify-center">
            <Rocket className="w-7 h-7 text-primary" />
          </div>
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">Création en cours...</h2>
        <p className="text-sm text-muted-foreground">Nous préparons votre espace chauffeur</p>
      </motion.div>
    </div>
  );
}

// Confirm Password Step
function ConfirmPasswordStep({ value, onChange, showPassword, onToggleShow, error, onNext, loading }: PasswordStepProps) {
  return (
    <div className="flex-1 flex flex-col justify-center pb-16">
      <div className="mb-8">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
          <Shield className="w-7 h-7 text-primary" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-1">Confirmez votre mot de passe</h2>
        <p className="text-sm text-muted-foreground">Saisissez-le à nouveau pour éviter les erreurs</p>
      </div>

      <div className="space-y-3 mb-6">
        <div className="relative">
          <Input
            type={showPassword ? "text" : "password"}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Confirmez votre mot de passe"
            className={`h-14 text-lg bg-input border-border rounded-xl px-4 pr-12 ${error ? 'border-destructive ring-1 ring-destructive/30' : ''}`}
            autoComplete="new-password"
            autoFocus
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onNext(); }}}
          />
          <button 
            type="button" 
            onClick={onToggleShow} 
            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>

        {error && (
          <motion.p 
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs text-destructive pl-1"
          >
            {error}
          </motion.p>
        )}
      </div>

      <Button 
        onClick={onNext}
        disabled={!value || loading}
        className="w-full h-12 text-base font-semibold gap-2 bg-success hover:bg-success/90 text-success-foreground"
      >
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <>
            <Rocket className="w-5 h-5" />
            Créer mon compte
          </>
        )}
      </Button>
    </div>
  );
}

// Check Email Step
function CheckEmailStep({ email, onLogin }: { email: string; onLogin: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center pb-16">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="text-center max-w-sm"
      >
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-success/15 flex items-center justify-center">
          <Mail className="w-10 h-10 text-success" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-3">Vérifiez votre boîte mail</h2>
        <p className="text-sm text-muted-foreground mb-2">
          Un email de confirmation a été envoyé à :
        </p>
        <p className="text-sm font-semibold text-primary mb-6">{email}</p>
        <div className="bg-card border border-border rounded-xl p-4 mb-6 text-left">
          <p className="text-xs text-muted-foreground leading-relaxed">
            📩 Cliquez sur le bouton <strong>"Valider mon adresse email"</strong> dans l'email que vous avez reçu de SoloCab pour activer votre compte.
          </p>
          <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
            💡 Pensez à vérifier vos spams si vous ne le trouvez pas.
          </p>
        </div>
        <button 
          onClick={onLogin}
          className="text-sm text-primary hover:text-primary/80 font-medium transition-colors"
        >
          J'ai validé mon email → Se connecter
        </button>
      </motion.div>
    </div>
  );
}

export default RegisterDriverPromoFree;
