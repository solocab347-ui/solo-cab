import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, CheckCircle, Sparkles, ArrowRight, Car, Crown, Shield, TrendingUp, Eye, EyeOff, FileText } from "lucide-react";
import logo from "@/assets/logo-solocab.png";

const RegisterDriverPromo = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Step 1: Account creation
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  // Step 2: Driver info
  const [licenseNumber, setLicenseNumber] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [siret, setSiret] = useState("");

  const [userId, setUserId] = useState<string | null>(null);

  const handleStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation des mots de passe
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
      // Sign up user
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

      setUserId(authData.user.id);

      // Update profile with phone
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ phone })
        .eq("id", authData.user.id);

      if (profileError) throw profileError;

      toast.success("Compte créé avec succès !");
      setCurrentStep(2);
    } catch (error: any) {
      console.error("Erreur step 1:", error);
      toast.error(error.message || "Erreur lors de la création du compte");
    } finally {
      setLoading(false);
    }
  };

  const handleStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    setLoading(true);

    try {
      // Create driver profile
      const { data: driverData, error: driverError } = await supabase
        .from("drivers")
        .insert({
          user_id: userId,
          license_number: licenseNumber,
          vehicle_model: vehicleModel,
          company_name: companyName,
          siret,
          status: "pending",
          registration_step: 2,
        })
        .select()
        .single();

      if (driverError) throw driverError;

      // Add driver role
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({
          user_id: userId,
          role: "driver",
        });

      if (roleError) throw roleError;

      toast.success("Profil chauffeur créé !");
      setCurrentStep(3);
    } catch (error: any) {
      console.error("Erreur step 2:", error);
      toast.error(error.message || "Erreur lors de la création du profil");
    } finally {
      setLoading(false);
    }
  };

  const handleStep3Payment = async () => {
    if (!userId) return;

    setLoading(true);

    try {
      // Get driver_id
      const { data: driverData, error: driverError } = await supabase
        .from("drivers")
        .select("id")
        .eq("user_id", userId)
        .single();

      if (driverError || !driverData) throw new Error("Driver not found");

      // Create Stripe checkout with promo
      const { data, error } = await supabase.functions.invoke("create-driver-subscription", {
        body: { driver_id: driverData.id },
      });

      if (error) throw error;
      if (!data?.url) throw new Error("URL de paiement non générée");

      // Redirect to Stripe
      window.location.href = data.url;
    } catch (error: any) {
      console.error("Erreur step 3:", error);
      toast.error(error.message || "Erreur lors de la création du paiement");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="container max-w-4xl mx-auto">
        {/* Header with promo */}
        <div className="text-center mb-8">
          <img src={logo} alt="SoloCab" className="w-16 h-16 mx-auto mb-4 object-contain" />
          
          {/* Promo banner */}
          <div className="mb-6 relative">
            <div className="absolute inset-0 bg-gradient-premium opacity-10 blur-xl"></div>
            <Card className="relative border-premium/30 bg-gradient-to-br from-premium/5 to-background p-6">
              <Badge className="mb-3 bg-gradient-premium text-premium-foreground shadow-premium">
                <Sparkles className="w-3 h-3 mr-1" />
                OFFRE DÉCEMBRE 2025 - Valable tout le mois
              </Badge>
              <div className="flex items-center justify-center gap-4 mb-2">
                <span className="text-3xl font-bold text-muted-foreground line-through">49,99€</span>
                <ArrowRight className="w-6 h-6 text-premium" />
                <span className="text-5xl font-bold text-premium">9,99€</span>
              </div>
              <p className="text-lg text-muted-foreground">
                pour le premier mois, puis <span className="font-semibold text-foreground">49,99€/mois</span>
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Profitez de 40€ de réduction sur votre premier mois d'abonnement
              </p>
            </Card>
          </div>

          <h1 className="text-3xl font-bold mb-2">Inscription Chauffeur VTC</h1>
          <p className="text-muted-foreground">Rejoignez SoloCab et développez votre activité</p>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3].map((step) => (
            <div key={step} className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                  currentStep >= step
                    ? "bg-gradient-premium text-premium-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {currentStep > step ? <CheckCircle className="w-5 h-5" /> : step}
              </div>
              {step < 3 && (
                <div
                  className={`w-12 h-1 mx-2 ${
                    currentStep > step ? "bg-gradient-premium" : "bg-muted"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Account */}
        {currentStep === 1 && (
          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-6">Étape 1 : Créer votre compte</h2>
            <form onSubmit={handleStep1} className="space-y-4">
              <div>
                <Label htmlFor="fullName">Nom complet</Label>
                <Input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  placeholder="Jean Dupont"
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="jean@example.com"
                />
              </div>
              <div>
                <Label htmlFor="phone">Téléphone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  placeholder="06 12 34 56 78"
                />
              </div>
              <div>
                <Label htmlFor="password">Mot de passe</Label>
                <div className="relative">
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
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="Confirmer le mot de passe"
                    minLength={6}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-sm text-destructive mt-1">Les mots de passe ne correspondent pas</p>
                )}
              </div>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Continuer
              </Button>
            </form>
          </Card>
        )}

        {/* Step 2: Driver info */}
        {currentStep === 2 && (
          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-6">Étape 2 : Informations professionnelles</h2>
            <form onSubmit={handleStep2} className="space-y-4">
              <div>
                <Label htmlFor="licenseNumber">Numéro de carte VTC</Label>
                <Input
                  id="licenseNumber"
                  type="text"
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  required
                  placeholder="VTC123456"
                />
              </div>
              <div>
                <Label htmlFor="vehicleModel">Modèle de véhicule</Label>
                <Input
                  id="vehicleModel"
                  type="text"
                  value={vehicleModel}
                  onChange={(e) => setVehicleModel(e.target.value)}
                  required
                  placeholder="Mercedes Classe E"
                />
              </div>
              <div>
                <Label htmlFor="companyName">Nom de l'entreprise (optionnel)</Label>
                <Input
                  id="companyName"
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="VTC Transport"
                />
              </div>
              <div>
                <Label htmlFor="siret">SIRET (optionnel)</Label>
                <Input
                  id="siret"
                  type="text"
                  value={siret}
                  onChange={(e) => setSiret(e.target.value)}
                  placeholder="123 456 789 00010"
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Continuer vers le paiement
              </Button>
            </form>
          </Card>
        )}

        {/* Step 3: Payment */}
        {currentStep === 3 && (
          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-6">Étape 3 : Finaliser l'inscription</h2>
            
            <Alert className="mb-6 bg-premium/5 border-premium/30">
              <Sparkles className="w-5 h-5 text-premium" />
              <AlertDescription className="text-sm">
                <strong>Offre spéciale décembre :</strong> Profitez de votre premier mois à seulement 9,99€ au lieu de 49,99€ !
              </AlertDescription>
            </Alert>

            {/* Information sur les documents */}
            <Alert className="mb-6 bg-amber-500/10 border-amber-500/30">
              <FileText className="w-5 h-5 text-amber-500" />
              <AlertDescription className="text-sm">
                <strong>Documents requis :</strong> Après votre inscription, vous aurez <strong>30 jours</strong> pour 
                soumettre vos documents professionnels (carte VTC, permis, assurance, etc.) via votre espace personnel.
              </AlertDescription>
            </Alert>

            <div className="space-y-4 mb-6">
              <div className="flex items-start gap-3">
                <Car className="w-5 h-5 text-premium mt-1" />
                <div>
                  <p className="font-semibold">Plateforme complète</p>
                  <p className="text-sm text-muted-foreground">Gestion de courses, clients, devis et factures</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Crown className="w-5 h-5 text-premium mt-1" />
                <div>
                  <p className="font-semibold">Clients exclusifs via QR Code</p>
                  <p className="text-sm text-muted-foreground">Fidélisez votre clientèle</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-premium mt-1" />
                <div>
                  <p className="font-semibold">Profil public</p>
                  <p className="text-sm text-muted-foreground">Soyez visible sur notre vitrine</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <TrendingUp className="w-5 h-5 text-premium mt-1" />
                <div>
                  <p className="font-semibold">Support prioritaire</p>
                  <p className="text-sm text-muted-foreground">Assistance rapide et personnalisée</p>
                </div>
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-muted-foreground">Prix normal</span>
                <span className="line-through text-muted-foreground">49,99€</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-muted-foreground">Réduction décembre</span>
                <span className="text-success font-semibold">-40,00€</span>
              </div>
              <div className="h-px bg-border my-3"></div>
              <div className="flex justify-between items-center">
                <span className="font-bold text-lg">Premier mois</span>
                <span className="font-bold text-2xl text-premium">9,99€</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Puis 49,99€/mois - Sans engagement
              </p>
            </div>

            <Button
              onClick={handleStep3Payment}
              disabled={loading}
              className="w-full bg-gradient-premium text-premium-foreground shadow-premium"
              size="lg"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
              Procéder au paiement sécurisé
            </Button>

            <p className="text-xs text-center text-muted-foreground mt-4">
              Paiement sécurisé par Stripe. Vous serez redirigé vers la page de paiement.
            </p>
          </Card>
        )}

        {/* Benefits */}
        <div className="mt-8 grid md:grid-cols-3 gap-4">
          <Card className="p-4 text-center">
            <Shield className="w-8 h-8 text-premium mx-auto mb-2" />
            <p className="font-semibold text-sm">Paiement sécurisé</p>
            <p className="text-xs text-muted-foreground">Stripe SSL</p>
          </Card>
          <Card className="p-4 text-center">
            <CheckCircle className="w-8 h-8 text-success mx-auto mb-2" />
            <p className="font-semibold text-sm">Sans engagement</p>
            <p className="text-xs text-muted-foreground">Résiliable à tout moment</p>
          </Card>
          <Card className="p-4 text-center">
            <TrendingUp className="w-8 h-8 text-premium mx-auto mb-2" />
            <p className="font-semibold text-sm">Validation rapide</p>
            <p className="text-xs text-muted-foreground">Sous 24-48h</p>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default RegisterDriverPromo;
