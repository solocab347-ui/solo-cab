import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  CreditCard, 
  Check, 
  Loader2,
  ArrowRight,
  Shield,
  Calendar,
  Percent,
  Info,
  XCircle,
  Tag,
  Gift
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo-solocab.png";

interface DriverInfo {
  id: string;
  has_nfc_plate: boolean | null;
  nfc_tag_number: string | null;
  nfc_plate_order_id: string | null;
  trial_end_date: string | null;
  first_name: string | null;
  last_name: string | null;
}

export default function TrialExpiredSubscribe() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "annual">("monthly");
  const [wantsNfcPlate, setWantsNfcPlate] = useState(false);
  const [selectedNfcType, setSelectedNfcType] = useState<"plastic" | "wood">("plastic");
  const [driver, setDriver] = useState<DriverInfo | null>(null);

  // Vérifier si le chauffeur a déjà une plaque NFC
  const hasNfcPlate = driver && (
    driver.has_nfc_plate || 
    driver.nfc_tag_number || 
    driver.nfc_plate_order_id
  );

  useEffect(() => {
    checkEligibility();
  }, []);

  const checkEligibility = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }

      // Récupérer les données du chauffeur avec info NFC
      const { data: driverData, error } = await supabase
        .from("drivers")
        .select(`
          id, 
          has_nfc_plate, 
          nfc_tag_number, 
          nfc_plate_order_id,
          trial_status,
          trial_end_date,
          subscription_status,
          subscription_paid
        `)
        .eq("user_id", user.id)
        .single();

      if (error || !driverData) {
        toast.error("Compte chauffeur non trouvé");
        navigate("/");
        return;
      }

      // Si l'utilisateur a déjà un abonnement actif, le rediriger
      if (driverData.subscription_status === "active" && driverData.subscription_paid) {
        toast.success("Vous avez déjà un abonnement actif !");
        navigate("/chauffeur");
        return;
      }

      setDriver({
        ...driverData,
        first_name: null,
        last_name: null
      });
    } catch (err) {
      console.error("Error checking eligibility:", err);
      toast.error("Erreur lors de la vérification");
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async () => {
    try {
      setProcessing(true);
      
      // Appeler la fonction pour créer le checkout
      const { data, error } = await supabase.functions.invoke("create-post-trial-checkout", {
        body: { 
          plan: selectedPlan,
          includeNfcPlate: !hasNfcPlate && wantsNfcPlate,
          nfcPlateType: selectedNfcType
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("Aucune URL de paiement reçue");
      }
    } catch (err: any) {
      console.error("Subscribe error:", err);
      toast.error(err.message || "Erreur lors de l'abonnement");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!driver) {
    return null;
  }

  const plans = [
    {
      id: "monthly" as const,
      name: "Mensuel",
      price: 29.99,
      period: "/mois",
      description: "Abonnement sans engagement",
      features: [
        "Accès complet à SoloCab",
        "Résiliation à tout moment",
        "Sans engagement de durée",
        "Support prioritaire",
      ],
    },
    {
      id: "annual" as const,
      name: "Annuel",
      price: 305.90,
      originalPrice: 359.88,
      period: "/an",
      description: "Économisez 15% sur l'année",
      badge: "-15%",
      features: [
        "Accès complet à SoloCab",
        "2 mois offerts",
        "Économisez 53,98€",
        "Support prioritaire",
      ],
    },
  ];

  // Prix NFC avec réduction -20% pour achat avec abonnement
  const nfcPrices = {
    plastic: { regular: 29.99, discounted: 23.99, name: "Plaque Plastique Premium" },
    wood: { regular: 14.99, discounted: 11.99, name: "Plaque Bois" }
  };

  const selectedNfcPrice = nfcPrices[selectedNfcType];
  const totalPrice = plans.find(p => p.id === selectedPlan)!.price + 
    (!hasNfcPlate && wantsNfcPlate ? selectedNfcPrice.discounted : 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-6 px-4">
      <div className="max-w-3xl mx-auto space-y-5">
        {/* Logo */}
        <div className="text-center">
          <img src={logo} alt="SoloCab" className="h-10 mx-auto mb-4" />
        </div>

        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl md:text-3xl font-bold">
            {driver.first_name ? `${driver.first_name}, continuez` : "Continuez"} avec SoloCab
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm md:text-base">
            Votre période d'essai est terminée. Choisissez votre abonnement pour continuer 
            à utiliser toutes les fonctionnalités de SoloCab.
          </p>
        </div>

        {/* Message de rassurance */}
        <Alert className="border-primary/20 bg-primary/5">
          <Shield className="h-4 w-4 text-primary" />
          <AlertTitle className="text-primary">Abonnement sans engagement</AlertTitle>
          <AlertDescription className="text-muted-foreground text-sm">
            Vous pouvez résilier à tout moment depuis votre espace chauffeur. 
            Aucune pénalité, aucune condition — vous restez libre.
          </AlertDescription>
        </Alert>

        {/* Plan Selection */}
        <div className="grid md:grid-cols-2 gap-4">
          {plans.map((plan) => (
            <Card 
              key={plan.id}
              className={cn(
                "cursor-pointer transition-all hover:shadow-lg relative",
                selectedPlan === plan.id 
                  ? "border-primary ring-2 ring-primary/20" 
                  : "hover:border-primary/50"
              )}
              onClick={() => setSelectedPlan(plan.id)}
            >
              {plan.badge && (
                <Badge className="absolute -top-2 -right-2 bg-primary text-primary-foreground">
                  <Percent className="h-3 w-3 mr-1" />
                  {plan.badge}
                </Badge>
              )}
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg md:text-xl">{plan.name}</CardTitle>
                  <div className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                    selectedPlan === plan.id 
                      ? "border-primary bg-primary" 
                      : "border-muted-foreground"
                  )}>
                    {selectedPlan === plan.id && (
                      <Check className="h-3 w-3 text-white" />
                    )}
                  </div>
                </div>
                <CardDescription className="text-sm">{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-baseline gap-1">
                  {plan.originalPrice && (
                    <span className="text-base text-muted-foreground line-through">
                      {plan.originalPrice.toFixed(2)}€
                    </span>
                  )}
                  <span className="text-2xl md:text-3xl font-bold">{plan.price.toFixed(2)}€</span>
                  <span className="text-muted-foreground text-sm">{plan.period}</span>
                </div>
                <Separator />
                <ul className="space-y-1.5">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-xs md:text-sm">
                      <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* NFC Plate Offer - Seulement si pas déjà de plaque */}
        {!hasNfcPlate && (
          <Card className={cn(
            "transition-all",
            wantsNfcPlate ? "border-primary/50 bg-primary/5" : ""
          )}>
            <CardHeader className="pb-3">
              <div className="flex items-start gap-3">
                <Checkbox 
                  id="nfc-plate"
                  checked={wantsNfcPlate}
                  onCheckedChange={(checked) => setWantsNfcPlate(!!checked)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <label htmlFor="nfc-plate" className="cursor-pointer">
                    <div className="flex items-center gap-2 mb-1">
                      <Tag className="h-4 w-4 text-primary" />
                      <CardTitle className="text-base">Ajouter une plaque NFC SoloCab</CardTitle>
                      <Badge variant="secondary" className="bg-primary/10 text-primary text-xs">
                        <Gift className="h-3 w-3 mr-1" />
                        -20%
                      </Badge>
                    </div>
                    <CardDescription className="text-sm">
                      Permettez à vos clients de vous contacter d'un simple tap NFC. 
                      Profitez de -20% en ajoutant une plaque à votre abonnement.
                    </CardDescription>
                  </label>
                </div>
              </div>
            </CardHeader>
            
            {wantsNfcPlate && (
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 gap-3">
                  <div 
                    className={cn(
                      "p-3 rounded-lg border cursor-pointer transition-all",
                      selectedNfcType === "plastic" 
                        ? "border-primary bg-primary/5" 
                        : "hover:border-primary/50"
                    )}
                    onClick={() => setSelectedNfcType("plastic")}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className={cn(
                        "w-4 h-4 rounded-full border-2",
                        selectedNfcType === "plastic" 
                          ? "border-primary bg-primary" 
                          : "border-muted-foreground"
                      )}>
                        {selectedNfcType === "plastic" && <Check className="h-2.5 w-2.5 text-white m-auto" />}
                      </div>
                      <span className="font-medium text-sm">Plastique Premium</span>
                    </div>
                    <div className="text-left pl-6">
                      <span className="text-muted-foreground line-through text-xs">{nfcPrices.plastic.regular.toFixed(2)}€</span>
                      <span className="font-bold ml-1">{nfcPrices.plastic.discounted.toFixed(2)}€</span>
                    </div>
                  </div>
                  
                  <div 
                    className={cn(
                      "p-3 rounded-lg border cursor-pointer transition-all",
                      selectedNfcType === "wood" 
                        ? "border-primary bg-primary/5" 
                        : "hover:border-primary/50"
                    )}
                    onClick={() => setSelectedNfcType("wood")}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className={cn(
                        "w-4 h-4 rounded-full border-2",
                        selectedNfcType === "wood" 
                          ? "border-primary bg-primary" 
                          : "border-muted-foreground"
                      )}>
                        {selectedNfcType === "wood" && <Check className="h-2.5 w-2.5 text-white m-auto" />}
                      </div>
                      <span className="font-medium text-sm">Bois</span>
                    </div>
                    <div className="text-left pl-6">
                      <span className="text-muted-foreground line-through text-xs">{nfcPrices.wood.regular.toFixed(2)}€</span>
                      <span className="font-bold ml-1">{nfcPrices.wood.discounted.toFixed(2)}€</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        )}

        {/* Récapitulatif et CTA */}
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="pt-5">
            {/* Récapitulatif */}
            <div className="mb-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Abonnement {selectedPlan === "monthly" ? "mensuel" : "annuel"}</span>
                <span className="font-medium">{plans.find(p => p.id === selectedPlan)!.price.toFixed(2)}€</span>
              </div>
              {!hasNfcPlate && wantsNfcPlate && (
                <div className="flex justify-between text-primary">
                  <span>Plaque NFC {selectedNfcType === "plastic" ? "Plastique" : "Bois"} (-20%)</span>
                  <span className="font-medium">{selectedNfcPrice.discounted.toFixed(2)}€</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-bold text-base">
                <span>Total aujourd'hui</span>
                <span>{totalPrice.toFixed(2)}€</span>
              </div>
            </div>

            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <CreditCard className="h-7 w-7 text-primary" />
                <div>
                  <p className="font-medium text-sm">Paiement sécurisé par Stripe</p>
                  <p className="text-xs text-muted-foreground">
                    Vos données bancaires sont protégées
                  </p>
                </div>
              </div>
              <Button 
                size="lg" 
                onClick={handleSubscribe}
                disabled={processing}
                className="w-full md:w-auto"
              >
                {processing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Redirection...
                  </>
                ) : (
                  <>
                    S'abonner maintenant
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Info résiliation */}
        <div className="text-center space-y-2">
          <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
            <XCircle className="h-3 w-3" />
            Résiliation possible à tout moment depuis votre tableau de bord
          </p>
          <p className="text-xs text-muted-foreground">
            En procédant au paiement, vous acceptez nos conditions générales d'utilisation. 
            {selectedPlan === "monthly" 
              ? " Vous serez prélevé chaque mois jusqu'à résiliation."
              : " Vous serez prélevé une fois par an jusqu'à résiliation."
            }
          </p>
        </div>
      </div>
    </div>
  );
}
