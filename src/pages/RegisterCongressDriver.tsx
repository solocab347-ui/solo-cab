import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Loader2, 
  CheckCircle, 
  Crown, 
  Car, 
  Users, 
  Calendar,
  CreditCard,
  Star,
  Shield,
  Zap,
  Eye, 
  EyeOff,
  Handshake,
  Building2,
  TrendingUp,
  Palette,
  Globe,
  Smartphone,
  Heart
} from "lucide-react";
import logo from "@/assets/logo-solocab.png";

interface CongressInvitation {
  id: string;
  name: string;
  slug: string;
  max_uses: number;
  current_uses: number;
  trial_days: number;
  monthly_price: number;
  is_active: boolean;
}

const FEATURES = [
  { icon: Users, title: "Acquérir des clients", desc: "QR codes personnalisés" },
  { icon: Car, title: "Gérer vos courses", desc: "Planning intelligent" },
  { icon: Handshake, title: "Partenariats chauffeurs", desc: "Réseau de confiance" },
  { icon: Building2, title: "Clients entreprises", desc: "Contrats B2B" },
  { icon: TrendingUp, title: "Gestionnaires flotte", desc: "Collaboration pro" },
  { icon: Palette, title: "Vos propres prix", desc: "Liberté tarifaire" },
  { icon: Globe, title: "Vitrine publique", desc: "Visibilité clients" },
  { icon: Smartphone, title: "Maîtriser votre activité", desc: "Tableau de bord" },
];

const VALUES = [
  { icon: Zap, label: "Indépendance", color: "bg-blue-500" },
  { icon: Shield, label: "Technologie", color: "bg-violet-500" },
  { icon: Heart, label: "Humanité", color: "bg-orange-500" },
  { icon: Star, label: "Excellence", color: "bg-green-500" },
];

