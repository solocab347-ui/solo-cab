import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, CheckCircle, Sparkles, Car, Crown, Shield, TrendingUp, Eye, EyeOff, FileText, Package, MapPin, CreditCard, Percent, CalendarDays, AlertTriangle, RefreshCw, Bot, Trophy, MessageSquare, Target, Trees, Truck, ArrowRight, Smartphone, QrCode, Star, X } from "lucide-react";
import logo from "@/assets/logo-solocab.png";
import { PaymentRedirectOverlay } from "@/components/PaymentRedirectOverlay";
import nfcPlateLarge from "@/assets/nfc-plate-large-clean.png";
import nfcPlateSmall from "@/assets/nfc-plate-small-clean.png";
import { notifyRegistrationError } from "@/utils/notifyRegistrationError";

// Prix des plaques NFC - MODE PRODUCTION
const TEST_MODE_PRICING = false;
const PLATE_STANDARD_PRICE = 14.99; // Bois
const PLATE_PREMIUM_PRICE = 29.99; // Plastique
const PLATE_STANDARD_PROMO = 11.99; // Bois avec -20%
const PLATE_PREMIUM_PROMO = 23.99; // Plastique avec -20%

const SUBSCRIPTION_MONTHLY_PRICE = 29.99;
const SUBSCRIPTION_ANNUAL_PRICE = 305.90;
const ANNUAL_MONTHLY_EQUIVALENT = (SUBSCRIPTION_ANNUAL_PRICE / 12).toFixed(2);

