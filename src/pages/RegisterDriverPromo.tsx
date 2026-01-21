import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { Loader2, CheckCircle, Sparkles, Car, Crown, Shield, TrendingUp, Eye, EyeOff, FileText, Package, MapPin, CreditCard, Percent, CalendarDays } from "lucide-react";
import logo from "@/assets/logo-solocab.png";

const PLATE_PRICE = 29.99;
const SUBSCRIPTION_MONTHLY_PRICE = 9.99;
const SUBSCRIPTION_ANNUAL_PRICE = 101.90;
const ANNUAL_MONTHLY_EQUIVALENT = (SUBSCRIPTION_ANNUAL_PRICE / 12).toFixed(2);

const RegisterDriverPromo = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Étape 1 - Informations obligatoires
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  // Étape 2 - Choix abonnement et options
  const [subscriptionType, setSubscriptionType] = useState<"monthly" | "annual">("monthly");
  const [wantsPlate, setWantsPlate] = useState(false);
  const [shippingAddress, setShippingAddress] = useState("");
  const [shippingCity, setShippingCity] = useState("");
  const [shippingPostalCode, setShippingPostalCode] = useState("");

  const [userId, setUserId] = useState<string | null>(null);
  const [driverId, setDriverId] = useState<string | null>(null);

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

      // Create driver profile with all required fields
      const driverInsertData: any = {
        user_id: newUserId,
        status: "on_hold",
        subscription_status: "payment_required",
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

      toast.success("Compte créé avec succès !");
      setCurrentStep(2);
    } catch (error: any) {
      console.error("Erreur step 1:", error);
      let errorMessage = error.message || "Erreur lors de la création du compte";
      if (error.message?.includes("User already registered")) {
        errorMessage = "Cet email est déjà utilisé. Veuillez vous connecter.";
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

  const handleStep2Payment = async () => {
    if (!driverId) return;

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

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("create-driver-subscription", {
        body: { 
          driver_id: driverId,
          subscription_type: subscriptionType,
          with_plate: wantsPlate,
          shipping_address: wantsPlate ? shippingAddress.trim() : null,
          shipping_city: wantsPlate ? shippingCity.trim() : null,
          shipping_postal_code: wantsPlate ? shippingPostalCode.trim() : null,
        },
      });

      if (error) throw error;
      if (!data?.url) throw new Error("URL de paiement non générée");

      window.location.href = data.url;
    } catch (error: any) {
      console.error("Erreur step 2:", error);
      toast.error(error.message || "Erreur lors de la création du paiement");
      setLoading(false);
    }
  };

  // Calcul du total
  const getSubscriptionPrice = () => {
    if (subscriptionType === "annual") {
      return SUBSCRIPTION_ANNUAL_PRICE;
    }
    return 0; // Monthly has 14-day trial
  };

  const totalToPay = getSubscriptionPrice() + (wantsPlate ? PLATE_PRICE : 0);

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="container max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <img src={logo} alt="SoloCab" className="w-14 h-14 mx-auto mb-3 object-contain" />
          
          <h1 className="text-2xl font-bold mb-1">Inscription Chauffeur VTC</h1>
          <p className="text-sm text-muted-foreground">Rejoignez SoloCab et développez votre activité</p>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {[1, 2].map((step) => (
            <div key={step} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${
                  currentStep >= step
                    ? "bg-gradient-premium text-premium-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {currentStep > step ? <CheckCircle className="w-4 h-4" /> : step}
              </div>
              {step < 2 && (
                <div
                  className={`w-12 h-1 mx-1 ${
                    currentStep > step ? "bg-gradient-premium" : "bg-muted"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Account Info */}
        {currentStep === 1 && (
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4">Étape 1 : Vos informations</h2>
            <form onSubmit={handleStep1} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="fullName" className="text-sm">Nom complet *</Label>
                  <Input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    placeholder="Jean Dupont"
                    className="h-10"
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
                    className="h-10"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="email" className="text-sm">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="jean@example.com"
                  className="h-10"
                />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="password" className="text-sm">Mot de passe *</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="Min. 6 caractères"
                      minLength={6}
                      className="h-10 pr-10"
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
                  <Label htmlFor="confirmPassword" className="text-sm">Confirmer *</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      placeholder="Confirmer le mot de passe"
                      minLength={6}
                      className="h-10 pr-10"
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
              </div>
              
              {confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-destructive">Les mots de passe ne correspondent pas</p>
              )}

              <Button type="submit" disabled={loading} className="w-full h-11">
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Continuer
              </Button>
            </form>
          </Card>
        )}

        {/* Step 2: Choix abonnement et options */}
        {currentStep === 2 && (
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4">Étape 2 : Votre abonnement</h2>
            
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

            {/* Option Plaque NFC */}
            <div className="border-t pt-4 mb-4">
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="wantsPlate"
                  checked={wantsPlate}
                  onCheckedChange={(checked) => setWantsPlate(checked === true)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <label htmlFor="wantsPlate" className="flex items-center gap-2 cursor-pointer">
                    <Package className="w-4 h-4 text-premium" />
                    <span className="font-medium text-sm">Commander une Plaque NFC Pro</span>
                    <Badge variant="outline" className="ml-auto text-xs bg-premium/10 border-premium/30 text-premium">
                      {PLATE_PRICE}€
                    </Badge>
                  </label>
                  
                  <div className="mt-2 space-y-1.5">
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <CheckCircle className="w-3 h-3 text-success shrink-0" />
                      Liée directement à votre profil chauffeur
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <CheckCircle className="w-3 h-3 text-success shrink-0" />
                      Les clients s'inscrivent en 1 scan
                    </p>
                    <p className="text-xs text-premium font-medium flex items-center gap-1.5 mt-2">
                      <Package className="w-3 h-3 shrink-0" />
                      Expédition sous 5-7 jours ouvrés
                    </p>
                  </div>
                </div>
              </div>

              {/* Adresse de livraison si plaque commandée */}
              {wantsPlate && (
                <div className="mt-4 p-4 bg-muted/30 rounded-lg space-y-3">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-premium" />
                    Adresse de livraison
                  </h4>
                  <div>
                    <Label htmlFor="shippingAddress" className="text-xs">Adresse complète *</Label>
                    <Input
                      id="shippingAddress"
                      type="text"
                      value={shippingAddress}
                      onChange={(e) => setShippingAddress(e.target.value)}
                      placeholder="123 rue de la Liberté, Bât A"
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="shippingPostalCode" className="text-xs">Code postal *</Label>
                      <Input
                        id="shippingPostalCode"
                        type="text"
                        value={shippingPostalCode}
                        onChange={(e) => setShippingPostalCode(e.target.value.replace(/\D/g, '').slice(0, 5))}
                        placeholder="75001"
                        maxLength={5}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div>
                      <Label htmlFor="shippingCity" className="text-xs">Ville *</Label>
                      <Input
                        id="shippingCity"
                        type="text"
                        value={shippingCity}
                        onChange={(e) => setShippingCity(e.target.value)}
                        placeholder="Paris"
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

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
                      <Package className="w-4 h-4 text-premium" />
                      Plaque NFC Pro
                    </p>
                    {shippingCity && (
                      <p className="text-xs text-muted-foreground">
                        Livraison : {shippingCity}
                      </p>
                    )}
                  </div>
                  <p className="font-semibold">{PLATE_PRICE}€</p>
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
                      <strong>Paiement sécurisé :</strong> Vous serez débité de <strong>{PLATE_PRICE}€</strong> pour 
                      la plaque NFC. L'abonnement ({SUBSCRIPTION_MONTHLY_PRICE}€/mois) commencera après vos 14 jours d'essai.
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

            <Button
              onClick={handleStep2Payment}
              disabled={loading}
              className="w-full h-11 bg-gradient-premium text-premium-foreground shadow-premium"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {totalToPay === 0 
                ? "Valider l'empreinte bancaire (0€)" 
                : `Payer ${totalToPay.toFixed(2)}€`
              }
            </Button>

            <p className="text-xs text-center text-muted-foreground mt-3">
              Paiement sécurisé par Stripe
            </p>

            {/* Bouton retour */}
            <Button
              variant="ghost"
              onClick={() => setCurrentStep(1)}
              className="w-full mt-2 text-sm"
            >
              ← Modifier mes informations
            </Button>
          </Card>
        )}

        {/* Benefits footer */}
        <div className="mt-6 grid grid-cols-3 gap-2">
          <Card className="p-3 text-center">
            <Shield className="w-6 h-6 text-premium mx-auto mb-1" />
            <p className="font-medium text-xs">Sécurisé</p>
          </Card>
          <Card className="p-3 text-center">
            <CheckCircle className="w-6 h-6 text-success mx-auto mb-1" />
            <p className="font-medium text-xs">Sans engagement</p>
          </Card>
          <Card className="p-3 text-center">
            <TrendingUp className="w-6 h-6 text-premium mx-auto mb-1" />
            <p className="font-medium text-xs">Accès direct</p>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default RegisterDriverPromo;