const RegisterCongressDriver = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const slug = searchParams.get("ref") || "congres-vtc-pionnier";

  const [invitation, setInvitation] = useState<CongressInvitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [driverId, setDriverId] = useState<string | null>(null);

  // Form state - Step 1
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    loadInvitation();
  }, [slug]);

  const loadInvitation = async () => {
    try {
      const { data, error } = await supabase
        .from("congress_invitations")
        .select("*")
        .eq("slug", slug)
        .eq("is_active", true)
        .single();

      if (error || !data) {
        toast.error("Lien d'invitation invalide ou expiré");
        navigate("/");
        return;
      }

      if (data.current_uses >= data.max_uses) {
        toast.error("Le nombre maximum d'inscriptions a été atteint");
        navigate("/");
        return;
      }

      setInvitation(data);
    } catch (err) {
      console.error("Error loading invitation:", err);
      toast.error("Erreur lors du chargement de l'invitation");
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

    if (!invitation) return;

    setIsSubmitting(true);

    try {
      // 1. Create user account
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            is_pioneer: true,
          },
          emailRedirectTo: `${window.location.origin}/registration-success`,
        },
      });

      if (signUpError) throw signUpError;
      if (!authData.user) throw new Error("Échec de création du compte");

      const newUserId = authData.user.id;
      setUserId(newUserId);

      // 2. Update profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ 
          phone,
          full_name: fullName,
          roles: ["driver"],
        })
        .eq("id", newUserId);

      if (profileError) throw profileError;

      // 3. Create driver record (pending status - documents to upload later)
      // license_number and vehicle_model are required fields, use placeholders
      const { data: driverData, error: driverError } = await supabase
        .from("drivers")
        .insert({
          user_id: newUserId,
          license_number: "",
          vehicle_model: "",
          status: "pending",
          is_pioneer: true,
          pioneer_since: new Date().toISOString(),
          subscription_status: "active",
          free_access_type: "trial",
          free_access_end_date: new Date(Date.now() + invitation.trial_days * 24 * 60 * 60 * 1000).toISOString(),
        })
        .select()
        .single();

      if (driverError) throw driverError;

      setDriverId(driverData.id);

      // 4. Add driver role
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({
          user_id: newUserId,
          role: "driver",
        });

      if (roleError && !roleError.message.includes("duplicate")) {
        throw roleError;
      }

      // 5. Create congress registration
      const { error: regError } = await supabase
        .from("congress_registrations")
        .insert({
          invitation_id: invitation.id,
          driver_id: driverData.id,
          user_id: newUserId,
          subscription_status: "trial",
        });

      if (regError) throw regError;

      // 6. Update invitation usage count
      await supabase
        .from("congress_invitations")
        .update({ current_uses: (invitation.current_uses || 0) + 1 })
        .eq("id", invitation.id);

      toast.success("Compte créé avec succès !");
      setCurrentStep(2);
    } catch (error: any) {
      console.error("Erreur step 1:", error);
      toast.error(error.message || "Erreur lors de la création du compte");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStep2Payment = async () => {
    if (!driverId) return;

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke("create-pioneer-subscription", {
        body: { driver_id: driverId },
      });

      if (error) {
        console.error("Checkout error:", error);
        // Fallback: redirect to driver dashboard directly (trial access is active)
        toast.success("🎉 Bienvenue parmi les Pionniers SoloCab !");
        navigate("/driver-dashboard");
        return;
      }

      if (data?.url) {
        window.location.href = data.url;
      } else {
        toast.success("🎉 Bienvenue parmi les Pionniers SoloCab !");
        navigate("/driver-dashboard");
      }
    } catch (error: any) {
      console.error("Erreur step 2:", error);
      toast.error(error.message || "Erreur lors du paiement");
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const remainingPlaces = invitation ? invitation.max_uses - invitation.current_uses : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container max-w-5xl mx-auto px-4 py-6 md:py-12">
        {/* Header */}
        <div className="text-center mb-6 md:mb-8">
          <img src={logo} alt="SoloCab" className="w-14 h-14 md:w-16 md:h-16 mx-auto mb-4 object-contain" />
          
          {/* Promo banner */}
          <div className="mb-6 relative">
            <Card className="relative border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-violet-500/10 p-4 md:p-6">
              <Badge className="mb-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 shadow-lg">
                <Crown className="w-3 h-3 mr-1" />
                OFFRE EXCLUSIVE CONGRÈS VTC 2026
              </Badge>
              
              <div className="flex flex-wrap items-center justify-center gap-3 md:gap-6 mb-2">
                <div className="text-center">
                  <span className="text-2xl md:text-4xl font-bold text-amber-500">{invitation?.trial_days || 30}</span>
                  <p className="text-xs md:text-sm text-muted-foreground">jours d'essai</p>
                </div>
                <div className="w-px h-10 bg-border hidden md:block" />
                <div className="text-center">
                  <span className="text-2xl md:text-4xl font-bold text-primary">{invitation?.monthly_price || 39.99}€</span>
                  <p className="text-xs md:text-sm text-muted-foreground">/mois à vie</p>
                </div>
                <div className="w-px h-10 bg-border hidden md:block" />
                <div className="text-center">
                  <span className="text-2xl md:text-4xl font-bold text-green-500">{remainingPlaces}</span>
                  <p className="text-xs md:text-sm text-muted-foreground">places restantes</p>
                </div>
              </div>
            </Card>
          </div>

          <h1 className="text-2xl md:text-3xl font-bold mb-2">Inscription Pionnier SoloCab</h1>
          <p className="text-sm md:text-base text-muted-foreground">Rejoignez l'élite des chauffeurs VTC indépendants</p>
        </div>

        {/* Progress indicator - 2 steps now */}
        <div className="flex items-center justify-center gap-1 md:gap-2 mb-6 md:mb-8">
          {[1, 2].map((step) => (
            <div key={step} className="flex items-center">
              <div
                className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center font-semibold text-sm md:text-base transition-all ${
                  currentStep >= step
                    ? "bg-gradient-to-r from-amber-500 to-primary text-white"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {currentStep > step ? <CheckCircle className="w-4 h-4 md:w-5 md:h-5" /> : step}
              </div>
              {step < 2 && (
                <div
                  className={`w-12 md:w-24 h-1 mx-1 md:mx-2 rounded transition-all ${
                    currentStep > step ? "bg-gradient-to-r from-amber-500 to-primary" : "bg-muted"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-5 gap-6 md:gap-8">
          {/* Left side - Features (hidden on step forms for mobile) */}
          <div className={`lg:col-span-2 space-y-4 ${currentStep < 2 ? 'hidden lg:block' : ''}`}>
            {/* Pioneer advantages */}
            <Card className="p-4 md:p-6 border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent">
              <h3 className="font-bold mb-4 flex items-center gap-2 text-sm md:text-base">
                <Crown className="h-5 w-5 text-amber-500" />
                Avantages Pionnier
              </h3>
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-sm">Badge Pionnier exclusif</p>
                    <p className="text-xs text-muted-foreground">Visible sur votre profil</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-sm">Tarif préférentiel à vie</p>
                    <p className="text-xs text-muted-foreground">{invitation?.monthly_price}€/mois garanti</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-sm">{invitation?.trial_days} jours d'essai</p>
                    <p className="text-xs text-muted-foreground">Testez sans risque</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-sm">Priorité nouvelles fonctions</p>
                    <p className="text-xs text-muted-foreground">Accès anticipé</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Features grid */}
            <Card className="p-4 md:p-6">
              <h3 className="font-bold mb-4 flex items-center gap-2 text-sm md:text-base">
                <Zap className="h-5 w-5 text-primary" />
                Fonctionnalités
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {FEATURES.map((feature, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                    <div className="p-1.5 rounded-lg bg-primary/10">
                      <feature.icon className="h-3 w-3 text-primary" />
                    </div>
                    <span className="text-xs font-medium">{feature.title}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Values */}
            <div className="flex justify-center gap-4">
              {VALUES.map((value, index) => (
                <div key={index} className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full ${value.color} flex items-center justify-center shadow-lg`}>
                    <value.icon className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-[10px] md:text-xs font-medium mt-1">{value.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right side - Form */}
          <div className="lg:col-span-3">
            {/* Step 1: Account */}
            {currentStep === 1 && (
              <Card className="p-4 md:p-8">
                <h2 className="text-lg md:text-2xl font-bold mb-4 md:mb-6">Étape 1 : Créer votre compte</h2>
                <form onSubmit={handleStep1} className="space-y-4">
                  <div>
                    <Label htmlFor="fullName">Nom complet *</Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      placeholder="Jean Dupont"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="jean@example.com"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Téléphone *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      placeholder="06 12 34 56 78"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="password">Mot de passe *</Label>
                    <div className="relative mt-1">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        placeholder="Minimum 6 caractères"
                        minLength={6}
                        className="pr-10"
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
                    <Label htmlFor="confirmPassword">Confirmer le mot de passe *</Label>
                    <div className="relative mt-1">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        placeholder="Confirmer"
                        minLength={6}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {confirmPassword && password !== confirmPassword && (
                      <p className="text-sm text-destructive mt-1">Les mots de passe ne correspondent pas</p>
                    )}
                    {confirmPassword && password === confirmPassword && (
                      <p className="text-sm text-green-500 mt-1">✓ Les mots de passe correspondent</p>
                    )}
                  </div>
                  <Button 
                    type="submit" 
                    disabled={isSubmitting} 
                    className="w-full bg-gradient-to-r from-amber-500 to-primary hover:from-amber-600 hover:to-primary/90"
                    size="lg"
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Continuer vers le paiement
                  </Button>
                </form>
              </Card>
            )}

            {/* Step 2: Payment */}
            {currentStep === 2 && (
              <Card className="p-4 md:p-8">
                <h2 className="text-lg md:text-2xl font-bold mb-4 md:mb-6">Étape 2 : Finaliser l'inscription</h2>
                
                <Alert className="mb-6 bg-amber-500/10 border-amber-500/30">
                  <Crown className="w-5 h-5 text-amber-500" />
                  <AlertDescription>
                    <strong>Offre Pionnier Congrès :</strong> {invitation?.trial_days} jours d'essai gratuit puis {invitation?.monthly_price}€/mois à vie !
                  </AlertDescription>
                </Alert>

                <div className="space-y-3 mb-6">
                  <div className="flex items-start gap-3">
                    <Car className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-sm">Plateforme complète</p>
                      <p className="text-xs text-muted-foreground">Gestion courses, clients, devis et factures</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Crown className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-sm">Badge Pionnier exclusif</p>
                      <p className="text-xs text-muted-foreground">Visible sur votre profil public</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-violet-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-sm">Vitrine publique</p>
                      <p className="text-xs text-muted-foreground">Soyez visible par les clients</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CreditCard className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-sm">Tarif garanti à vie</p>
                      <p className="text-xs text-muted-foreground">{invitation?.monthly_price}€/mois sans augmentation</p>
                    </div>
                  </div>
                </div>

                <div className="bg-muted/50 rounded-lg p-4 mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-muted-foreground">Essai gratuit</span>
                    <span className="font-semibold text-green-500">{invitation?.trial_days} jours</span>
                  </div>
                  <div className="h-px bg-border my-3"></div>
                  <div className="flex justify-between items-center">
                    <span className="font-bold">Puis abonnement</span>
                    <span className="font-bold text-xl text-primary">{invitation?.monthly_price}€/mois</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    Empreinte carte bancaire requise • Sans engagement
                  </p>
                </div>

                <Alert className="mb-6 bg-blue-500/10 border-blue-500/30">
                  <CheckCircle className="w-5 h-5 text-blue-500" />
                  <AlertDescription>
                    <strong>Après le paiement :</strong> Vous accéderez à votre espace chauffeur où vous pourrez téléverser vos documents professionnels (carte VTC, Kbis, etc.)
                  </AlertDescription>
                </Alert>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentStep(1)}
                    className="flex-1"
                  >
                    Retour
                  </Button>
                  <Button
                    onClick={handleStep2Payment}
                    disabled={isSubmitting}
                    className="flex-1 bg-gradient-to-r from-amber-500 to-primary hover:from-amber-600 hover:to-primary/90"
                    size="lg"
                  >
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <CreditCard className="w-5 h-5 mr-2" />}
                    Procéder au paiement
                  </Button>
                </div>

                <p className="text-xs text-center text-muted-foreground mt-4">
                  🔒 Paiement sécurisé par Stripe. Vous recevrez un email de confirmation.
                </p>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterCongressDriver;
