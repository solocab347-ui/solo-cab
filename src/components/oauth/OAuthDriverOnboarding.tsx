import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, CheckCircle, Car, CreditCard, ArrowRight } from "lucide-react";
import logo from "@/assets/logo-solocab.png";

interface Props {
  user: any;
}

export const OAuthDriverOnboarding = ({ user }: Props) => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1
  const [fullName, setFullName] = useState(
    user.user_metadata?.full_name || user.user_metadata?.name || ""
  );
  const [phone, setPhone] = useState("");

  // Step 2
  const [vehicleModel, setVehicleModel] = useState("");
  const [city, setCity] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim()) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }
    setStep(2);
  };

  const handleStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleModel.trim() || !city.trim()) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    setLoading(true);
    try {
      // Update profile
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          full_name: fullName.trim(),
          phone: phone.trim(),
          email: user.email,
        });

      if (profileError) throw profileError;

      // Create driver record (trigger auto-assigns role)
      const { error: driverError } = await supabase
        .from("drivers")
        .insert({
          user_id: user.id,
          vehicle_model: vehicleModel.trim(),
          city: city.trim(),
          license_number: licenseNumber.trim() || null,
          status: "pending",
          registration_step: "stripe_connect",
          free_access_granted: true,
          free_access_type: "permanent_free",
        } as any);

      if (driverError && !driverError.message.includes("duplicate")) throw driverError;

      localStorage.removeItem("solocab_oauth_signup_type");
      
      // Redirect to onboarding (Stripe Connect step)
      toast.success("Profil créé ! Passons à la configuration Stripe.");
      setStep(3);
    } catch (err: any) {
      toast.error("Erreur", { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleStripeOnboarding = async () => {
    setLoading(true);
    try {
      const { openExternalUrl } = await import("@/lib/openExternalUrl");
      const { data, error } = await supabase.functions.invoke("stripe-connect-onboarding");
      
      if (error) throw error;
      if (!data?.url) throw new Error("Impossible de démarrer Stripe");

      await openExternalUrl(data.url, {
        onClose: () => {
          // User closed Stripe browser → continue to dashboard
          toast.info("Configuration Stripe terminée. Bienvenue !");
          navigate("/driver-dashboard", { replace: true });
        },
      });
    } catch (err: any) {
      toast.error("Erreur Stripe", { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const skipStripe = () => {
    toast.info("Vous pourrez configurer Stripe depuis votre tableau de bord");
    navigate("/driver-dashboard", { replace: true });
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
        <div className="text-center">
          <img src={logo} alt="SoloCab" className="w-12 h-12 mx-auto mb-4" />
          <div className="flex items-center justify-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-primary" />
            <span className="text-sm text-primary font-medium">Compte créé</span>
          </div>
          <h1 className="text-xl font-bold">Inscription Chauffeur</h1>

          {/* Progress */}
          <div className="flex items-center justify-center gap-2 mt-3">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-1.5 w-12 rounded-full transition-colors ${
                  s <= step ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Étape {step} sur 3
          </p>
        </div>

        {/* Step 1: Personal info */}
        {step === 1 && (
          <Card className="p-5">
            <form onSubmit={handleStep1} className="space-y-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-bold text-primary">1</span>
                </div>
                <p className="font-medium">Informations personnelles</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fullName">Prénom et nom *</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Jean Dupont"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Téléphone *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+33 6 12 34 56 78"
                  required
                />
              </div>

              <Button type="submit" className="w-full bg-gradient-premium">
                Continuer <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </form>
          </Card>
        )}

        {/* Step 2: Vehicle info */}
        {step === 2 && (
          <Card className="p-5">
            <form onSubmit={handleStep2} className="space-y-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Car className="w-4 h-4 text-primary" />
                </div>
                <p className="font-medium">Véhicule & activité</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="vehicle">Modèle du véhicule *</Label>
                <Input
                  id="vehicle"
                  value={vehicleModel}
                  onChange={(e) => setVehicleModel(e.target.value)}
                  placeholder="Mercedes Classe E"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">Ville d'activité *</Label>
                <Input
                  id="city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Paris"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="license">N° carte VTC (optionnel)</Label>
                <Input
                  id="license"
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  placeholder="VTC-XXXXXX"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="flex-1"
                >
                  Retour
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-gradient-premium"
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>Continuer <ArrowRight className="w-4 h-4 ml-2" /></>
                  )}
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Step 3: Stripe Connect */}
        {step === 3 && (
          <Card className="p-5 space-y-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <CreditCard className="w-4 h-4 text-primary" />
              </div>
              <p className="font-medium">Configuration paiement</p>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground space-y-2">
              <p>
                Pour recevoir les paiements de vos clients, configurez votre compte Stripe Connect.
              </p>
              <p className="text-xs">
                C'est gratuit et prend environ 5 minutes. Vous aurez besoin d'une pièce d'identité.
              </p>
            </div>

            <Button
              onClick={handleStripeOnboarding}
              className="w-full bg-gradient-premium"
              disabled={loading}
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Redirection...</>
              ) : (
                <>Configurer Stripe <ArrowRight className="w-4 h-4 ml-2" /></>
              )}
            </Button>

            <Button
              variant="ghost"
              onClick={skipStripe}
              className="w-full text-muted-foreground text-sm"
            >
              Configurer plus tard
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
};
