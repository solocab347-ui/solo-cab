import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Truck, ArrowLeft, Eye, EyeOff, Building2, CheckCircle, Sparkles, Users, Shield, TrendingUp, FileText, CreditCard } from "lucide-react";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useLocale } from "@/hooks/useLocale";
import logo from "@/assets/logo-solocab.png";

const RegisterFleetManager = () => {
  const navigate = useNavigate();
  const { t } = useLocale();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Form data
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    companyName: "",
    siret: "",
    siren: "",
    address: "",
    contactName: "",
    contactPhone: "",
  });

  // After step 1
  const [userId, setUserId] = useState<string | null>(null);
  const [fleetManagerId, setFleetManagerId] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Step 1: Create account and fleet manager profile
  const handleStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }

    if (formData.password.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }

    setLoading(true);

    try {
      // 1. Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.contactName,
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Erreur lors de la création du compte");

      const newUserId = authData.user.id;
      setUserId(newUserId);

      // Wait for profile to be created by trigger
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // 2. Create fleet manager profile
      const { data: fleetData, error: fleetError } = await supabase.from("fleet_managers").insert({
        user_id: newUserId,
        company_name: formData.companyName,
        siret: formData.siret,
        siren: formData.siren || null,
        address: formData.address,
        contact_name: formData.contactName,
        contact_email: formData.email,
        contact_phone: formData.contactPhone || null,
        status: "pending", // Pending until payment
        documents_status: "pending",
        subscription_status: "pending",
      }).select().single();

      if (fleetError) throw fleetError;
      
      setFleetManagerId(fleetData.id);

      // 3. Add fleet_manager role
      const { error: roleError } = await supabase.from("user_roles").insert({
        user_id: newUserId,
        role: "fleet_manager",
      });

      if (roleError) throw roleError;

      toast.success("Compte créé ! Passez au paiement pour activer votre abonnement.");
      setCurrentStep(2);
    } catch (error: any) {
      console.error("Registration error:", error);
      toast.error(error.message || "Erreur lors de l'inscription");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Redirect to Stripe payment
  const handleStep2Payment = async () => {
    if (!fleetManagerId) {
      toast.error("Erreur: ID gestionnaire manquant");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("create-fleet-manager-subscription", {
        body: { fleet_manager_id: fleetManagerId },
      });

      if (error) throw error;
      if (!data?.url) throw new Error("URL de paiement non générée");

      // Redirect to Stripe
      window.location.href = data.url;
    } catch (error: any) {
      console.error("Payment error:", error);
      toast.error(error.message || "Erreur lors de la création du paiement");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/50 py-12 px-4">
      {/* Language Selector */}
      <div className="fixed top-4 right-4 z-50">
        <LanguageSelector />
      </div>
      
      <div className="container max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <img src={logo} alt="SoloCab" className="h-16 mx-auto mb-4" />
          </Link>
          
          {/* Promo banner */}
          <div className="mb-6 relative">
            <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 to-emerald-500/10 blur-xl"></div>
            <Card className="relative border-green-500/30 bg-gradient-to-br from-green-500/5 to-background p-6">
              <Badge className="mb-3 bg-green-500 text-white">
                <Sparkles className="w-3 h-3 mr-1" />
                OFFRE SPÉCIALE - 30 JOURS GRATUITS
              </Badge>
              <div className="flex items-center justify-center gap-4 mb-2">
                <span className="text-5xl font-bold text-green-500">GRATUIT</span>
              </div>
              <p className="text-lg text-muted-foreground">
                30 jours d'essai gratuit, puis <span className="font-semibold text-foreground">69,99€/mois</span>
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                10 chauffeurs inclus • +10€/chauffeur supplémentaire
              </p>
            </Card>
          </div>

          <h1 className="text-3xl font-bold mb-2">{t('landing.fleet.registerFleet')}</h1>
          <p className="text-muted-foreground">{t('landing.fleet.heroSubtitle')}</p>
        </div>

        {/* Progress indicator - 2 steps */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2].map((step) => (
            <div key={step} className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                  currentStep >= step
                    ? "bg-green-500 text-white"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {currentStep > step ? <CheckCircle className="w-5 h-5" /> : step}
              </div>
              {step < 2 && (
                <div
                  className={`w-16 h-1 mx-2 transition-all ${
                    currentStep > step ? "bg-green-500" : "bg-muted"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Account + Company Info */}
        {currentStep === 1 && (
          <Card className="p-8">
            <CardHeader className="px-0 pt-0">
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Truck className="w-6 h-6 text-primary" />
                Étape 1 : Vos informations
              </CardTitle>
              <CardDescription>
                Créez votre compte pour gérer vos chauffeurs et clients
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <form onSubmit={handleStep1} className="space-y-6">
                {/* Company Info */}
                <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                  <h3 className="font-medium flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Informations Entreprise
                  </h3>
                  
                  <div>
                    <Label htmlFor="companyName">Nom de l'entreprise *</Label>
                    <Input
                      id="companyName"
                      name="companyName"
                      value={formData.companyName}
                      onChange={handleChange}
                      required
                      placeholder="Ma Société VTC"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="siret">SIRET *</Label>
                      <Input
                        id="siret"
                        name="siret"
                        value={formData.siret}
                        onChange={handleChange}
                        required
                        placeholder="12345678901234"
                        maxLength={14}
                      />
                    </div>
                    <div>
                      <Label htmlFor="siren">SIREN</Label>
                      <Input
                        id="siren"
                        name="siren"
                        value={formData.siren}
                        onChange={handleChange}
                        placeholder="123456789"
                        maxLength={9}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="address">Adresse *</Label>
                    <AddressAutocomplete
                      value={formData.address}
                      onChange={(address) => setFormData({ ...formData, address })}
                      placeholder="123 Rue de Paris, 75001 Paris"
                    />
                  </div>
                </div>

                {/* Contact Info */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="contactName">Nom du responsable *</Label>
                    <Input
                      id="contactName"
                      name="contactName"
                      value={formData.contactName}
                      onChange={handleChange}
                      required
                      placeholder="Jean Dupont"
                    />
                  </div>

                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      placeholder="contact@masociete.fr"
                    />
                  </div>

                  <div>
                    <Label htmlFor="contactPhone">Téléphone</Label>
                    <Input
                      id="contactPhone"
                      name="contactPhone"
                      type="tel"
                      value={formData.contactPhone}
                      onChange={handleChange}
                      placeholder="06 12 34 56 78"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="password">Mot de passe *</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          name="password"
                          type={showPassword ? "text" : "password"}
                          value={formData.password}
                          onChange={handleChange}
                          required
                          minLength={6}
                          placeholder="Minimum 6 caractères"
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
                      <Label htmlFor="confirmPassword">Confirmer *</Label>
                      <div className="relative">
                        <Input
                          id="confirmPassword"
                          name="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          value={formData.confirmPassword}
                          onChange={handleChange}
                          required
                          minLength={6}
                          placeholder="Confirmer le mot de passe"
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
                    </div>
                  </div>
                  {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                    <p className="text-sm text-destructive">Les mots de passe ne correspondent pas</p>
                  )}
                </div>

                <Button type="submit" className="w-full" disabled={loading} size="lg">
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Création en cours...
                    </>
                  ) : (
                    <>
                      Continuer vers le paiement
                      <CreditCard className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Payment */}
        {currentStep === 2 && (
          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <CreditCard className="w-6 h-6 text-primary" />
              Étape 2 : Finaliser l'inscription
            </h2>
            
            <Alert className="mb-6 bg-green-500/10 border-green-500/30">
              <Sparkles className="w-5 h-5 text-green-500" />
              <AlertDescription className="text-sm">
                <strong>Offre spéciale :</strong> Profitez de 30 jours d'essai gratuit pour tester toutes les fonctionnalités !
              </AlertDescription>
            </Alert>

            {/* Information sur les documents */}
            <Alert className="mb-6 bg-amber-500/10 border-amber-500/30">
              <FileText className="w-5 h-5 text-amber-500" />
              <AlertDescription className="text-sm">
                <strong>Documents requis :</strong> Après votre inscription, vous aurez <strong>30 jours</strong> pour 
                soumettre vos documents professionnels (Kbis, assurance, etc.) via votre espace personnel.
              </AlertDescription>
            </Alert>

            <div className="space-y-4 mb-6">
              <div className="flex items-start gap-3">
                <Users className="w-5 h-5 text-primary mt-1" />
                <div>
                  <p className="font-semibold">Gestion de flotte complète</p>
                  <p className="text-sm text-muted-foreground">Gérez jusqu'à 10 chauffeurs inclus</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Truck className="w-5 h-5 text-primary mt-1" />
                <div>
                  <p className="font-semibold">Dispatch automatique</p>
                  <p className="text-sm text-muted-foreground">Assignez les courses à vos chauffeurs</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-primary mt-1" />
                <div>
                  <p className="font-semibold">Partenariats entreprises</p>
                  <p className="text-sm text-muted-foreground">Contrats B2B avec facturation centralisée</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <TrendingUp className="w-5 h-5 text-primary mt-1" />
                <div>
                  <p className="font-semibold">Statistiques avancées</p>
                  <p className="text-sm text-muted-foreground">Suivez les performances de votre flotte</p>
                </div>
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-muted-foreground">Essai gratuit</span>
                <Badge className="bg-green-500">30 jours</Badge>
              </div>
              <div className="h-px bg-border my-3"></div>
              <div className="flex justify-between items-center">
                <span className="font-bold text-lg">Premier mois</span>
                <span className="font-bold text-2xl text-green-500">GRATUIT</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Puis 69,99€/mois (10 chauffeurs inclus) - Sans engagement
              </p>
            </div>

            <Button
              onClick={handleStep2Payment}
              disabled={loading}
              className="w-full bg-green-500 hover:bg-green-600 text-white"
              size="lg"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
              Procéder au paiement sécurisé
            </Button>

            <p className="text-xs text-center text-muted-foreground mt-4">
              Paiement sécurisé par Stripe. Empreinte bancaire uniquement, 0€ débité aujourd'hui.
            </p>
          </Card>
        )}

        {/* Benefits */}
        <div className="mt-8 grid md:grid-cols-3 gap-4">
          <Card className="p-4 text-center">
            <Shield className="w-8 h-8 text-primary mx-auto mb-2" />
            <p className="font-semibold text-sm">Paiement sécurisé</p>
            <p className="text-xs text-muted-foreground">Stripe SSL</p>
          </Card>
          <Card className="p-4 text-center">
            <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <p className="font-semibold text-sm">Sans engagement</p>
            <p className="text-xs text-muted-foreground">Résiliez à tout moment</p>
          </Card>
          <Card className="p-4 text-center">
            <Users className="w-8 h-8 text-primary mx-auto mb-2" />
            <p className="font-semibold text-sm">10 chauffeurs inclus</p>
            <p className="text-xs text-muted-foreground">+10€/chauffeur supp.</p>
          </Card>
        </div>

        <div className="mt-6 text-center text-sm">
          <p className="text-muted-foreground">
            {t('login.alreadyHaveAccount')}{" "}
            <Link to="/login" className="text-primary hover:underline">
              {t('login.signIn')}
            </Link>
          </p>
        </div>

        <div className="mt-4 text-center">
          <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4 mr-1" />
            {t('common.back')}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterFleetManager;
