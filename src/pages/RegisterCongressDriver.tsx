import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLocale } from "@/hooks/useLocale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Trophy, 
  Car, 
  Users, 
  CreditCard, 
  Calendar,
  Star,
  Shield,
  Zap,
  Gift,
  ChevronRight,
  CheckCircle2,
  Loader2,
  Crown
} from "lucide-react";

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
  { icon: Users, title: "Gestion de clientèle", description: "Portefeuille clients illimité avec QR codes personnalisés" },
  { icon: Calendar, title: "Planning intelligent", description: "Agenda des courses avec notifications automatiques" },
  { icon: CreditCard, title: "Facturation automatique", description: "Devis et factures générés automatiquement" },
  { icon: Star, title: "Vitrine publique", description: "Profil professionnel visible par les clients" },
  { icon: Shield, title: "Tableau de bord", description: "Statistiques détaillées de votre activité" },
  { icon: Zap, title: "Réservation instantanée", description: "Vos clients réservent en 2 clics" },
];

const RegisterCongressDriver = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useLocale();
  const slug = searchParams.get("ref") || "congres-vtc-pionnier";

  const [invitation, setInvitation] = useState<CongressInvitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    fullName: "",
    phone: "",
    vtcCardNumber: "",
    city: "",
  });

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

  const handleSubmit = async () => {
    if (formData.password !== formData.confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }

    if (formData.password.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            is_pioneer: true,
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Erreur lors de la création du compte");

      const userId = authData.user.id;

      // 2. Update profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: formData.fullName,
          phone: formData.phone,
          roles: ["driver"],
        })
        .eq("id", userId);

      if (profileError) throw profileError;

      // 3. Create driver with pioneer status
      const { data: driverData, error: driverError } = await supabase
        .from("drivers")
        .insert({
          user_id: userId,
          license_number: formData.vtcCardNumber,
          vehicle_model: "À renseigner",
          status: "pending",
          is_pioneer: true,
          pioneer_since: new Date().toISOString(),
          subscription_status: "trial",
          free_access_type: "trial",
          free_access_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .select()
        .single();

      if (driverError) throw driverError;

      // 4. Register in congress_registrations
      const { error: regError } = await supabase
        .from("congress_registrations")
        .insert({
          invitation_id: invitation!.id,
          driver_id: driverData.id,
          user_id: userId,
          subscription_status: "trial",
        });

      if (regError) throw regError;

      // 5. Increment current_uses
      await supabase
        .from("congress_invitations")
        .update({ current_uses: (invitation?.current_uses || 0) + 1 })
        .eq("id", invitation!.id);

      // 6. Redirect to Stripe checkout for subscription setup
      const { data: checkoutData, error: checkoutError } = await supabase.functions.invoke(
        "create-pioneer-subscription",
        {
          body: { driver_id: driverData.id },
        }
      );

      if (checkoutError) {
        console.error("Checkout error:", checkoutError);
        // Still success, just redirect to dashboard
        toast.success("🎉 Bienvenue parmi les Pionniers SoloCab !");
        navigate("/driver-pending-validation");
        return;
      }

      if (checkoutData?.url) {
        window.location.href = checkoutData.url;
      } else {
        toast.success("🎉 Bienvenue parmi les Pionniers SoloCab !");
        navigate("/driver-pending-validation");
      }
    } catch (err: any) {
      console.error("Registration error:", err);
      toast.error(err.message || "Erreur lors de l'inscription");
    } finally {
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
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 to-primary/10" />
        <div className="container mx-auto px-4 py-12 relative">
          <div className="text-center mb-8">
            <Badge className="mb-4 bg-gradient-to-r from-amber-500 to-amber-600 text-white border-0 text-sm px-4 py-2">
              <Crown className="w-4 h-4 mr-2" />
              OFFRE EXCLUSIVE CONGRÈS VTC
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-amber-500 to-primary bg-clip-text text-transparent">
              Devenez Pionnier SoloCab
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Rejoignez l'élite des chauffeurs VTC et bénéficiez d'un tarif préférentiel à vie
            </p>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap justify-center gap-6 mb-8">
            <Card className="bg-card/80 backdrop-blur border-amber-500/20">
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-bold text-amber-500">{remainingPlaces}</div>
                <div className="text-sm text-muted-foreground">Places restantes</div>
              </CardContent>
            </Card>
            <Card className="bg-card/80 backdrop-blur border-primary/20">
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-bold text-primary">30 jours</div>
                <div className="text-sm text-muted-foreground">Essai gratuit</div>
              </CardContent>
            </Card>
            <Card className="bg-card/80 backdrop-blur border-green-500/20">
              <CardContent className="p-4 text-center">
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-3xl font-bold text-green-500">39,99€</span>
                  <span className="text-sm text-muted-foreground line-through">49,99€</span>
                </div>
                <div className="text-sm text-muted-foreground">/mois à vie</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8 items-start">
          {/* Features Section */}
          <div className="space-y-6">
            <Card className="border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-6 w-6 text-amber-500" />
                  Avantages Pionnier
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <div className="font-medium">Badge Pionnier exclusif</div>
                    <div className="text-sm text-muted-foreground">Visible sur votre profil et vitrine publique</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <div className="font-medium">Tarif préférentiel à vie</div>
                    <div className="text-sm text-muted-foreground">39,99€/mois au lieu de 49,99€</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <div className="font-medium">1 mois d'essai gratuit</div>
                    <div className="text-sm text-muted-foreground">Testez toutes les fonctionnalités</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <div className="font-medium">Priorité sur les nouvelles fonctionnalités</div>
                    <div className="text-sm text-muted-foreground">Accès anticipé aux mises à jour</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-6 w-6 text-primary" />
                  Fonctionnalités incluses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {FEATURES.map((feature, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <feature.icon className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium">{feature.title}</div>
                        <div className="text-sm text-muted-foreground">{feature.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Registration Form */}
          <Card className="sticky top-4 border-2 border-primary/20">
            <CardHeader className="bg-gradient-to-r from-primary/10 to-amber-500/10">
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-6 w-6 text-primary" />
                Inscription Pionnier
              </CardTitle>
              <CardDescription>
                Étape {step} sur 2 - {step === 1 ? "Créez votre compte" : "Complétez votre profil"}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {step === 1 ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="votre@email.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Mot de passe</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    />
                    {formData.password && formData.confirmPassword && (
                      <div className={`text-sm ${formData.password === formData.confirmPassword ? 'text-green-500' : 'text-destructive'}`}>
                        {formData.password === formData.confirmPassword 
                          ? "✓ Les mots de passe correspondent"
                          : "✗ Les mots de passe ne correspondent pas"
                        }
                      </div>
                    )}
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => setStep(2)}
                    disabled={!formData.email || !formData.password || formData.password !== formData.confirmPassword}
                  >
                    Continuer
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Nom complet</Label>
                    <Input
                      id="fullName"
                      placeholder="Jean Dupont"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Téléphone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="06 12 34 56 78"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vtcCardNumber">Numéro de carte VTC</Label>
                    <Input
                      id="vtcCardNumber"
                      placeholder="Votre numéro de carte professionnelle"
                      value={formData.vtcCardNumber}
                      onChange={(e) => setFormData({ ...formData, vtcCardNumber: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">Ville d'exercice</Label>
                    <Input
                      id="city"
                      placeholder="Paris"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                      Retour
                    </Button>
                    <Button
                      className="flex-1 bg-gradient-to-r from-amber-500 to-primary hover:from-amber-600 hover:to-primary/90"
                      onClick={handleSubmit}
                      disabled={isSubmitting || !formData.fullName || !formData.phone}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Inscription...
                        </>
                      ) : (
                        <>
                          <Crown className="h-4 w-4 mr-2" />
                          Devenir Pionnier
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-center text-muted-foreground">
                    En vous inscrivant, vous acceptez nos conditions d'utilisation.
                    <br />
                    Votre carte bancaire ne sera pas débitée pendant la période d'essai.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default RegisterCongressDriver;