const RegisterDriverPromo = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Check if coming from NFC plate page (skip step 2)
  const fromPlate = searchParams.get("with_plate") === "true";
  const preselectedPlate = searchParams.get("plate") as "standard" | "premium" | null;
  
  // Login mode for returning users
  const [isLoginMode, setIsLoginMode] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Étape 1 - Informations obligatoires
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  // Étape 2 - Choix plaque NFC (uniquement si venu de la page plaque)
  // Pour le parcours classique, on ne propose plus la plaque à l'inscription - elle sera proposée après paiement dans le tunnel
  const [wantsPlate, setWantsPlate] = useState(fromPlate);
  const [plateType, setPlateType] = useState<"standard" | "premium">(preselectedPlate || "premium");

  // Étape 3 - Choix abonnement et finalisation
  const [subscriptionType, setSubscriptionType] = useState<"monthly" | "annual">("monthly");
  const [shippingAddress, setShippingAddress] = useState("");
  const [shippingCity, setShippingCity] = useState("");
  const [shippingPostalCode, setShippingPostalCode] = useState("");

  const [userId, setUserId] = useState<string | null>(null);
  const [driverId, setDriverId] = useState<string | null>(null);
  
  // Payment failure tracking
  const [paymentFailed, setPaymentFailed] = useState(false);
  const [paymentFailedReason, setPaymentFailedReason] = useState<string | null>(null);
  
  // Payment redirect overlay - show immediately when user clicks pay
  const [showPaymentOverlay, setShowPaymentOverlay] = useState(false);

  // Determine total steps based on entry point
  // Parcours simplifié : 2 étapes pour tous (identité + paiement)
  // La plaque NFC sera proposée après le paiement dans le tunnel d'onboarding
  const totalSteps = 2;

  // Check URL params for payment failure
  useEffect(() => {
    const canceled = searchParams.get("canceled");
    const failed = searchParams.get("failed");
    
    if (canceled === "true" || failed === "true") {
      setPaymentFailed(true);
      setPaymentFailedReason("Paiement annulé ou échoué. Veuillez réessayer.");
    }
  }, [searchParams]);

  // Check if user is already logged in and has a driver profile
  useEffect(() => {
    const checkExistingSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          console.log("[RegisterDriverPromo] User already logged in:", session.user.email);
          setUserId(session.user.id);
          
          // Check if driver profile exists
          const { data: existingDriver } = await supabase
            .from("drivers")
            .select(`
              id, 
              subscription_status, 
              subscription_paid,
              registration_step,
              pending_subscription_type,
              pending_wants_plate,
              pending_plate_type,
              shipping_address,
              shipping_city,
              shipping_postal_code,
              payment_failed_at,
              payment_failed_reason
            `)
            .eq("user_id", session.user.id)
            .maybeSingle() as { data: any; error: any };
          
          if (existingDriver) {
            console.log("[RegisterDriverPromo] Driver profile found:", existingDriver);
            setDriverId(existingDriver.id);
            
            // If subscription already paid and active, OR trial active, redirect to dashboard
            if ((existingDriver.subscription_paid === true && 
                (existingDriver.subscription_status === "active" || existingDriver.subscription_status === "trialing")) ||
                existingDriver.trial_status === 'active') {
              toast.info("Vous avez déjà un compte actif");
              navigate("/driver-dashboard");
              return;
            }
            
            // NOUVEAU FLUX: Si compte créé mais pas encore finalisé, rediriger vers le tunnel
            toast.info("Reprenez votre inscription là où vous l'avez laissée");
            navigate("/driver-welcome");
            return;
          }
        }
      } catch (error) {
        console.error("[RegisterDriverPromo] Session check error:", error);
      } finally {
        setInitializing(false);
      }
    };

    checkExistingSession();
  }, [navigate, totalSteps]);

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
        setUserId(data.user.id);
        
        // Check driver profile
        const { data: driverData } = await supabase
          .from("drivers")
          .select(`
            id, 
            subscription_status, 
            subscription_paid,
            pending_subscription_type,
            pending_wants_plate,
            pending_plate_type,
            shipping_address,
            shipping_city,
            shipping_postal_code,
            payment_failed_at,
            payment_failed_reason
          `)
          .eq("user_id", data.user.id)
          .maybeSingle() as { data: any; error: any };

        if (driverData) {
          setDriverId(driverData.id);
          
          // Already has active subscription or active trial
          if ((driverData.subscription_paid && 
              (driverData.subscription_status === "active" || driverData.subscription_status === "trialing")) ||
              driverData.trial_status === 'active') {
            toast.success("Bienvenue ! Redirection vers votre tableau de bord...");
            navigate("/driver-dashboard");
            return;
          }
          
          // NOUVEAU FLUX: Rediriger vers le tunnel d'onboarding
          toast.success("Connexion réussie ! Continuez votre inscription.");
          navigate("/driver-welcome");
        } else {
          // User exists but no driver profile - shouldn't happen but handle it
          toast.error("Aucun profil chauffeur trouvé. Créez un nouveau compte.");
          await supabase.auth.signOut();
          setIsLoginMode(false);
        }
      }
    } catch (error: any) {
      console.error("Login error:", error);
      
      // Notifier l'admin en cas d'erreur de connexion (sauf identifiants incorrects)
      if (!error.message?.includes("Invalid login credentials")) {
        notifyRegistrationError({
          step: "Connexion utilisateur existant",
          email: loginEmail,
          errorMessage: error.message || "Erreur de connexion inconnue",
          errorCode: error.code,
        });
      }
      
      if (error.message?.includes("Invalid login credentials")) {
        toast.error("Email ou mot de passe incorrect");
      } else {
        toast.error(error.message || "Erreur de connexion");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStep1 = async (e: React.FormEvent) => {
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
          data: {
            full_name: fullName,
          },
          emailRedirectTo: `${window.location.origin}/registration-success`,
        },
      });

      if (signUpError) throw signUpError;
      if (!authData.user) throw new Error("Échec de création du compte");

      const newUserId = authData.user.id;
      setUserId(newUserId);

      // Update profile with phone
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ phone })
        .eq("id", newUserId);

      if (profileError) throw profileError;

      // Create driver profile - NO PAYMENT REQUIRED, trial starts after admin validation
      const driverInsertData: any = {
        user_id: newUserId,
        status: "pending", // En attente de validation documents
        subscription_status: "inactive",
        subscription_paid: false,
        trial_status: "pending", // Essai démarrera après validation admin
        registration_step: 2,
        license_number: "À_COMPLÉTER",
        vehicle_brand: "À compléter",
        vehicle_model: "À compléter",
        vehicle_year: new Date().getFullYear(),
        vehicle_color: "À compléter",
      };

      const { data: driverData, error: driverError } = await supabase
        .from("drivers")
        .insert(driverInsertData)
        .select()
        .single();

      if (driverError) throw driverError;

      setDriverId(driverData.id);

      // Add driver role
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({
          user_id: newUserId,
          role: "driver",
        });

      if (roleError && !roleError.message.includes("duplicate")) {
        throw roleError;
      }

      toast.success("🎉 Compte créé ! Bienvenue sur SoloCab.");
      
      // NOUVEAU FLUX: Rediriger directement vers le tunnel d'onboarding (pas de paiement)
      navigate("/driver-welcome");
    } catch (error: any) {
      console.error("Erreur step 1:", error);
      let errorMessage = error.message || "Erreur lors de la création du compte";
      
      // Notifier l'admin de l'erreur d'inscription
      notifyRegistrationError({
        step: "Création compte (Step 1)",
        email,
        phone,
        fullName,
        errorMessage: error.message || "Erreur inconnue",
        errorCode: error.code,
        userId: userId || undefined,
      });
      
      if (error.message?.includes("User already registered")) {
        errorMessage = "Cet email est déjà utilisé. Connectez-vous pour reprendre votre inscription.";
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

  // Handle step 2 - NFC plate choice (continue to step 3)
  const handleStep2Continue = () => {
    setCurrentStep(3);
  };

  // Skip NFC plate
  const handleSkipPlate = () => {
    setWantsPlate(false);
    setCurrentStep(3);
  };

  // Save choices before payment
  const saveChoicesBeforePayment = async () => {
    if (!driverId) return;
    
    try {
      await supabase
        .from("drivers")
        .update({
          pending_subscription_type: subscriptionType,
          pending_wants_plate: wantsPlate,
          pending_plate_type: wantsPlate ? plateType : null,
          shipping_address: wantsPlate ? shippingAddress.trim() : null,
          shipping_city: wantsPlate ? shippingCity.trim() : null,
          shipping_postal_code: wantsPlate ? shippingPostalCode.trim() : null,
          payment_failed_at: null, // Reset on new attempt
          payment_failed_reason: null,
        })
        .eq("id", driverId);
        
      console.log("[RegisterDriverPromo] Choices saved before payment");
    } catch (error) {
      console.error("[RegisterDriverPromo] Failed to save choices:", error);
    }
  };

  const handleFinalPayment = async () => {
    if (!driverId) {
      toast.error("Erreur: profil chauffeur non trouvé");
      return;
    }

    // Validation adresse si plaque commandée
    if (wantsPlate) {
      if (!shippingAddress.trim() || !shippingCity.trim() || !shippingPostalCode.trim()) {
        toast.error("Veuillez remplir tous les champs d'adresse pour recevoir votre plaque NFC");
        return;
      }
      if (!/^\d{5}$/.test(shippingPostalCode.trim())) {
        toast.error("Le code postal doit contenir 5 chiffres");
        return;
      }
    }

    // Show overlay IMMEDIATELY for better UX
    setShowPaymentOverlay(true);
    setLoading(true);
    setPaymentFailed(false);

    try {
      // Save choices in parallel with creating checkout session for speed
      const [_, checkoutResult] = await Promise.all([
        saveChoicesBeforePayment(),
        supabase.functions.invoke("create-driver-subscription", {
          body: { 
            driver_id: driverId,
            subscription_type: subscriptionType,
            with_plate: wantsPlate,
            plate_type: plateType,
            shipping_address: wantsPlate ? shippingAddress.trim() : null,
            shipping_city: wantsPlate ? shippingCity.trim() : null,
            shipping_postal_code: wantsPlate ? shippingPostalCode.trim() : null,
          },
        })
      ]);

      if (checkoutResult.error) throw checkoutResult.error;
      if (!checkoutResult.data?.url) throw new Error("URL de paiement non générée");

      // Small delay to ensure overlay animation is seen
      await new Promise(resolve => setTimeout(resolve, 300));

      // Redirect to Stripe
      window.location.href = checkoutResult.data.url;
    } catch (error: any) {
      console.error("Erreur paiement:", error);
      setShowPaymentOverlay(false);
      
      // Notifier l'admin de l'erreur de paiement
      notifyRegistrationError({
        step: "Paiement Stripe",
        errorMessage: error.message || "Erreur de paiement inconnue",
        errorCode: error.code,
        userId: userId || undefined,
        driverId: driverId || undefined,
      });
      
      // Record payment failure
      if (driverId) {
        await supabase
          .from("drivers")
          .update({
            payment_failed_at: new Date().toISOString(),
            payment_failed_reason: error.message || "Erreur de paiement",
          })
          .eq("id", driverId);
      }
      
      setPaymentFailed(true);
      setPaymentFailedReason(error.message || "Erreur lors de la création du paiement");
      toast.error(error.message || "Erreur lors de la création du paiement");
      setLoading(false);
    }
  };

  // Calcul du total avec prix promo des plaques (-20%)
  const getSubscriptionPrice = () => {
    if (subscriptionType === "annual") {
      return SUBSCRIPTION_ANNUAL_PRICE;
    }
    return 0; // Monthly has 14-day trial
  };

  const getPlatePromoPrice = () => {
    return plateType === "standard" ? PLATE_STANDARD_PROMO : PLATE_PREMIUM_PROMO;
  };

  const totalToPay = getSubscriptionPrice() + (wantsPlate ? getPlatePromoPrice() : 0);

  // Get current display step number (for progress indicator)
  const getDisplayStep = () => {
    if (fromPlate) {
      return currentStep; // 1 or 2
    }
    return currentStep; // 1, 2, or 3
  };

  // Afficher un loader pendant l'initialisation
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

  // Determine if we're showing the final payment step
  const isFinalStep = currentStep === totalSteps;
  // NFC promo step seulement si venu de la page plaque et que wantsPlate est true
  // Pour le parcours classique, on ne montre plus cette étape
  const isNfcPromoStep = false; // Désactivé - la plaque sera proposée après paiement dans le tunnel

  return (
    <>
      {/* Payment redirect overlay - shown immediately when user clicks pay */}
      <PaymentRedirectOverlay isVisible={showPaymentOverlay} />
      
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 py-6 px-4 sm:px-6 overflow-x-hidden">
        {/* Decorative gradient orbs */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl" />
        </div>
        
        <div className="relative w-full max-w-md mx-auto">
          {/* Header */}
          <div className="text-center mb-6">
            <img src={logo} alt="SoloCab" className="w-12 h-12 sm:w-14 sm:h-14 mx-auto mb-3 object-contain" />
          </div>

        {/* Simplified Progress - Only on step 1 */}
        {currentStep === 1 && (
          <div className="flex items-center justify-center gap-2 mb-6">
            {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
              <div key={step} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm transition-all ${
                    currentStep >= step
                      ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/30"
                      : "bg-slate-800 text-slate-500 border border-slate-700"
                  }`}
                >
                  {currentStep > step ? <CheckCircle className="w-4 h-4" /> : step}
                </div>
                {step < totalSteps && (
                  <div
                    className={`w-10 sm:w-12 h-1 mx-1 rounded-full transition-all ${
                      currentStep > step ? "bg-gradient-to-r from-emerald-500 to-emerald-600" : "bg-slate-800"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Payment failure alert */}
        {paymentFailed && isFinalStep && (
          <Alert className="mb-4 bg-destructive/10 border-destructive/30">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            <AlertDescription className="text-sm">
              <strong>Paiement échoué :</strong> {paymentFailedReason || "Une erreur est survenue."}
              <br />
              <span className="text-muted-foreground">Vos choix ont été sauvegardés. Vous pouvez réessayer le paiement.</span>
            </AlertDescription>
          </Alert>
        )}

        {/* Login mode for returning users */}
        {isLoginMode && currentStep === 1 && (
          <Card className="p-5 sm:p-6 bg-slate-900/80 backdrop-blur-xl border-slate-800/50 shadow-2xl">
            <h2 className="text-lg sm:text-xl font-bold mb-2 flex items-center gap-2 text-white">
              <RefreshCw className="w-5 h-5 text-emerald-500" />
              Reprendre votre inscription
            </h2>
            <p className="text-sm text-slate-400 mb-4">
              Connectez-vous pour finaliser votre inscription.
            </p>
            
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="loginEmail" className="text-sm text-slate-300">Email</Label>
                <Input
                  id="loginEmail"
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                  placeholder="votre@email.com"
                  className="h-12 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:ring-emerald-500/20"
                />
              </div>
              
              <div>
                <Label htmlFor="loginPassword" className="text-sm text-slate-300">Mot de passe</Label>
                <div className="relative">
                  <Input
                    id="loginPassword"
                    type={showPassword ? "text" : "password"}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                    placeholder="Votre mot de passe"
                    className="h-12 pr-12 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:ring-emerald-500/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <Button 
                type="submit" 
                disabled={loading} 
                className="w-full h-14 text-base font-semibold bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-lg shadow-emerald-500/25"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                Se connecter et continuer
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </form>

            <div className="mt-4 pt-4 border-t border-slate-800 text-center">
              <Button
                variant="ghost"
                onClick={() => {
                  setIsLoginMode(false);
                  setLoginEmail("");
                  setLoginPassword("");
                }}
                className="text-slate-400 hover:text-white hover:bg-slate-800"
              >
                ← Créer un nouveau compte
              </Button>
            </div>
          </Card>
        )}

        {/* Step 1: Account Info */}
        {currentStep === 1 && !isLoginMode && (
          <Card className="p-5 sm:p-6 bg-slate-900/80 backdrop-blur-xl border-slate-800/50 shadow-2xl">
            <h2 className="text-lg sm:text-xl font-bold mb-1 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-500" />
              Créez votre compte gratuit
            </h2>
            <form onSubmit={handleStep1} className="space-y-4 mt-4">
              <div>
                <Label htmlFor="fullName" className="text-sm text-slate-300">Nom complet *</Label>
                <Input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  placeholder="Jean Dupont"
                  className="h-12 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:ring-emerald-500/20"
                />
              </div>
              
              <div>
                <Label htmlFor="email" className="text-sm text-slate-300">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="votre@email.com"
                  className="h-12 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:ring-emerald-500/20"
                />
              </div>
              
              <div>
                <Label htmlFor="phone" className="text-sm text-slate-300">Téléphone *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  placeholder="06 12 34 56 78"
                  className="h-12 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:ring-emerald-500/20"
                />
              </div>
              
              <div>
                <Label htmlFor="password" className="text-sm text-slate-300">Mot de passe *</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Minimum 6 caractères"
                    minLength={6}
                    className="h-12 pr-12 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:ring-emerald-500/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              
              <div>
                <Label htmlFor="confirmPassword" className="text-sm text-slate-300">Confirmer le mot de passe *</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="Confirmez votre mot de passe"
                    minLength={6}
                    className="h-12 pr-12 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:ring-emerald-500/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              
              {confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-red-400">Les mots de passe ne correspondent pas</p>
              )}

              {/* CTA Button - Engaging Independence */}
              <Button 
                type="submit" 
                disabled={loading} 
                className="w-full h-14 text-base font-semibold bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-lg shadow-emerald-500/25 transition-all duration-300 hover:shadow-emerald-500/40 hover:scale-[1.02] active:scale-[0.98]"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                ) : (
                  <Sparkles className="w-5 h-5 mr-2" />
                )}
                Lancer mon indépendance
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              
              {/* Legal notice */}
              <p className="text-xs text-slate-500 text-center">
                En vous inscrivant, vous acceptez nos{" "}
                <button type="button" className="text-emerald-500 hover:underline">
                  conditions d'utilisation
                </button>
              </p>
            </form>

            {/* Link to login for existing users */}
            <div className="mt-6 pt-4 border-t border-slate-800 text-center">
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-3">Déjà inscrit ?</p>
              <Button
                variant="outline"
                onClick={() => setIsLoginMode(true)}
                className="w-full h-12 bg-transparent border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white hover:border-slate-600"
              >
                Se connecter
              </Button>
            </div>
          </Card>
        )}

        {/* Step 2: NFC Plate Promotion (only if not from plate page) */}
        {isNfcPromoStep && (
          <Card className="p-6">
            <div className="text-center mb-6">
              <Badge className="mb-3 bg-gradient-to-r from-orange-500 to-red-600 text-white border-0">
                <Sparkles className="w-3 h-3 mr-1" />
                Offre exclusive -20%
              </Badge>
              <h2 className="text-xl font-bold mb-2">Boostez votre visibilité !</h2>
              <p className="text-sm text-muted-foreground">
                Ajoutez une plaque NFC à votre commande et fidélisez vos clients en 1 scan
              </p>
            </div>

            {/* Two Plates Side by Side */}
            <div className="grid gap-4 mb-6">
              {/* Premium Plate - First */}
              <div 
                className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  wantsPlate && plateType === "premium"
                    ? "border-orange-500 bg-gradient-to-br from-zinc-800/50 to-zinc-900/50"
                    : "border-border hover:border-orange-500/50 bg-card/50"
                }`}
                onClick={() => {
                  setWantsPlate(true);
                  setPlateType("premium");
                }}
              >
                <Badge className="absolute top-3 right-3 bg-orange-500 text-white text-xs">
                  <Crown className="w-3 h-3 mr-1" />
                  Premium
                </Badge>
                
                <div className="flex items-center gap-4">
                  <div className="w-24 h-16 bg-zinc-900/50 rounded-lg flex items-center justify-center p-2">
                    <img 
                      src={nfcPlateLarge} 
                      alt="Plaque NFC Premium" 
                      className="w-full h-full object-contain"
                    />
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="font-bold text-white">Plastique noir</h3>
                    <p className="text-xs text-muted-foreground">Format carte • Ultra résistant</p>
                    
                    <div className="flex items-center gap-2 mt-2">
                      <span className="line-through text-sm text-muted-foreground">{PLATE_PREMIUM_PRICE}€</span>
                      <span className="font-bold text-lg text-orange-500">{PLATE_PREMIUM_PROMO}€</span>
                      <Badge variant="outline" className="border-green-500/50 text-green-400 text-xs">
                        -20%
                      </Badge>
                    </div>
                  </div>
                  
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    wantsPlate && plateType === "premium" 
                      ? "border-orange-500 bg-orange-500" 
                      : "border-muted-foreground"
                  }`}>
                    {wantsPlate && plateType === "premium" && (
                      <CheckCircle className="w-4 h-4 text-white" />
                    )}
                  </div>
                </div>
              </div>

              {/* Standard Plate */}
              <div 
                className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  wantsPlate && plateType === "standard"
                    ? "border-green-500 bg-gradient-to-br from-amber-900/20 to-amber-800/10"
                    : "border-border hover:border-green-500/50 bg-card/50"
                }`}
                onClick={() => {
                  setWantsPlate(true);
                  setPlateType("standard");
                }}
              >
                <Badge className="absolute top-3 right-3 bg-green-500 text-white text-xs">
                  <Trees className="w-3 h-3 mr-1" />
                  Éco
                </Badge>
                
                <div className="flex items-center gap-4">
                  <div className="w-24 h-16 bg-amber-900/20 rounded-lg flex items-center justify-center p-2">
                    <img 
                      src={nfcPlateSmall} 
                      alt="Plaque NFC Bois" 
                      className="w-full h-full object-contain"
                    />
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="font-bold text-white">Bois naturel</h3>
                    <p className="text-xs text-muted-foreground">Format ovale • Écologique</p>
                    
                    <div className="flex items-center gap-2 mt-2">
                      <span className="line-through text-sm text-muted-foreground">{PLATE_STANDARD_PRICE}€</span>
                      <span className="font-bold text-lg text-green-500">{PLATE_STANDARD_PROMO}€</span>
                      <Badge variant="outline" className="border-green-500/50 text-green-400 text-xs">
                        -20%
                      </Badge>
                    </div>
                  </div>
                  
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    wantsPlate && plateType === "standard" 
                      ? "border-green-500 bg-green-500" 
                      : "border-muted-foreground"
                  }`}>
                    {wantsPlate && plateType === "standard" && (
                      <CheckCircle className="w-4 h-4 text-white" />
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Key Features */}
            <div className="p-4 rounded-xl bg-muted/30 border border-border/50 mb-6">
              <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-premium" />
                Pourquoi une plaque NFC ?
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                  <span>Compatible tous smartphones</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                  <span>QR code + NFC intégré</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                  <span>Profil pro accessible</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                  <span>Fidélisation clients</span>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-border/50 flex items-center gap-2 text-xs">
                <Truck className="w-4 h-4 text-premium" />
                <span>Livraison gratuite en 5-7 jours</span>
              </div>
            </div>

            {/* Buttons */}
            <div className="space-y-3">
              <Button
                onClick={handleStep2Continue}
                disabled={!wantsPlate}
                className="w-full h-12 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white"
              >
                <Package className="w-4 h-4 mr-2" />
                Ajouter la plaque {plateType === "premium" ? "Premium" : "Bois"} ({getPlatePromoPrice()}€)
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              
              <Button
                variant="ghost"
                onClick={handleSkipPlate}
                className="w-full text-muted-foreground hover:text-foreground"
              >
                Continuer sans plaque NFC
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>

            {/* Back button */}
            <Button
              variant="ghost"
              onClick={() => setCurrentStep(1)}
              className="w-full mt-2 text-sm"
            >
              ← Modifier mes informations
            </Button>
          </Card>
        )}

        {/* Final Step: Subscription choice and payment */}
        {isFinalStep && (
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4">
              Étape 2 : Votre abonnement
            </h2>
            
            {/* Choix du type d'abonnement */}
            <div className="mb-6">
              <Label className="text-sm font-medium mb-3 block">Choisissez votre formule</Label>
              <RadioGroup
                value={subscriptionType}
                onValueChange={(value) => setSubscriptionType(value as "monthly" | "annual")}
                className="space-y-3"
              >
                {/* Mensuel */}
                <div 
                  className={`relative border rounded-lg p-4 cursor-pointer transition-all ${
                    subscriptionType === "monthly" 
                      ? "border-premium bg-premium/5" 
                      : "border-border hover:border-premium/50"
                  }`}
                  onClick={() => setSubscriptionType("monthly")}
                >
                  <div className="flex items-start gap-3">
                    <RadioGroupItem value="monthly" id="monthly" className="mt-1" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <label htmlFor="monthly" className="font-semibold cursor-pointer flex items-center gap-2">
                          <CalendarDays className="w-4 h-4 text-premium" />
                          Mensuel
                        </label>
                        <div className="text-right">
                          <span className="font-bold text-lg">{SUBSCRIPTION_MONTHLY_PRICE}€</span>
                          <span className="text-muted-foreground">/mois</span>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <Badge className="bg-green-500/10 text-green-600 border-green-500/30 text-xs">
                          <Sparkles className="w-3 h-3 mr-1" />
                          14 jours gratuits
                        </Badge>
                        <span className="text-xs text-muted-foreground">Sans engagement</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Empreinte bancaire 0€ • Débit après l'essai
                      </p>
                    </div>
                  </div>
                </div>

                {/* Annuel */}
                <div 
                  className={`relative border rounded-lg p-4 cursor-pointer transition-all ${
                    subscriptionType === "annual" 
                      ? "border-premium bg-premium/5" 
                      : "border-border hover:border-premium/50"
                  }`}
                  onClick={() => setSubscriptionType("annual")}
                >
                  <Badge className="absolute -top-2 right-3 bg-gradient-premium text-premium-foreground text-xs">
                    <Percent className="w-3 h-3 mr-1" />
                    -15%
                  </Badge>
                  <div className="flex items-start gap-3">
                    <RadioGroupItem value="annual" id="annual" className="mt-1" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <label htmlFor="annual" className="font-semibold cursor-pointer flex items-center gap-2">
                          <CalendarDays className="w-4 h-4 text-premium" />
                          Annuel
                        </label>
                        <div className="text-right">
                          <span className="font-bold text-lg">{SUBSCRIPTION_ANNUAL_PRICE}€</span>
                          <span className="text-muted-foreground">/an</span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Soit <strong>{ANNUAL_MONTHLY_EQUIVALENT}€/mois</strong> • Économisez 2 mois
                      </p>
                      <p className="text-xs text-premium font-medium mt-1">
                        Paiement immédiat • Accès instantané
                      </p>
                    </div>
                  </div>
                </div>
              </RadioGroup>
            </div>

            {/* Plaque NFC Summary (if selected) */}
            {wantsPlate && (
              <div className="border-t pt-4 mb-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-3">
                    {plateType === "premium" ? (
                      <div className="w-10 h-7 bg-gradient-to-br from-zinc-700 to-zinc-900 rounded flex items-center justify-center">
                        <CreditCard className="w-4 h-4 text-white" />
                      </div>
                    ) : (
                      <div className="w-10 h-7 bg-gradient-to-br from-amber-700 to-amber-900 rounded flex items-center justify-center">
                        <Trees className="w-4 h-4 text-white" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-sm">Plaque NFC {plateType === "premium" ? "Premium" : "Bois"}</p>
                      <p className="text-xs text-muted-foreground">Livraison gratuite</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="line-through text-xs text-muted-foreground mr-1">
                      {plateType === "premium" ? PLATE_PREMIUM_PRICE : PLATE_STANDARD_PRICE}€
                    </span>
                    <span className="font-bold text-green-600">{getPlatePromoPrice()}€</span>
                  </div>
                </div>
              </div>
            )}

            {/* Résumé de la commande */}
            <div className="bg-muted/30 rounded-lg p-4 mb-4 space-y-3">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Récapitulatif
              </h3>
              
              {/* Abonnement */}
              <div className="flex justify-between items-center py-2 border-b border-border/50">
                <div>
                  <p className="font-medium text-sm">
                    Abonnement {subscriptionType === "monthly" ? "Mensuel" : "Annuel"}
                  </p>
                  {subscriptionType === "monthly" && (
                    <p className="text-xs text-muted-foreground">14 jours d'essai gratuit</p>
                  )}
                </div>
                <div className="text-right">
                  {subscriptionType === "monthly" ? (
                    <>
                      <Badge className="bg-green-500/10 text-green-600 border-green-500/30">
                        GRATUIT
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        puis {SUBSCRIPTION_MONTHLY_PRICE}€/mois
                      </p>
                    </>
                  ) : (
                    <p className="font-semibold">{SUBSCRIPTION_ANNUAL_PRICE}€</p>
                  )}
                </div>
              </div>

              {/* Plaque NFC si commandée */}
              {wantsPlate && (
                <div className="flex justify-between items-center py-2 border-b border-border/50">
                  <div>
                    <p className="font-medium text-sm flex items-center gap-2">
                      {plateType === "standard" ? (
                        <Trees className="w-4 h-4 text-amber-600" />
                      ) : (
                        <CreditCard className="w-4 h-4 text-zinc-600" />
                      )}
                      Plaque NFC {plateType === "standard" ? "Bois" : "Premium"}
                    </p>
                    {shippingCity && (
                      <p className="text-xs text-muted-foreground">
                        Livraison : {shippingCity}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="line-through text-xs text-muted-foreground mr-1">
                      {plateType === "standard" ? PLATE_STANDARD_PRICE : PLATE_PREMIUM_PRICE}€
                    </span>
                    <span className="font-semibold text-green-600">{getPlatePromoPrice()}€</span>
                  </div>
                </div>
              )}

              {/* Total */}
              <div className="flex justify-between items-center pt-2">
                <p className="font-bold">Total à payer aujourd'hui</p>
                <p className={`font-bold text-xl ${totalToPay === 0 ? 'text-green-500' : ''}`}>
                  {totalToPay === 0 ? 'GRATUIT' : `${totalToPay.toFixed(2)}€`}
                </p>
              </div>
            </div>

            {/* Info empreinte bancaire */}
            <Alert className="mb-4 bg-blue-500/10 border-blue-500/30">
              <Shield className="w-4 h-4 text-blue-500" />
              <AlertDescription className="text-xs">
                {subscriptionType === "monthly" ? (
                  wantsPlate ? (
                    <>
                      <strong>Paiement sécurisé :</strong> Vous serez débité de <strong>{getPlatePromoPrice()}€</strong> pour 
                      la plaque NFC {plateType === "standard" ? "Bois" : "Premium"}. L'abonnement ({SUBSCRIPTION_MONTHLY_PRICE}€/mois) commencera après vos 14 jours d'essai.
                    </>
                  ) : (
                    <>
                      <strong>Empreinte bancaire 0€ :</strong> Aucun prélèvement immédiat. 
                      Vous ne serez débité de {SUBSCRIPTION_MONTHLY_PRICE}€/mois qu'après vos 14 jours d'essai.
                    </>
                  )
                ) : (
                  <>
                    <strong>Paiement immédiat :</strong> Vous serez débité de <strong>{totalToPay.toFixed(2)}€</strong> aujourd'hui 
                    pour accéder immédiatement à toutes les fonctionnalités pendant 1 an.
                  </>
                )}
              </AlertDescription>
            </Alert>

            {/* Documents info */}
            <Alert className="mb-4 bg-amber-500/10 border-amber-500/30">
              <FileText className="w-4 h-4 text-amber-500" />
              <AlertDescription className="text-xs">
                <strong>Documents requis :</strong> Après votre inscription, vous aurez <strong>7 jours</strong> pour 
                soumettre vos documents professionnels via votre espace.
              </AlertDescription>
            </Alert>

            {/* Avantages */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-sm">
                <Car className="w-4 h-4 text-premium" />
                <span>Gestion complète de votre activité</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Crown className="w-4 h-4 text-premium" />
                <span>QR Code personnel pour vos clients</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <TrendingUp className="w-4 h-4 text-premium" />
                <span>Facturation automatique</span>
              </div>
            </div>

            {/* Adresse de livraison - OBLIGATOIRE si plaque commandée */}
            {wantsPlate && (
              <div className="p-4 bg-gradient-to-r from-premium/10 to-primary/10 rounded-lg border-2 border-premium/30 mb-4">
                <h4 className="font-semibold text-sm flex items-center gap-2 mb-3">
                  <Truck className="w-4 h-4 text-premium" />
                  📦 Adresse de livraison de votre plaque NFC
                </h4>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="shippingAddress" className="text-xs font-medium">Adresse complète *</Label>
                    <Input
                      id="shippingAddress"
                      type="text"
                      value={shippingAddress}
                      onChange={(e) => setShippingAddress(e.target.value)}
                      placeholder="123 rue de la Liberté, Bât A"
                      className="h-11 text-base mt-1"
                      autoComplete="street-address"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="shippingPostalCode" className="text-xs font-medium">Code postal *</Label>
                      <Input
                        id="shippingPostalCode"
                        type="text"
                        value={shippingPostalCode}
                        onChange={(e) => setShippingPostalCode(e.target.value.replace(/\D/g, '').slice(0, 5))}
                        placeholder="75001"
                        maxLength={5}
                        className="h-11 text-base mt-1"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="shippingCity" className="text-xs font-medium">Ville *</Label>
                      <Input
                        id="shippingCity"
                        type="text"
                        value={shippingCity}
                        onChange={(e) => setShippingCity(e.target.value)}
                        placeholder="Paris"
                        className="h-11 text-base mt-1"
                        required
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Truck className="w-3 h-3" />
                    Livraison offerte en 5-7 jours ouvrés
                  </p>
                </div>
              </div>
            )}

            <Button
              onClick={handleFinalPayment}
              disabled={loading}
              className="w-full h-11 bg-gradient-premium text-premium-foreground shadow-premium"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {paymentFailed && <RefreshCw className="w-4 h-4 mr-2" />}
              {totalToPay === 0 
                ? "Valider l'empreinte bancaire (0€)" 
                : `Payer ${totalToPay.toFixed(2)}€`
              }
            </Button>

            <p className="text-xs text-center text-muted-foreground mt-3">
              Paiement sécurisé par Stripe
            </p>

            {/* Bouton retour - allow going back during registration */}
            {!fromPlate && (
              <Button
                variant="ghost"
                onClick={() => setCurrentStep(2)}
                className="w-full mt-2 text-sm"
              >
                ← Modifier mon choix de plaque
              </Button>
            )}
            
            {fromPlate && (
              <Button
                variant="ghost"
                onClick={() => setCurrentStep(1)}
                className="w-full mt-2 text-sm"
              >
                ← Modifier mes informations
              </Button>
            )}

            {/* Logout option for logged in users who want to use different account */}
            {userId && (
              <Button
                variant="ghost"
                onClick={async () => {
                  await supabase.auth.signOut();
                  setUserId(null);
                  setDriverId(null);
                  setCurrentStep(1);
                  setIsLoginMode(false);
                  toast.info("Déconnexion réussie");
                }}
                className="w-full mt-2 text-sm text-muted-foreground"
              >
                Utiliser un autre compte
              </Button>
            )}
          </Card>
        )}

        {/* Benefits footer */}
        <div className="mt-6 flex justify-center gap-2 sm:gap-3 flex-wrap">
          <div className="p-2.5 sm:p-3 text-center min-w-[80px] flex-1 max-w-[110px] bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50">
            <Shield className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
            <p className="font-medium text-[10px] sm:text-xs text-slate-300">Sécurisé</p>
          </div>
          <div className="p-2.5 sm:p-3 text-center min-w-[80px] flex-1 max-w-[110px] bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50">
            <CheckCircle className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
            <p className="font-medium text-[10px] sm:text-xs text-slate-300">Sans engagement</p>
          </div>
          <div className="p-2.5 sm:p-3 text-center min-w-[80px] flex-1 max-w-[110px] bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50">
            <TrendingUp className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
            <p className="font-medium text-[10px] sm:text-xs text-slate-300">Accès direct</p>
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

export default RegisterDriverPromo;
